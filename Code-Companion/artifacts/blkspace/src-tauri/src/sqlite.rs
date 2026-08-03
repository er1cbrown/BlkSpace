//! Sync SQLite-compatible facade over embedded Turso.
//!
//! Keeps the existing BlkSpace `db.rs` API surface (rusqlite-style) while
//! running on Turso's in-process engine instead of stock SQLite/rusqlite.
//!
//! ## Tier 0 design
//! - Prefer the existing Tauri/Tokio runtime (no extra thread pool when possible).
//! - Fallback runtime is **current-thread** (1 worker) — not multi-thread.
//! - Callers apply low-RAM PRAGMAs in `Database::open` (small page cache).

use std::future::Future;
use std::path::Path;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::OnceLock;

use turso::{Builder, Value as TursoValue};

// ---------------------------------------------------------------------------
// Errors (subset of rusqlite surface used by BlkSpace)
// ---------------------------------------------------------------------------

#[derive(Debug)]
pub enum Error {
  QueryReturnedNoRows,
  InvalidParameterName(String),
  /// Constraint / unique violations and other SQL failures.
  SqliteFailure(ErrorCode, Option<String>),
  /// Generic conversion / misuse / engine errors.
  ToSqlConversionFailure(Box<dyn std::error::Error + Send + Sync>),
  /// Catch-all message-backed error.
  ExecuteFailed(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCode {
  ConstraintViolation,
  Unknown,
}

/// Matches rusqlite: one-param `Result<T>` defaults E=Error; two-param `Result<T, AppError>` works too.
pub type Result<T, E = Error> = std::result::Result<T, E>;

impl std::fmt::Display for Error {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      Error::QueryReturnedNoRows => write!(f, "Query returned no rows"),
      Error::InvalidParameterName(s) => write!(f, "{s}"),
      Error::SqliteFailure(code, msg) => match msg {
        Some(m) => write!(f, "{code:?}: {m}"),
        None => write!(f, "{code:?}"),
      },
      Error::ToSqlConversionFailure(e) => write!(f, "{e}"),
      Error::ExecuteFailed(s) => write!(f, "{s}"),
    }
  }
}

impl std::error::Error for Error {}

impl From<turso::Error> for Error {
  fn from(e: turso::Error) -> Self {
    match e {
      turso::Error::QueryReturnedNoRows => Error::QueryReturnedNoRows,
      turso::Error::Constraint(msg) => {
        Error::SqliteFailure(ErrorCode::ConstraintViolation, Some(msg))
      }
      other => {
        let s = other.to_string();
        let lower = s.to_ascii_lowercase();
        if lower.contains("unique") || lower.contains("constraint") {
          Error::SqliteFailure(ErrorCode::ConstraintViolation, Some(s))
        } else {
          Error::ExecuteFailed(s)
        }
      }
    }
  }
}

/// Shim for `rusqlite::ffi::ErrorCode` matching used in AppError mapping.
pub mod ffi {
  pub use super::ErrorCode;
}

// ---------------------------------------------------------------------------
// OptionalExtension
// ---------------------------------------------------------------------------

pub trait OptionalExtension<T> {
  fn optional(self) -> Result<Option<T>>;
}

impl<T> OptionalExtension<T> for Result<T> {
  fn optional(self) -> Result<Option<T>> {
    match self {
      Ok(v) => Ok(Some(v)),
      Err(Error::QueryReturnedNoRows) => Ok(None),
      Err(e) => Err(e),
    }
  }
}

// ---------------------------------------------------------------------------
// Runtime / block_on (Tier 0: reuse Tauri runtime; never spawn a  multi-thread pool)
// ---------------------------------------------------------------------------

