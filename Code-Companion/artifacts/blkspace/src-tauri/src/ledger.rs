//! Double-entry ledger for WeixBucks.
//!
//! ## Why this exists
//!
//! WeixBucks used to live in a single mutable integer (`users.weix_bucks`) with
//! `wallet_tx` as a write-only audit log. Nothing read the log to compute a balance, so
//! there was no invariant to check: a crash between the balance update and the log insert
//! silently desynced them, and no query could detect it. The weekly withdrawal cap and the
//! cooldown were matched by `LIKE 'Withdrawn to Solana%'` on a free-text description, so any
//! wording drift escaped the limit entirely.
//!
//! ## Model
//!
//! Every balance change is a **journal entry** with two or more **postings**. Postings are
//! signed amounts on named accounts, and the sum across an entry is **always zero**:
//!
//! - `earn`      credits a user, debiting `system:faucet` (the platform mints WB from nothing)
//! - `spend`     debits a user, crediting `system:treasury` (fees are burned here)
//! - `transfer`  debits the sender and credits the receiver, net zero
//! - `fee`       debits a payer and credits `system:treasury` for a published platform fee
//!
//! Because the sum is zero, `system:treasury` accumulates exactly the total fees ever
//! charged, and total supply is `treasury + sum(user balances)` with no reconciliation
//! step needed.
//!
//! ## Invariants
//!
//! [`Ledger::reconcile`] returns the difference between the journal and the cached
//! balances. It must be zero. [`Ledger::rebuild_balances`] repairs drift from the journal,
//! which is possible precisely because the journal is the source of truth.
//!
//! ## Idempotency
//!
//! Every entry carries an `idempotency_key`. A replayed operation with a key already present
//! returns the original entry instead of posting again, so a retried request cannot
//! double-spend.

use crate::params;
use crate::sqlite::{Connection, OptionalExtension, Params, Result as SqlResult, Row, Transaction};

/// Accounts that are not users. Held in the same table so the invariant is total.
pub const SYSTEM_FAUCET: &str = "system:faucet";
pub const SYSTEM_TREASURY: &str = "system:treasury";

/// A single signed movement against one account within a journal entry.
#[derive(Debug, Clone, PartialEq)]
pub struct Posting {
    pub account: String,
    pub amount: i64,
}

/// A balanced set of postings. Sum is always zero.
#[derive(Debug, Clone, PartialEq)]
pub struct JournalEntry {
    pub id: i64,
    pub kind: String,
    pub memo: String,
    pub idempotency_key: String,
    pub postings: Vec<Posting>,
    pub created_at: String,
}

impl JournalEntry {
    pub fn net(&self) -> i64 {
        self.postings.iter().map(|p| p.amount).sum()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum LedgerError {
    /// Postings do not sum to zero. The caller built an unbalanced entry.
    Unbalanced { delta: i64 },
    /// A posting referenced an empty or malformed account name.
    BadAccount(String),
    /// The payer does not have enough balance for this debit.
    InsufficientFunds { account: String, needed: i64, available: i64 },
}

impl std::fmt::Display for LedgerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LedgerError::Unbalanced { delta } => {
                write!(f, "ledger entry is unbalanced by {} WB", delta)
            }
            LedgerError::BadAccount(a) => write!(f, "invalid ledger account {:?}", a),
            LedgerError::InsufficientFunds { account, needed, available } => write!(
                f,
                "insufficient funds: {} needs {} WB, has {}",
                account, needed, available
            ),
        }
    }
}

impl From<LedgerError> for crate::sqlite::Error {
    fn from(e: LedgerError) -> Self {
        crate::sqlite::Error::InvalidParameterName(e.to_string())
    }
}

