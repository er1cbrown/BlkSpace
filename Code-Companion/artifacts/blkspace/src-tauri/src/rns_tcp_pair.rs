//! Two processes, one TCP hop, one signed campus note.
//!
//! The first test: the parent listens on `127.0.0.1`. The child is a second OS
//! process that connects and sends the same group packet step 2 already proved
//! inside one process.
//!
//! The second test drains one due spool note the other way. The parent owns
//! the spool and connects. The child only listens and opens the frame. The
//! spool stays `queued`.
//!
//! TCP only: no AutoInterface, no RNode, no LXMF, no Python `rnsd`.
//! Neither test sets `courier_available`. That flag waits for an announce the
//! transport engine has accepted. The tier stays Offline.

use std::env;
use std::fs;
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::AtomicU64;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use rns_core::transport::types::{IngressControlConfig, InterfaceId};
use rns_net::interface::tcp::{TcpClientConfig, TcpClientRuntime};
use rns_net::interface::tcp_server::{TcpServerConfig, TcpServerRuntime};

const CHILD_PORT_ENV: &str = "BLKSPACE_RNS_TCP_CHILD";
const NOTE_PATH_ENV: &str = "BLKSPACE_RNS_TCP_NOTE";
const DRAIN_PORT_ENV: &str = "BLKSPACE_RNS_DRAIN_CHILD";
const DRAIN_NOTE_ENV: &str = "BLKSPACE_RNS_DRAIN_NOTE";
const DRAIN_READY_ENV: &str = "BLKSPACE_RNS_DRAIN_READY";

fn free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .expect("bind")
        .local_addr()
        .expect("addr")
        .port()
}

fn child_send(port: u16, note_path: &str) {
    use nostr_sdk::prelude::{EventBuilder, Keys};
    use rns_crypto::FixedRng;

    use crate::rns_courier::{pack_campus_frame, seal_campus_event};

    let keys = Keys::generate();
    let event = EventBuilder::text_note("yard note")
        .sign_with_keys(&keys)
        .expect("sign");
    let note = serde_json::to_string(&event).expect("json");
    fs::write(note_path, &note).expect("write note");

    let runtime = TcpClientRuntime {
        target_host: "127.0.0.1".into(),
        target_port: port,
        reconnect_wait: Duration::from_millis(200),
        max_reconnect_tries: Some(1),
        connect_timeout: Duration::from_secs(2),
    };
    let (tx, rx) = rns_net::event::channel();
    let mut writer = rns_net::interface::tcp::start(
        TcpClientConfig {
            name: "blkspace-tcp-child".into(),
            target_host: runtime.target_host.clone(),
            target_port: port,
            interface_id: InterfaceId(8),
            reconnect_wait: runtime.reconnect_wait,
            max_reconnect_tries: Some(1),
            connect_timeout: Duration::from_secs(2),
            device: None,
            runtime: Arc::new(Mutex::new(runtime)),
        },
        tx,
    )
    .expect("tcp client");

    match rx.recv_timeout(Duration::from_secs(2)).expect("client up") {
        rns_net::event::Event::InterfaceUp(id, _, _) => {
            assert_eq!(id, InterfaceId(8));
        }
        other => panic!("expected the tcp client to come up, got {other:?}"),
    }

    let frame = pack_campus_frame(&seal_campus_event(
        note.as_bytes(),
        &mut FixedRng::new(&[0x5A; 64]),
    ))
    .expect("frame");
    writer.send_frame(&frame).expect("send frame");
    thread::sleep(Duration::from_millis(300));
}