fn block_on<T>(fut: impl Future<Output = T>) -> T {
  if let Ok(handle) = tokio::runtime::Handle::try_current() {
    // Multi-thread (Tauri default): block_in_place so we do not starve the pool.
    // Current-thread (tests): block_on directly.
    match handle.runtime_flavor() {
      tokio::runtime::RuntimeFlavor::CurrentThread => handle.block_on(fut),
      _ => tokio::task::block_in_place(|| handle.block_on(fut)),
    }
  } else {
    // Tests / early boot without a runtime — one lightweight current-thread RT.
    static RT: OnceLock<tokio::runtime::Runtime> = OnceLock::new();
    let rt = RT.get_or_init(|| {
      tokio::runtime::Builder::new_current_thread()
        .enable_io()
        .enable_time()
        .thread_name("blkspace-turso")
        .build()
        .expect("turso tokio runtime")
    });
    rt.block_on(fut)
  }
}

// ---------------------------------------------------------------------------
// Params / ToSql
// ---------------------------------------------------------------------------

pub trait ToSql: Send + Sync {
  fn to_sql_value(&self) -> TursoValue;
}

impl ToSql for String {
  fn to_sql_value(&self) -> TursoValue {
    TursoValue::Text(self.clone())
  }
}
impl ToSql for &str {
  fn to_sql_value(&self) -> TursoValue {
    TursoValue::Text((*self).to_string())
  }
}
impl ToSql for i64 {
  fn to_sql_value(&self) -> TursoValue {
    TursoValue::Integer(*self)
  }
}
impl ToSql for i32 {
  fn to_sql_value(&self) -> TursoValue {
    TursoValue::Integer(i64::from(*self))
  }
}
impl ToSql for u32 {
  fn to_sql_value(&self) -> TursoValue {
    TursoValue::Integer(i64::from(*self))
  }
}
impl ToSql for f64 {
  fn to_sql_value(&self) -> TursoValue {
    TursoValue::Real(*self)
  }
}
impl ToSql for f32 {
  fn to_sql_value(&self) -> TursoValue {
    TursoValue::Real(f64::from(*self))
  }
}
impl ToSql for bool {
  fn to_sql_value(&self) -> TursoValue {
    TursoValue::Integer(if *self { 1 } else { 0 })
  }
}
impl ToSql for Vec<u8> {
  fn to_sql_value(&self) -> TursoValue {
    TursoValue::Blob(self.clone())
  }
}
impl<T: ToSql + ?Sized> ToSql for &T {
  fn to_sql_value(&self) -> TursoValue {
    (*self).to_sql_value()
  }
}
impl<T: ToSql> ToSql for Option<T> {
  fn to_sql_value(&self) -> TursoValue {
    match self {
      Some(v) => v.to_sql_value(),
      None => TursoValue::Null,
    }
  }
}

pub mod types {
  pub use super::ToSql;
}

/// Parameter bag accepted by execute / query helpers.
pub enum Params {
  Empty,
  Values(Vec<TursoValue>),
}

impl Params {
  fn into_values(self) -> Vec<TursoValue> {
    match self {
      Params::Empty => Vec::new(),
      Params::Values(v) => v,
    }
  }
}

impl From<()> for Params {
  fn from(_: ()) -> Self {
    Params::Empty
  }
}

impl From<Vec<TursoValue>> for Params {
  fn from(v: Vec<TursoValue>) -> Self {
    Params::Values(v)
  }
}

impl From<Vec<Box<dyn ToSql>>> for Params {
  fn from(v: Vec<Box<dyn ToSql>>) -> Self {
    Params::Values(v.iter().map(|p| p.to_sql_value()).collect())
  }
}

/// Accept `&[&dyn ToSql]` / slices used for dynamic IN-lists.
impl Params {
  pub fn from_refs(refs: &[&dyn ToSql]) -> Self {
    Params::Values(refs.iter().map(|p| p.to_sql_value()).collect())
  }
}

macro_rules! impl_params_tuple {
  ($($n:ident),+) => {
    impl<$($n: ToSql),+> From<($($n,)+)> for Params {
      #[allow(non_snake_case)]
      fn from(($($n,)+): ($($n,)+)) -> Self {
        Params::Values(vec![$($n.to_sql_value()),+])
      }
    }
  };
}