/// Anything that can run a query and an execute. Both `Connection` and `Transaction`
/// satisfy this, so the same helpers serve both the standalone and transactional paths.
pub trait Queryable {
    fn q_row<T, F: FnOnce(&Row) -> SqlResult<T>>(
        &self,
        sql: &str,
        p: impl Into<Params>,
        f: F,
    ) -> SqlResult<T>;
    fn q_map<T, F: FnMut(&Row) -> SqlResult<T>>(
        &self,
        sql: &str,
        p: impl Into<Params>,
        f: F,
    ) -> SqlResult<Vec<T>>;
    fn q_exec(&self, sql: &str, p: impl Into<Params>) -> SqlResult<usize>;
}

impl<T: Queryable + ?Sized> Queryable for &T {
    fn q_row<R, F: FnOnce(&Row) -> SqlResult<R>>(&self, sql: &str, p: impl Into<Params>, f: F) -> SqlResult<R> {
        (**self).q_row(sql, p, f)
    }
    fn q_map<R, F: FnMut(&Row) -> SqlResult<R>>(&self, sql: &str, p: impl Into<Params>, f: F) -> SqlResult<Vec<R>> {
        (**self).q_map(sql, p, f)
    }
    fn q_exec(&self, sql: &str, p: impl Into<Params>) -> SqlResult<usize> {
        (**self).q_exec(sql, p)
    }
}

impl Queryable for Connection {
    fn q_row<T, F: FnOnce(&Row) -> SqlResult<T>>(
        &self,
        sql: &str,
        p: impl Into<Params>,
        f: F,
    ) -> SqlResult<T> {
        self.query_row(sql, p, f)
    }
    fn q_map<T, F: FnMut(&Row) -> SqlResult<T>>(&self, sql: &str, p: impl Into<Params>, f: F) -> SqlResult<Vec<T>> {
        let mut stmt = self.prepare(sql)?;
        let rows = stmt.query_map(p, f)?;
        rows.collect()
    }
    fn q_exec(&self, sql: &str, p: impl Into<Params>) -> SqlResult<usize> {
        self.execute(sql, p)
    }
}

impl Queryable for Transaction<'_> {
    fn q_row<T, F: FnOnce(&Row) -> SqlResult<T>>(
        &self,
        sql: &str,
        p: impl Into<Params>,
        f: F,
    ) -> SqlResult<T> {
        self.query_row(sql, p, f)
    }
    fn q_map<T, F: FnMut(&Row) -> SqlResult<T>>(&self, sql: &str, p: impl Into<Params>, f: F) -> SqlResult<Vec<T>> {
        let mut stmt = self.prepare(sql)?;
        let rows = stmt.query_map(p, f)?;
        rows.collect()
    }
    fn q_exec(&self, sql: &str, p: impl Into<Params>) -> SqlResult<usize> {
        self.execute(sql, p)
    }
}

/// Read and write helpers over a ledger-enabled database.
///
/// Deliberately free of lock handling: callers pass a connection or transaction they
/// already hold, so ledger operations compose with whatever transaction the surrounding
/// feature uses.
pub struct Ledger;

impl Ledger {
    /// Create the ledger schema. Safe to call repeatedly.
    pub fn ensure_schema(conn: &Connection) -> SqlResult<()> {
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS ledger_accounts (
              account TEXT PRIMARY KEY,
              balance INTEGER NOT NULL DEFAULT 0,
              created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS ledger_journal (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              kind TEXT NOT NULL,
              memo TEXT NOT NULL DEFAULT '',
              idempotency_key TEXT NOT NULL DEFAULT '',
              created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS ledger_postings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              journal_id INTEGER NOT NULL REFERENCES ledger_journal(id),
              account TEXT NOT NULL,
              amount INTEGER NOT NULL,
              created_at TEXT DEFAULT (datetime('now'))
            );

            -- Idempotency is only meaningful for non-empty keys.
            CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_journal_idem
              ON ledger_journal(idempotency_key)
              WHERE idempotency_key != '';

            CREATE INDEX IF NOT EXISTS idx_ledger_postings_journal
              ON ledger_postings(journal_id);
            CREATE INDEX IF NOT EXISTS idx_ledger_postings_account
              ON ledger_postings(account);
            CREATE INDEX IF NOT EXISTS idx_ledger_journal_kind
              ON ledger_journal(kind, created_at);
            ",
        )
    }

