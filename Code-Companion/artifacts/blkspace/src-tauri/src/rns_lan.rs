//! One campus note across this machine's LAN address.
//!
//! The listener binds that address, not `127.0.0.1` and not `0.0.0.0`. The
//! other process connects to it. The address still belongs to this computer,
//! so the tier stays Offline. A second laptop is the observation that can
//! say Mesh, and this test does not invent one.

use std::env;
use std::fs;
use std::net::{Ipv4Addr, TcpListener};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::AtomicU64;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use rns_core::transport::types::{IngressControlConfig, InterfaceId};
use rns_net::interface::tcp::{TcpClientConfig, TcpClientRuntime};
use rns_net::interface::tcp_server::{TcpServerConfig, TcpServerRuntime};

const CHILD_PORT_ENV: &str = "BLKSPACE_RNS_LAN_CHILD";
const CHILD_ADDR_ENV: &str = "BLKSPACE_RNS_LAN_ADDR";
const NOTE_PATH_ENV: &str = "BLKSPACE_RNS_LAN_NOTE";

fn own_ipv4s() -> Vec<Ipv4Addr> {
    let mut found = vec![Ipv4Addr::LOCALHOST];
    let Ok(output) = Command::new("ip").args(["-4", "-o", "addr", "show"]).output() else {
        return found;
    };
    if !output.status.success() {
        return found;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        let mut parts = line.split_whitespace();
        while let Some(part) = parts.next() {
            if part == "inet" {
                if let Some(cidr) = parts.next() {
                    let ip = cidr.split('/').next().unwrap_or(cidr);
                    if let Ok(addr) = ip.parse::<Ipv4Addr>() {
                        if !found.contains(&addr) {
                            found.push(addr);
                        }
                    }
                }
            }
        }
    }
    found
}

fn free_port_on(ip: Ipv4Addr) -> u16 {
    TcpListener::bind((ip, 0))
        .unwrap_or_else(|err| panic!("bind {ip}: {err}"))
        .local_addr()
        .expect("addr")
        .port()
}

fn child_send(addr: &str, port: u16, note_path: &str) {
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
        target_host: addr.into(),
        target_port: port,
        reconnect_wait: Duration::from_millis(200),
        max_reconnect_tries: Some(1),
        connect_timeout: Duration::from_secs(2),
    };
    let (tx, rx) = rns_net::event::channel();
    let mut writer = rns_net::interface::tcp::start(
        TcpClientConfig {
            name: "blkspace-lan-child".into(),
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

/// This machine's LAN address can carry a note. It is still this machine.
#[test]
fn a_same_machine_lan_address_does_not_count_as_mesh() {
    if let Ok(port) = env::var(CHILD_PORT_ENV) {
        let port: u16 = port.parse().expect("child port");
        let addr = env::var(CHILD_ADDR_ENV).expect("lan address");
        let note_path = env::var(NOTE_PATH_ENV).expect("note path");
        child_send(&addr, port, &note_path);
        return;
    }

    use std::collections::BTreeSet;
    use std::net::IpAddr;

    use crate::delivery_tier::peer_is_another_machine;
    use crate::rns_courier::{
        accept_campus_note, open_campus_event, unpack_campus_frame, CampusNote,
    };

    let own = own_ipv4s();
    let lan = own
        .iter()
        .copied()
        .find(|ip| !ip.is_loopback() && !ip.is_unspecified())
        .expect("a non-loopback IPv4 is required to prove the same-machine gate");
    let listen_ip = lan.to_string();
    assert_ne!(listen_ip, "127.0.0.1");
    assert_ne!(listen_ip, "0.0.0.0");

    let own_ips: Vec<IpAddr> = own.iter().copied().map(IpAddr::V4).collect();
    assert!(
        !peer_is_another_machine(IpAddr::V4(lan), &own_ips),
        "{lan} is configured on this computer"
    );

    let port = free_port_on(lan);
    let note_path: PathBuf = env::temp_dir().join(format!(
        "blkspace-rns-lan-{}-{port}.json",
        std::process::id()
    ));
    let _ = fs::remove_file(&note_path);

    let (server_tx, server_rx) = rns_net::event::channel();
    let server = rns_net::interface::tcp_server::start(
        TcpServerConfig {
            name: "blkspace-lan-parent".into(),
            listen_ip: listen_ip.clone(),
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
    .unwrap_or_else(|err| panic!("listen on {listen_ip}:{port}: {err}"));

    let child = Command::new(env::current_exe().expect("test binary"))
        .args([
            "rns_lan::a_same_machine_lan_address_does_not_count_as_mesh",
            "--exact",
            "--test-threads=1",
        ])
        .env(CHILD_PORT_ENV, port.to_string())
        .env(CHILD_ADDR_ENV, &listen_ip)
        .env(NOTE_PATH_ENV, &note_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn child");
    let child_pid = child.id();
    assert_ne!(child_pid, std::process::id());
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
            assert!(!info.is_local_client);
            assert!(info.name.contains("TCPServerInterface"));
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
        mesh_peer_observed: peer_is_another_machine(IpAddr::V4(lan), &own_ips),
    });
    assert_eq!(tier, crate::delivery_tier::DeliveryTier::Offline);

    server.request_stop();
    let _ = fs::remove_file(&note_path);
}