impl_params_tuple!(A);
impl_params_tuple!(A, B);
impl_params_tuple!(A, B, C);
impl_params_tuple!(A, B, C, D);
impl_params_tuple!(A, B, C, D, E);
impl_params_tuple!(A, B, C, D, E, F);
impl_params_tuple!(A, B, C, D, E, F, G);
impl_params_tuple!(A, B, C, D, E, F, G, H);
impl_params_tuple!(A, B, C, D, E, F, G, H, I);
impl_params_tuple!(A, B, C, D, E, F, G, H, I, J);
impl_params_tuple!(A, B, C, D, E, F, G, H, I, J, K);
impl_params_tuple!(A, B, C, D, E, F, G, H, I, J, K, L);
impl_params_tuple!(A, B, C, D, E, F, G, H, I, J, K, L, M);
impl_params_tuple!(A, B, C, D, E, F, G, H, I, J, K, L, M, N);
impl_params_tuple!(A, B, C, D, E, F, G, H, I, J, K, L, M, N, O);
impl_params_tuple!(A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P);

/// Convert common homogeneous arrays (including empty `[T; 0]`).
impl<T: ToSql, const N: usize> From<[T; N]> for Params {
  fn from(arr: [T; N]) -> Self {
    if N == 0 {
      Params::Empty
    } else {
      Params::Values(arr.iter().map(|v| v.to_sql_value()).collect())
    }
  }
}

/// Dynamic param slices (`&[&dyn ToSql]`).
impl From<&[&dyn ToSql]> for Params {
  fn from(refs: &[&dyn ToSql]) -> Self {
    Params::from_refs(refs)
  }
}