    /// Cached balance for one account.
    pub fn balance(conn: &impl Queryable, account: &str) -> SqlResult<i64> {
        let bal: Option<i64> = conn
            .q_row(
                "SELECT balance FROM ledger_accounts WHERE account = ?1",
                params![account],
                |r| r.get(0),
            )
            .optional()?;
        Ok(bal.unwrap_or(0))
    }

    /// Look up an existing entry by idempotency key.
    pub fn find_by_key(
        conn: &impl Queryable,
        key: &str,
    ) -> SqlResult<Option<JournalEntry>> {
        if key.is_empty() {
            return Ok(None);
        }
        let row: Option<(i64, String, String, String, String)> = conn
            .q_row(
                "SELECT id, kind, memo, idempotency_key, created_at
                 FROM ledger_journal WHERE idempotency_key = ?1",
                params![key],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
            )
            .optional()?;
        let Some((id, kind, memo, key, created_at)) = row else {
            return Ok(None);
        };
        Ok(Some(JournalEntry {
            id,
            kind,
            memo,
            idempotency_key: key,
            postings: Self::postings_for(conn, id)?,
            created_at,
        }))
    }

    fn postings_for(conn: &impl Queryable, journal_id: i64) -> SqlResult<Vec<Posting>> {
        conn.q_map(
            "SELECT account, amount FROM ledger_postings WHERE journal_id = ?1 ORDER BY id",
            params![journal_id],
            |r| {
                Ok(Posting {
                    account: r.get(0)?,
                    amount: r.get(1)?,
                })
            },
        )
    }

    /// Post a balanced entry.
    ///
    /// Returns the entry id. If `idempotency_key` matches an existing entry, that entry is
    /// returned and nothing is written, making retries safe.
    pub fn post(
        conn: &Connection,
        kind: &str,
        memo: &str,
        idempotency_key: &str,
        postings: &[Posting],
    ) -> SqlResult<i64> {
        Self::validate(postings)?;

        if !idempotency_key.is_empty() {
            if let Some(existing) = Self::find_by_key(conn, idempotency_key)? {
                return Ok(existing.id);
            }
        }

        // Reject a debit a USER account cannot cover. System accounts are excluded on
        // purpose: `system:faucet` is a source debited every time WB is minted, so it is
        // negative by design and must not trip the overdraft guard. The cached balance is
        // authoritative inside a transaction; reconcile() verifies it against the journal.
        for p in postings.iter().filter(|p| p.amount < 0 && is_user_account(&p.account)) {
            let available = Self::balance(conn, &p.account)?;
            if available + p.amount < 0 {
                return Err(LedgerError::InsufficientFunds {
                    account: p.account.clone(),
                    needed: -p.amount,
                    available,
                }
                .into());
            }
        }

        let tx = conn.unchecked_transaction()?;

        tx.execute(
            "INSERT INTO ledger_journal (kind, memo, idempotency_key) VALUES (?1, ?2, ?3)",
            params![kind, memo, idempotency_key],
        )?;
        let journal_id = tx.last_insert_rowid();

        {
            let mut stmt = tx.prepare(
                "INSERT INTO ledger_postings (journal_id, account, amount) VALUES (?1, ?2, ?3)",
            )?;
            for p in postings {
                stmt.execute(params![journal_id, p.account, p.amount])?;
            }
        }

        for p in postings {
            tx.execute(
                "INSERT INTO ledger_accounts (account, balance) VALUES (?1, ?2)
                 ON CONFLICT(account) DO UPDATE SET balance = balance + ?2",
                params![p.account, p.amount],
            )?;
        }

        tx.commit()?;
        Ok(journal_id)
    }