/// A second process delivers one signed note over TCP on this machine.
#[test]
fn a_signed_note_crosses_two_tcp_processes() {
    if let Ok(port) = env::var(CHILD_PORT_ENV) {
        let port: u16 = port.parse().expect("child port");
        let note_path = env::var(NOTE_PATH_ENV).expect("note path");
        child_send(port, &note_path);
        return;
    }

    use std::collections::BTreeSet;

    use crate::rns_courier::{
        accept_campus_note, open_campus_event, unpack_campus_frame, CampusNote,
    };

    let port = free_port();
    let note_path: PathBuf = env::temp_dir().join(format!(
        "blkspace-rns-tcp-{}-{port}.json",
        std::process::id()
    ));
    let _ = fs::remove_file(&note_path);

    let (server_tx, server_rx) = rns_net::event::channel();
    let server = rns_net::interface::tcp_server::start(
        TcpServerConfig {
            name: "blkspace-tcp-parent".into(),
            listen_ip: "127.0.0.1".into(),
            listen_port: port,
            interface_id: InterfaceId(7),
            max_connections: Some(1),
            ingress_control: IngressControlConfig::disabled(),
            runtime: Arc::new(Mutex::new(TcpServerRuntime {
                max_connections: Some(1),
            })),
        },
        server_tx,
        Arc::new(AtomicU64::new(1)),
    )
    .expect("tcp server");

    let child = Command::new(env::current_exe().expect("test binary"))
        .args([
            "rns_tcp_pair::a_signed_note_crosses_two_tcp_processes",
            "--exact",
            "--test-threads=1",
        ])
        .env(CHILD_PORT_ENV, port.to_string())
        .env(NOTE_PATH_ENV, &note_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn child");
    let child_pid = child.id();
    assert_ne!(
        child_pid,
        std::process::id(),
        "the peer must be a different process"
    );
    let output = child.wait_with_output().expect("wait for child");
    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        output.status.success(),
        "child exited {:?}\nstdout:\n{stdout}\nstderr:\n{stderr}",
        output.status.code()
    );

    match server_rx
        .recv_timeout(Duration::from_secs(2))
        .expect("client joined")
    {
        rns_net::event::Event::InterfaceUp(_, Some(_writer), Some(info)) => {
            assert!(!info.is_local_client, "this hop is TCP, not the local interface");
            assert!(
                info.name.contains("TCPServerInterface"),
                "unexpected interface {}",
                info.name
            );
        }
        other => panic!("expected the tcp client to join, got {other:?}"),
    }

    let received = match server_rx
        .recv_timeout(Duration::from_secs(2))
        .expect("server frame")
    {
        rns_net::event::Event::Frame { data, .. } => data,
        other => panic!("expected a frame on the server, got {other:?}"),
    };

    let opened = open_campus_event(&unpack_campus_frame(&received).expect("campus frame"))
        .expect("open");
    let json = String::from_utf8(opened).expect("utf8");
    let stored = fs::read_to_string(&note_path).expect("child note");
    assert_eq!(json, stored);

    let mut seen = BTreeSet::new();
    assert!(matches!(
        accept_campus_note(&mut seen, &json),
        CampusNote::Kept { .. }
    ));
    assert!(matches!(
        accept_campus_note(&mut seen, &json),
        CampusNote::Duplicate { .. }
    ));

    assert!(!crate::rns_t3::probe().courier_available);
    let tier = crate::delivery_tier::classify(crate::delivery_tier::TierInputs {
        relays_connected: 0,
        lan_available: false,
        mesh_transport_available: true,
        mesh_peer_observed: false,
    });
    assert_eq!(tier, crate::delivery_tier::DeliveryTier::Offline);

    server.request_stop();
    let _ = fs::remove_file(&note_path);
}