/// `params![a, b, c]` — mirrors rusqlite macro usage in this crate.
#[macro_export]
macro_rules! params {
  () => {
    $crate::sqlite::Params::Empty
  };
  ($($param:expr),+ $(,)?) => {
    $crate::sqlite::Params::Values(vec![
      $($crate::sqlite::ToSql::to_sql_value(&$param)),+
    ])
  };
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

#[derive(Debug)]
pub struct Row {
  values: Vec<TursoValue>,
}

impl Row {
  fn from_turso(row: turso::Row) -> Result<Self> {
    let n = row.column_count();
    let mut values = Vec::with_capacity(n);
    for i in 0..n {
      values.push(row.get_value(i)?);
    }
    Ok(Self { values })
  }

  /// rusqlite-compatible: `row.get(0)` or `row.get::<_, String>(0)`.
  pub fn get<I, T>(&self, idx: I) -> Result<T>
  where
    I: RowIndex,
    T: FromSql,
  {
    let i = idx.idx();
    let val = self
      .values
      .get(i)
      .ok_or_else(|| Error::ExecuteFailed(format!("column index {i} out of bounds")))?;
    T::column_result(val)
  }
}

pub trait RowIndex {
  fn idx(self) -> usize;
}
impl RowIndex for usize {
  fn idx(self) -> usize {
    self
  }
}
impl RowIndex for i32 {
  fn idx(self) -> usize {
    self as usize
  }
}

pub trait FromSql: Sized {
  fn column_result(value: &TursoValue) -> Result<Self>;
}

impl FromSql for i64 {
  fn column_result(value: &TursoValue) -> Result<Self> {
    match value {
      TursoValue::Integer(i) => Ok(*i),
      TursoValue::Real(f) => Ok(*f as i64),
      TursoValue::Text(s) => s
        .parse()
        .map_err(|e| Error::ToSqlConversionFailure(Box::new(e))),
      TursoValue::Null => Ok(0),
      other => Err(Error::ExecuteFailed(format!(
        "cannot convert {other:?} to i64"
      ))),
    }
  }
}

impl FromSql for i32 {
  fn column_result(value: &TursoValue) -> Result<Self> {
    i64::column_result(value).map(|v| v as i32)
  }
}

impl FromSql for f64 {
  fn column_result(value: &TursoValue) -> Result<Self> {
    match value {
      TursoValue::Real(f) => Ok(*f),
      TursoValue::Integer(i) => Ok(*i as f64),
      TursoValue::Text(s) => s
        .parse()
        .map_err(|e| Error::ToSqlConversionFailure(Box::new(e))),
      TursoValue::Null => Ok(0.0),
      other => Err(Error::ExecuteFailed(format!(
        "cannot convert {other:?} to f64"
      ))),
    }
  }
}

impl FromSql for String {
  fn column_result(value: &TursoValue) -> Result<Self> {
    match value {
      TursoValue::Text(s) => Ok(s.clone()),
      TursoValue::Integer(i) => Ok(i.to_string()),
      TursoValue::Real(f) => Ok(f.to_string()),
      TursoValue::Blob(b) => Ok(String::from_utf8_lossy(b).into_owned()),
      TursoValue::Null => Ok(String::new()),
    }
  }
}

impl FromSql for bool {
  fn column_result(value: &TursoValue) -> Result<Self> {
    Ok(i64::column_result(value)? != 0)
  }
}

impl FromSql for Vec<u8> {
  fn column_result(value: &TursoValue) -> Result<Self> {
    match value {
      TursoValue::Blob(b) => Ok(b.clone()),
      TursoValue::Text(s) => Ok(s.as_bytes().to_vec()),
      TursoValue::Null => Ok(Vec::new()),
      other => Err(Error::ExecuteFailed(format!(
        "cannot convert {other:?} to blob"
      ))),
    }
  }
}

impl FromSql for Option<String> {
  fn column_result(value: &TursoValue) -> Result<Self> {
    match value {
      TursoValue::Null => Ok(None),
      _ => String::column_result(value).map(Some),
    }
  }
}

impl FromSql for Option<i64> {
  fn column_result(value: &TursoValue) -> Result<Self> {
    match value {
      TursoValue::Null => Ok(None),
      _ => i64::column_result(value).map(Some),
    }
  }
}

// ---------------------------------------------------------------------------
// Statement / Rows
// ---------------------------------------------------------------------------

pub struct Statement {
  conn: turso::Connection,
  sql: String,
}

impl Statement {
  pub fn query<P: Into<Params>>(&mut self, params: P) -> Result<Rows> {
    let params = params.into();
    let rows = block_on(async {
      let mut rows = match params {
        Params::Empty => self.conn.query(&self.sql, ()).await?,
        Params::Values(values) => self.conn.query(&self.sql, values).await?,
      };
      let mut out = Vec::new();
      while let Some(row) = rows.next().await? {
        out.push(Row::from_turso(row)?);
      }
      Ok::<_, Error>(out)
    })?;
    Ok(Rows {
      inner: rows.into_iter(),
    })
  }

  pub fn query_map<P, F, T>(
    &mut self,
    params: P,
    mut f: F,
  ) -> Result<MappedRows<T>>
  where
    P: Into<Params>,
    F: FnMut(&Row) -> Result<T>,
  {
    let rows = self.query(params)?;
    let mut mapped = Vec::new();
    for row in rows.inner {
      mapped.push(f(&row));
    }
    Ok(MappedRows {
      inner: mapped.into_iter(),
    })
  }

  pub fn execute<P: Into<Params>>(&mut self, params: P) -> Result<usize> {
    let params = params.into();
    let n = block_on(async {
      match params {
        Params::Empty => self.conn.execute(&self.sql, ()).await,
        Params::Values(values) => self.conn.execute(&self.sql, values).await,
      }
      .map_err(Error::from)
    })?;
    Ok(n as usize)
  }
}

pub struct Rows {
  inner: std::vec::IntoIter<Row>,
}

impl Rows {
  /// rusqlite-compatible: `while let Some(row) = rows.next()? { ... }`
  #[allow(clippy::should_implement_trait)]
  pub fn next(&mut self) -> Result<Option<Row>> {
    Ok(self.inner.next())
  }
}

/// Mapped rows iterator compatible with `for row in stmt.query_map(...)?`.
pub struct MappedRows<T> {
  inner: std::vec::IntoIter<Result<T>>,
}

impl<T> Iterator for MappedRows<T> {
  type Item = Result<T>;
  fn next(&mut self) -> Option<Self::Item> {
    self.inner.next()
  }
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

pub struct Connection {
  inner: turso::Connection,
  last_insert_rowid: AtomicI64,
}

impl Connection {
  pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
    let path_str = path.as_ref().to_string_lossy().into_owned();
    let conn = block_on(async {
      let db = Builder::new_local(&path_str).build().await?;
      db.connect().map_err(Error::from)
    })?;
    Ok(Self {
      inner: conn,
      last_insert_rowid: AtomicI64::new(0),
    })
  }

  pub fn execute_batch(&self, sql: &str) -> Result<()> {
    block_on(async {
      self.inner.execute_batch(sql).await.map_err(Error::from)
    })
  }

  pub fn execute<P: Into<Params>>(&self, sql: &str, params: P) -> Result<usize> {
    let params = params.into();
    let need_rowid = sql
      .trim_start()
      .get(..6)
      .map(|s| s.eq_ignore_ascii_case("INSERT"))
      .unwrap_or(false);
    // One async enter for execute (+ optional rowid) — fewer runtime hops on Tier 0.
    let (n, rowid) = block_on(async {
      let n = match params {
        Params::Empty => self.inner.execute(sql, ()).await,
        Params::Values(values) => self.inner.execute(sql, values).await,
      }
      .map_err(Error::from)?;
      let rowid = if need_rowid {
        let mut rows = self.inner.query("SELECT last_insert_rowid()", ()).await?;
        match rows.next().await? {
          Some(r) => Some(r.get::<i64>(0)?),
          None => None,
        }
      } else {
        None
      };
      Ok::<_, Error>((n, rowid))
    })?;
    if let Some(id) = rowid {
      self.last_insert_rowid.store(id, Ordering::SeqCst);
    }
    Ok(n as usize)
  }

  pub fn prepare(&self, sql: &str) -> Result<Statement> {
    Ok(Statement {
      conn: self.inner.clone(),
      sql: sql.to_string(),
    })
  }

  pub fn query_row<P, F, T>(&self, sql: &str, params: P, f: F) -> Result<T>
  where
    P: Into<Params>,
    F: FnOnce(&Row) -> Result<T>,
  {
    let params = params.into();
    let row = block_on(async {
      let mut rows = match params {
        Params::Empty => self.inner.query(sql, ()).await?,
        Params::Values(values) => self.inner.query(sql, values).await?,
      };
      match rows.next().await? {
        Some(r) => Row::from_turso(r),
        None => Err(Error::QueryReturnedNoRows),
      }
    })?;
    f(&row)
  }

  pub fn last_insert_rowid(&self) -> i64 {
    self.last_insert_rowid.load(Ordering::SeqCst)
  }

  /// rusqlite-compatible deferred transaction (BEGIN … COMMIT/ROLLBACK).
  pub fn unchecked_transaction(&self) -> Result<Transaction<'_>> {
    self.execute("BEGIN", ())?;
    Ok(Transaction {
      conn: self,
      committed: false,
    })
  }
}

/// Active SQL transaction; rolls back on drop if not committed.
pub struct Transaction<'conn> {
  conn: &'conn Connection,
  committed: bool,
}

impl Transaction<'_> {
  pub fn execute<P: Into<Params>>(&self, sql: &str, params: P) -> Result<usize> {
    self.conn.execute(sql, params)
  }

  pub fn query_row<P, F, T>(&self, sql: &str, params: P, f: F) -> Result<T>
  where
    P: Into<Params>,
    F: FnOnce(&Row) -> Result<T>,
  {
    self.conn.query_row(sql, params, f)
  }

  pub fn prepare(&self, sql: &str) -> Result<Statement> {
    self.conn.prepare(sql)
  }

  pub fn last_insert_rowid(&self) -> i64 {
    self.conn.last_insert_rowid()
  }

  pub fn commit(mut self) -> Result<()> {
    self.conn.execute("COMMIT", ())?;
    self.committed = true;
    Ok(())
  }
}

impl Drop for Transaction<'_> {
  fn drop(&mut self) {
    if !self.committed {
      let _ = self.conn.execute("ROLLBACK", ());
    }
  }
}