    /// Post inside an existing transaction, so a ledger write and its surrounding feature
    /// state commit or roll back together.
    pub fn post_tx(
        tx: &Transaction,
        kind: &str,
        memo: &str,
        idempotency_key: &str,
        postings: &[Posting],
    ) -> SqlResult<i64> {
        Self::validate(postings)?;

        if !idempotency_key.is_empty() {
            if let Some(existing) = Self::find_by_key(tx, idempotency_key)? {
                return Ok(existing.id);
            }
        }

        for p in postings.iter().filter(|p| p.amount < 0 && is_user_account(&p.account)) {
            let available = Self::balance(tx, &p.account)?;
            if available + p.amount < 0 {
                return Err(LedgerError::InsufficientFunds {
                    account: p.account.clone(),
                    needed: -p.amount,
                    available,
                }
                .into());
            }
        }

        tx.execute(
            "INSERT INTO ledger_journal (kind, memo, idempotency_key) VALUES (?1, ?2, ?3)",
            params![kind, memo, idempotency_key],
        )?;
        let journal_id = tx.last_insert_rowid();

        {
            let mut stmt = tx.prepare(
                "INSERT INTO ledger_postings (journal_id, account, amount) VALUES (?1, ?2, ?3)",
            )?;
            for p in postings {
                stmt.execute(params![journal_id, p.account, p.amount])?;
            }
        }

        for p in postings {
            tx.execute(
                "INSERT INTO ledger_accounts (account, balance) VALUES (?1, ?2)
                 ON CONFLICT(account) DO UPDATE SET balance = balance + ?2",
                params![p.account, p.amount],
            )?;
        }

        Ok(journal_id)
    }

    fn validate(postings: &[Posting]) -> SqlResult<()> {
        if postings.len() < 2 {
            return Err(LedgerError::Unbalanced {
                delta: postings.iter().map(|p| p.amount).sum(),
            }
            .into());
        }
        for p in postings {
            if p.account.trim().is_empty() {
                return Err(LedgerError::BadAccount(p.account.clone()).into());
            }
        }
        let delta: i64 = postings.iter().map(|p| p.amount).sum();
        if delta != 0 {
            return Err(LedgerError::Unbalanced { delta }.into());
        }
        Ok(())
    }