fn child_accept(port: u16, note_path: &str, ready_path: &str) {
    use crate::rns_courier::{open_campus_event, unpack_campus_frame};

    let (tx, rx) = rns_net::event::channel();
    let server = rns_net::interface::tcp_server::start(
        TcpServerConfig {
            name: "blkspace-tcp-drain-peer".into(),
            listen_ip: "127.0.0.1".into(),
            listen_port: port,
            interface_id: InterfaceId(7),
            max_connections: Some(1),
            ingress_control: IngressControlConfig::disabled(),
            runtime: Arc::new(Mutex::new(TcpServerRuntime {
                max_connections: Some(1),
            })),
        },
        tx,
        Arc::new(AtomicU64::new(1)),
    )
    .expect("tcp server");
    fs::write(ready_path, "ready").expect("ready file");

    let opened = (|| -> Result<Vec<u8>, String> {
        match rx.recv_timeout(Duration::from_secs(8)).map_err(|err| err.to_string())? {
            rns_net::event::Event::InterfaceUp(_, Some(_writer), Some(info)) => {
                if info.is_local_client {
                    return Err("this hop is TCP, not the local interface".into());
                }
                if !info.name.contains("TCPServerInterface") {
                    return Err(format!("unexpected interface {}", info.name));
                }
            }
            other => return Err(format!("expected the tcp client to join, got {other:?}")),
        }
        let received = match rx
            .recv_timeout(Duration::from_secs(8))
            .map_err(|err| err.to_string())?
        {
            rns_net::event::Event::Frame { data, .. } => data,
            other => return Err(format!("expected a frame on the server, got {other:?}")),
        };
        let token = unpack_campus_frame(&received)?;
        open_campus_event(&token).map_err(|err| err.to_string())
    })();

    server.request_stop();
    let opened = opened.expect("open the drained note");
    fs::write(note_path, opened).expect("write opened note");
}

fn wait_until_listening(ready_path: &Path, child: &mut Child) -> Result<(), String> {
    let deadline = Instant::now() + Duration::from_secs(8);
    loop {
        if ready_path.is_file() {
            return Ok(());
        }
        if let Some(status) = child.try_wait().map_err(|err| err.to_string())? {
            return Err(format!("child exited {status} before it was listening"));
        }
        if Instant::now() >= deadline {
            return Err("child never started listening".into());
        }
        thread::sleep(Duration::from_millis(20));
    }
}

fn send_due_note(port: u16, event_json: &str) -> Result<(), String> {
    use rns_crypto::FixedRng;

    use crate::rns_courier::{pack_campus_frame, seal_campus_event};

    let frame = pack_campus_frame(&seal_campus_event(
        event_json.as_bytes(),
        &mut FixedRng::new(&[0x5A; 64]),
    ))?;
    if frame.len() > rns_core::constants::MTU {
        return Err(format!(
            "frame is {} bytes, over the reticulum MTU",
            frame.len()
        ));
    }

    let runtime = TcpClientRuntime {
        target_host: "127.0.0.1".into(),
        target_port: port,
        reconnect_wait: Duration::from_millis(200),
        max_reconnect_tries: Some(1),
        connect_timeout: Duration::from_secs(2),
    };
    let (tx, rx) = rns_net::event::channel();
    let mut writer = rns_net::interface::tcp::start(
        TcpClientConfig {
            name: "blkspace-tcp-drain".into(),
            target_host: runtime.target_host.clone(),
            target_port: port,
            interface_id: InterfaceId(8),
            reconnect_wait: runtime.reconnect_wait,
            max_reconnect_tries: Some(1),
            connect_timeout: Duration::from_secs(2),
            device: None,
            runtime: Arc::new(Mutex::new(runtime)),
        },
        tx,
    )
    .map_err(|err| err.to_string())?;

    match rx.recv_timeout(Duration::from_secs(2)).map_err(|err| err.to_string())? {
        rns_net::event::Event::InterfaceUp(id, _, _) => {
            if id != InterfaceId(8) {
                return Err(format!("unexpected tcp client id {id:?}"));
            }
        }
        other => return Err(format!("tcp client did not come up: {other:?}")),
    }
    writer.send_frame(&frame).map_err(|err| err.to_string())?;
    thread::sleep(Duration::from_millis(300));
    Ok(())
}