    /// Total of all postings, grouped by account. The journal's own view of truth.
    pub fn journal_balances(conn: &Connection) -> SqlResult<Vec<(String, i64)>> {
        conn.q_map(
            "SELECT account, COALESCE(SUM(amount), 0) FROM ledger_postings GROUP BY account",
            Params::Empty,
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
    }

    /// Sum of every posting. Must always be zero for a consistent ledger.
    pub fn journal_sum(conn: &impl Queryable) -> SqlResult<i64> {
        let total: Option<i64> = conn.q_row(
            "SELECT SUM(amount) FROM ledger_postings",
            Params::Empty,
            |r| r.get(0),
        )?;
        Ok(total.unwrap_or(0))
    }

    /// Difference between cached balances and the journal, per account.
    ///
    /// Returns a vec of `(account, cached, journal, difference)`. Empty means consistent.
    pub fn reconcile(conn: &Connection) -> SqlResult<Vec<(String, i64, i64, i64)>> {
        let journal: std::collections::HashMap<String, i64> =
            Self::journal_balances(conn)?.into_iter().collect();

        let cached: Vec<(String, i64)> = conn.q_map(
            "SELECT account, balance FROM ledger_accounts ORDER BY account",
            Params::Empty,
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;

        let mut out = Vec::new();
        let cached_set: std::collections::HashSet<&String> =
            cached.iter().map(|(a, _)| a).collect();
        for (account, cached_bal) in &cached {
            let j = journal.get(account).copied().unwrap_or(0);
            if *cached_bal != j {
                out.push((account.clone(), *cached_bal, j, cached_bal - j));
            }
        }
        // Accounts present in the journal but missing from the cache.
        for (account, j) in &journal {
            if !cached_set.contains(account) {
                out.push((account.clone(), 0, *j, -j));
            }
        }
        Ok(out)
    }

    /// Repair cached balances from the journal. Only possible because the journal is
    /// authoritative.
    pub fn rebuild_balances(conn: &Connection) -> SqlResult<usize> {
        let drift = Self::reconcile(conn)?;
        let repaired = drift.len();
        let tx = conn.unchecked_transaction()?;
        for (account, _, journal_bal, _) in &drift {
            tx.execute(
                "INSERT INTO ledger_accounts (account, balance) VALUES (?1, ?2)
                 ON CONFLICT(account) DO UPDATE SET balance = ?2",
                params![account, journal_bal],
            )?;
        }
        tx.commit()?;
        Ok(repaired)
    }

    /// Seed one opening entry per existing user so historical balances are represented.
    ///
    /// Balances are moved from the legacy `users.weix_bucks` column into the ledger, then
    /// mirrored back so the rest of the app keeps reading the same values.
    pub fn backfill_from_legacy(conn: &Connection) -> SqlResult<usize> {
        let rows: Vec<(String, i64)> = conn.q_map(
            "SELECT handle, COALESCE(weix_bucks, 0) FROM users ORDER BY handle",
            Params::Empty,
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;

        let existing: i64 = conn.q_row(
            "SELECT COUNT(*) FROM ledger_journal",
            Params::Empty,
            |r| r.get(0),
        )?;
        if existing > 0 {
            return Ok(0);
        }

        let tx = conn.unchecked_transaction()?;
        let mut seeded = 0usize;
        for (handle, balance) in &rows {
            if *balance == 0 {
                continue;
            }
            tx.execute(
                "INSERT INTO ledger_journal (kind, memo, idempotency_key)
                 VALUES ('opening', 'opening balance carried over from pre-ledger balance', ?1)",
                params![format!("opening:user:{handle}")],
            )?;
            let journal_id = tx.last_insert_rowid();
            tx.execute(
                "INSERT INTO ledger_postings (journal_id, account, amount) VALUES (?1, ?2, ?3)",
                params![journal_id, account_of(handle), *balance],
            )?;
            tx.execute(
                "INSERT INTO ledger_postings (journal_id, account, amount) VALUES (?1, ?2, ?3)",
                params![journal_id, SYSTEM_FAUCET, -*balance],
            )?;
            tx.execute(
                "INSERT INTO ledger_accounts (account, balance) VALUES (?1, ?2)
                 ON CONFLICT(account) DO UPDATE SET balance = balance + ?2",
                params![account_of(handle), *balance],
            )?;
            tx.execute(
                "INSERT INTO ledger_accounts (account, balance) VALUES (?1, ?2)
                 ON CONFLICT(account) DO UPDATE SET balance = balance + ?2",
                params![SYSTEM_FAUCET, -*balance],
            )?;
            seeded += 1;
        }
        tx.commit()?;
        Ok(seeded)
    }

    /// Mint credits into a user's account. Balanced against the faucet.
    pub fn earn(
        conn: &Connection,
        handle: &str,
        amount: i64,
        memo: &str,
        idempotency_key: &str,
    ) -> SqlResult<i64> {
        Self::post(
            conn,
            "earn",
            memo,
            idempotency_key,
            &[
                Posting { account: account_of(handle), amount },
                Posting { account: SYSTEM_FAUCET.to_string(), amount: -amount },
            ],
        )
    }

    /// Burn credits out of a user's account into the treasury. Balanced.
    pub fn spend(
        conn: &Connection,
        handle: &str,
        amount: i64,
        memo: &str,
        idempotency_key: &str,
    ) -> SqlResult<i64> {
        Self::post(
            conn,
            "spend",
            memo,
            idempotency_key,
            &[
                Posting { account: account_of(handle), amount: -amount },
                Posting { account: SYSTEM_TREASURY.to_string(), amount },
            ],
        )
    }

    /// Move credits between two accounts, plus a fee to the treasury. Net zero.
    pub fn transfer_with_fee(
        conn: &Connection,
        from: &str,
        to: &str,
        amount: i64,
        fee: i64,
        memo: &str,
        idempotency_key: &str,
    ) -> SqlResult<i64> {
        let net = amount - fee;
        let mut postings = vec![
            Posting { account: account_of(from), amount: -amount },
            Posting { account: account_of(to), amount: net },
        ];
        if fee != 0 {
            postings.push(Posting {
                account: SYSTEM_TREASURY.to_string(),
                amount: fee,
            });
        }
        Self::post(conn, "transfer", memo, idempotency_key, &postings)
    }


    /// Transactional variants of [`Ledger::earn`], [`Ledger::spend`], and
    /// [`Ledger::transfer_with_fee`], so a ledger entry and the surrounding feature state
    /// commit together.
    pub fn earn_tx(
        tx: &Transaction,
        handle: &str,
        amount: i64,
        memo: &str,
        idempotency_key: &str,
    ) -> SqlResult<i64> {
        Self::post_tx(
            tx,
            "earn",
            memo,
            idempotency_key,
            &[
                Posting { account: account_of(handle), amount },
                Posting { account: SYSTEM_FAUCET.to_string(), amount: -amount },
            ],
        )
    }

    pub fn spend_tx(
        tx: &Transaction,
        handle: &str,
        amount: i64,
        memo: &str,
        idempotency_key: &str,
    ) -> SqlResult<i64> {
        Self::post_tx(
            tx,
            "spend",
            memo,
            idempotency_key,
            &[
                Posting { account: account_of(handle), amount: -amount },
                Posting { account: SYSTEM_TREASURY.to_string(), amount },
            ],
        )
    }

    pub fn transfer_with_fee_tx(
        tx: &Transaction,
        from: &str,
        to: &str,
        amount: i64,
        fee: i64,
        memo: &str,
        idempotency_key: &str,
    ) -> SqlResult<i64> {
        let net = amount - fee;
        let mut postings = vec![
            Posting { account: account_of(from), amount: -amount },
            Posting { account: account_of(to), amount: net },
        ];
        if fee != 0 {
            postings.push(Posting {
                account: SYSTEM_TREASURY.to_string(),
                amount: fee,
            });
        }
        Self::post_tx(tx, "transfer", memo, idempotency_key, &postings)
    }

    /// Record a settlement debit against a user. Kind `settlement` is what the cap and
    /// cooldown gates query, replacing the old free-text description match.
    pub fn settlement_tx(
        tx: &Transaction,
        handle: &str,
        amount: i64,
        memo: &str,
        idempotency_key: &str,
    ) -> SqlResult<i64> {
        Self::post_tx(
            tx,
            "settlement",
            memo,
            idempotency_key,
            &[
                Posting { account: account_of(handle), amount: -amount },
                Posting { account: SYSTEM_TREASURY.to_string(), amount },
            ],
        )
    }

    /// Structured withdrawal totals for the cap and cooldown gates.
    ///
    /// Replaces the old `description LIKE 'Withdrawn to Solana%'` scan, which escaped the
    /// limit if the wording ever changed.
    pub fn withdrawn_since(
        conn: &impl Queryable,
        handle: &str,
        since_iso: &str,
    ) -> SqlResult<i64> {
        let total: i64 = conn.q_row(
            "SELECT COALESCE(-SUM(amount), 0) FROM ledger_postings
             WHERE account = ?1
               AND amount < 0
               AND id IN (
                 SELECT journal_id FROM ledger_journal
                 WHERE kind = 'settlement' AND created_at >= ?2
               )",
            params![account_of(handle), since_iso],
            |r| r.get(0),
        )?;
        Ok(total)
    }

    /// Timestamp of the most recent settlement entry, for the cooldown gate.
    pub fn last_settlement_at(
        conn: &impl Queryable,
        handle: &str,
    ) -> SqlResult<Option<String>> {
        conn.q_row(
            "SELECT MAX(j.created_at) FROM ledger_journal j
             JOIN ledger_postings p ON p.journal_id = j.id
             WHERE j.kind = 'settlement' AND p.account = ?1 AND p.amount < 0",
            params![account_of(handle)],
            |r| r.get(0),
        )
        .optional()
        .map(|o| o.flatten())
    }
}

/// Ledger account name for a user handle.
pub fn account_of(handle: &str) -> String {
    format!("user:{handle}")
}

/// True if this looks like a user account rather than a system account.
pub fn is_user_account(account: &str) -> bool {
    account.starts_with("user:")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mem() -> Connection {
        let dir = std::env::temp_dir().join(format!(
            "bkspc_ledger_{}-{}",
            std::process::id(),
            uuid::Uuid::new_v4()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        let c = Connection::open(dir.join("l.db")).unwrap();
        Ledger::ensure_schema(&c).unwrap();
        c
    }

    #[test]
    fn earn_is_balanced_and_credits_the_user() {
        let c = mem();
        Ledger::earn(&c, "alice", 100, "post", "k1").unwrap();
        assert_eq!(Ledger::balance(&c, "user:alice").unwrap(), 100);
        assert_eq!(Ledger::balance(&c, SYSTEM_FAUCET).unwrap(), -100);
        assert_eq!(Ledger::journal_sum(&c).unwrap(), 0);
        assert!(Ledger::reconcile(&c).unwrap().is_empty());
    }

    #[test]
    fn idempotency_key_prevents_double_posting() {
        let c = mem();
        Ledger::earn(&c, "alice", 100, "post", "same-key").unwrap();
        Ledger::earn(&c, "alice", 100, "post", "same-key").unwrap();
        assert_eq!(
            Ledger::balance(&c, "user:alice").unwrap(),
            100,
            "replaying an idempotency key must not credit twice"
        );
    }

    #[test]
    fn unbalanced_entry_is_rejected() {
        let c = mem();
        let err = Ledger::post(
            &c,
            "earn",
            "bad",
            "",
            &[
                Posting { account: "user:alice".into(), amount: 100 },
                Posting { account: SYSTEM_FAUCET.into(), amount: -99 },
            ],
        );
        assert!(err.is_err(), "postings summing to 1 must be rejected");
        assert_eq!(Ledger::balance(&c, "user:alice").unwrap(), 0);
    }

    #[test]
    fn single_posting_is_rejected() {
        let c = mem();
        let err = Ledger::post(
            &c,
            "earn",
            "bad",
            "",
            &[Posting { account: "user:alice".into(), amount: 0 }],
        );
        assert!(err.is_err());
    }

    #[test]
    fn cannot_overspend() {
        let c = mem();
        Ledger::earn(&c, "alice", 50, "post", "").unwrap();
        let err = Ledger::spend(&c, "alice", 80, "buy", "");
        assert!(err.is_err(), "must not debit more than the balance");
        assert_eq!(Ledger::balance(&c, "user:alice").unwrap(), 50);
    }

    #[test]
    fn transfer_with_fee_splits_correctly() {
        let c = mem();
        Ledger::earn(&c, "alice", 1000, "genesis", "").unwrap();
        // 100 tipped, 2% fee = 2 to treasury, 98 to bob.
        Ledger::transfer_with_fee(&c, "alice", "bob", 100, 2, "tip", "").unwrap();
        assert_eq!(Ledger::balance(&c, "user:alice").unwrap(), 900);
        assert_eq!(Ledger::balance(&c, "user:bob").unwrap(), 98);
        assert_eq!(Ledger::balance(&c, SYSTEM_TREASURY).unwrap(), 2);
        assert_eq!(Ledger::journal_sum(&c).unwrap(), 0);
    }

    #[test]
    fn treasury_accumulates_exactly_the_fees_charged() {
        let c = mem();
        Ledger::earn(&c, "alice", 1000, "g", "").unwrap();
        for i in 0..5 {
            Ledger::transfer_with_fee(&c, "alice", "bob", 100, 5, "tip", &format!("t{i}")).unwrap();
        }
        assert_eq!(Ledger::balance(&c, SYSTEM_TREASURY).unwrap(), 25);
    }

    #[test]
    fn reconcile_detects_and_rebuild_repairs_drift() {
        let c = mem();
        Ledger::earn(&c, "alice", 100, "post", "").unwrap();
        assert!(Ledger::reconcile(&c).unwrap().is_empty());

        // Simulate corruption of the cache.
        c.execute(
            "UPDATE ledger_accounts SET balance = 999 WHERE account = 'user:alice'",
            crate::params!(),
        )
        .unwrap();

        let drift = Ledger::reconcile(&c).unwrap();
        assert_eq!(drift.len(), 1);
        assert_eq!(drift[0].3, 899, "difference should be cached minus journal");

        let repaired = Ledger::rebuild_balances(&c).unwrap();
        assert_eq!(repaired, 1);
        assert_eq!(Ledger::balance(&c, "user:alice").unwrap(), 100);
        assert!(Ledger::reconcile(&c).unwrap().is_empty());
    }

    #[test]
    fn journal_always_sums_to_zero_across_many_entries() {
        let c = mem();
        Ledger::earn(&c, "alice", 500, "a", "").unwrap();
        Ledger::earn(&c, "bob", 300, "b", "").unwrap();
        Ledger::transfer_with_fee(&c, "alice", "bob", 200, 10, "tip", "").unwrap();
        Ledger::spend(&c, "bob", 120, "buy", "").unwrap();
        Ledger::earn(&c, "carol", 77, "c", "").unwrap();
        assert_eq!(Ledger::journal_sum(&c).unwrap(), 0);
        assert!(Ledger::reconcile(&c).unwrap().is_empty());
    }

    #[test]
    fn total_supply_is_treasury_plus_user_balances() {
        let c = mem();
        Ledger::earn(&c, "alice", 1000, "g", "").unwrap();
        Ledger::earn(&c, "bob", 500, "g", "").unwrap();
        Ledger::transfer_with_fee(&c, "alice", "bob", 300, 6, "tip", "").unwrap();
        Ledger::spend(&c, "bob", 200, "buy", "").unwrap();

        let supply: i64 = Ledger::journal_balances(&c)
            .unwrap()
            .iter()
            .filter(|(a, _)| is_user_account(a))
            .map(|(_, v)| *v)
            .sum();
        let treasury = Ledger::balance(&c, SYSTEM_TREASURY).unwrap();
        assert_eq!(supply + treasury, 1500, "no credits created or destroyed");
    }

    #[test]
    fn find_by_key_returns_original_entry() {
        let c = mem();
        let id = Ledger::earn(&c, "alice", 42, "post", "abc").unwrap();
        let found = Ledger::find_by_key(&c, "abc").unwrap().unwrap();
        assert_eq!(found.id, id);
        assert_eq!(found.net(), 0);
        assert_eq!(found.postings.len(), 2);
        assert!(Ledger::find_by_key(&c, "").unwrap().is_none());
        assert!(Ledger::find_by_key(&c, "nope").unwrap().is_none());
    }

    #[test]
    fn account_of_and_is_user_account() {
        assert_eq!(account_of("zoe"), "user:zoe");
        assert!(is_user_account("user:zoe"));
        assert!(!is_user_account(SYSTEM_TREASURY));
    }
}