/// One due spool note crosses TCP once. The row stays queued.
#[test]
fn a_due_note_drains_over_tcp_once() {
    if let Ok(port) = env::var(DRAIN_PORT_ENV) {
        let port: u16 = port.parse().expect("drain port");
        let note_path = env::var(DRAIN_NOTE_ENV).expect("drain note path");
        let ready_path = env::var(DRAIN_READY_ENV).expect("drain ready path");
        child_accept(port, &note_path, &ready_path);
        return;
    }

    use std::collections::BTreeSet;

    use nostr_sdk::prelude::Keys;

    use crate::rns_courier::{accept_campus_note, CampusNote};
    use crate::reticulum_bridge::{
        drain_due_notes, reticulum_send_yard_note, spool_path, DRAIN_BACKOFF_SECS,
    };

    let dir = tempfile::tempdir().expect("temp app");
    let app = dir.path();
    reticulum_send_yard_note(app, "tsu", "demo_user", "yard note").expect("spool");

    let port = free_port();
    let note_path = dir.path().join("opened.json");
    let ready_path = dir.path().join("ready");
    let now = 1_700_000_000i64;
    let keys = Keys::generate();
    let secret = keys.secret_key().to_secret_hex();

    let mut child = Command::new(env::current_exe().expect("test binary"))
        .args([
            "rns_tcp_pair::a_due_note_drains_over_tcp_once",
            "--exact",
            "--test-threads=1",
        ])
        .env(DRAIN_PORT_ENV, port.to_string())
        .env(DRAIN_NOTE_ENV, &note_path)
        .env(DRAIN_READY_ENV, &ready_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn child");
    let child_pid = child.id();
    assert_ne!(child_pid, std::process::id(), "the peer must be a different process");

    let ready = wait_until_listening(&ready_path, &mut child);
    let report = if ready.is_ok() {
        Some(drain_due_notes(app, now, &keys, &mut |event_json| {
            send_due_note(port, event_json)
        }))
    } else {
        None
    };
    let output = child.wait_with_output().expect("wait for child");
    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        ready.is_ok(),
        "{ready:?}\nstdout:\n{stdout}\nstderr:\n{stderr}"
    );
    assert!(
        output.status.success(),
        "child exited {:?}\nstdout:\n{stdout}\nstderr:\n{stderr}",
        output.status.code()
    );

    let report = report.expect("drain ran").expect("drain");
    let spool = fs::read_to_string(spool_path(app)).expect("spool");
    assert_eq!(
        report.handed_off, 1,
        "drain report {report:?}\nspool {spool}"
    );
    assert_eq!(report.failed, 0);

    let stored = fs::read_to_string(&note_path).expect("opened note");
    let line: serde_json::Value = serde_json::from_str(spool.lines().next().expect("spool line"))
        .expect("spool json");
    assert_eq!(line["state"], "queued");
    assert_eq!(line["attempts"], 1);
    assert_eq!(line["event_json"], stored);
    assert_eq!(line["last_error"], "");
    assert_eq!(line["next_attempt_at"], now + DRAIN_BACKOFF_SECS);
    let event: serde_json::Value = serde_json::from_str(&stored).expect("event json");
    assert_eq!(event["content"], "yard note");

    let lower = spool.to_ascii_lowercase();
    for banned in ["delivered", "destination", "desthash"] {
        assert!(!lower.contains(banned), "spool contains {banned}");
    }
    assert!(!lower.contains(&secret.to_ascii_lowercase()));

    let mut seen = BTreeSet::new();
    assert!(matches!(
        accept_campus_note(&mut seen, &stored),
        CampusNote::Kept { .. }
    ));
    assert!(matches!(
        accept_campus_note(&mut seen, &stored),
        CampusNote::Duplicate { .. }
    ));

    assert!(!crate::rns_t3::probe().courier_available);
    let tier = crate::delivery_tier::classify(crate::delivery_tier::TierInputs {
        relays_connected: 0,
        lan_available: false,
        mesh_transport_available: true,
        mesh_peer_observed: false,
    });
    assert_eq!(tier, crate::delivery_tier::DeliveryTier::Offline);
}
