//! One local Reticulum hop on this machine.
//!
//! Same shape as `rns-net`'s `client_send_receive`: a shared local server,
//! a second client, and one frame each way. A later test carries one signed
//! campus note on that hop. Neither test sets `courier_available`. That flag
//! still waits for an announce the engine has accepted.

use std::net::TcpListener;
use std::sync::atomic::AtomicU64;
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use rns_net::interface::local::{LocalClientConfig, LocalServerConfig};

fn free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}

// rns-net 0.7.2 listens with a nonblocking socket. On macOS the accepted
// connection stays nonblocking, the first read returns WouldBlock, and the
// reader treats that as a disconnect. Linux accept() stays blocking, which
// is why upstream's own client_send_receive passes there.
#[test]
#[ignore = "rns-net 0.7.2 drops the local TCP client on macOS before a frame"]
fn two_local_peers_exchange_a_frame() {
    let port = free_port();
    let (server_tx, server_rx) = rns_net::event::channel();
    let server = rns_net::interface::local::start_server(
        LocalServerConfig {
            instance_name: "blkspace-hop".into(),
            port,
            interface_id: rns_core::transport::types::InterfaceId(7),
        },
        server_tx,
        Arc::new(AtomicU64::new(1)),
    )
    .expect("local server");
    thread::sleep(Duration::from_millis(50));

    let (client_tx, client_rx) = rns_net::event::channel();
    let mut client = rns_net::interface::local::start_client(
        LocalClientConfig {
            name: "blkspace-client".into(),
            instance_name: "blkspace-hop".into(),
            port,
            interface_id: rns_core::transport::types::InterfaceId(8),
            reconnect_wait: Duration::from_secs(1),
        },
        client_tx,
    )
    .expect("local client");

    let mut server_side = match server_rx.recv_timeout(Duration::from_secs(2)).expect("client joined")
    {
        rns_net::event::Event::InterfaceUp(_, Some(writer), Some(info)) => {
            assert!(info.is_local_client);
            writer
        }
        other => panic!("expected the client to join, got {other:?}"),
    };
    match client_rx.recv_timeout(Duration::from_secs(2)).expect("client up") {
        rns_net::event::Event::InterfaceUp(id, _, _) => {
            assert_eq!(id, rns_core::transport::types::InterfaceId(8));
        }
        other => panic!("expected the client interface to come up, got {other:?}"),
    }

    let out: Vec<u8> = (0..32).collect();
    client.send_frame(&out).expect("client send");
    match server_rx.recv_timeout(Duration::from_secs(2)).expect("server frame") {
        rns_net::event::Event::Frame { data, .. } => assert_eq!(data, out),
        other => panic!("expected a frame on the server, got {other:?}"),
    }

    let back: Vec<u8> = (100..132).collect();
    server_side.send_frame(&back).expect("server send");
    match client_rx.recv_timeout(Duration::from_secs(2)).expect("client frame") {
        rns_net::event::Event::Frame { data, .. } => assert_eq!(data, back),
        other => panic!("expected a frame on the client, got {other:?}"),
    }
    drop(server);
}

/// A signed yard note crosses the local hop, and a replay of the same event
/// id is not kept again. The mesh tier stays offline.
#[test]
#[ignore = "rns-net 0.7.2 drops the local TCP client on macOS before a frame"]
fn a_signed_note_crosses_the_local_hop_once() {
    use std::collections::BTreeSet;

    use crate::rns_courier::{
        accept_campus_note, open_campus_event, pack_campus_frame, seal_campus_event,
        unpack_campus_frame, CampusNote,
    };
    use nostr_sdk::prelude::{EventBuilder, Keys};
    use rns_crypto::FixedRng;

    let keys = Keys::generate();
    let event = EventBuilder::text_note("yard note")
        .sign_with_keys(&keys)
        .expect("sign");
    let note = serde_json::to_string(&event).expect("json");
    let frame = pack_campus_frame(&seal_campus_event(
        note.as_bytes(),
        &mut FixedRng::new(&[0x5A; 64]),
    ))
    .expect("frame");

    let port = free_port();
    let (server_tx, server_rx) = rns_net::event::channel();
    let server = rns_net::interface::local::start_server(
        LocalServerConfig {
            instance_name: "blkspace-note".into(),
            port,
            interface_id: rns_core::transport::types::InterfaceId(7),
        },
        server_tx,
        Arc::new(AtomicU64::new(1)),
    )
    .expect("local server");
    thread::sleep(Duration::from_millis(50));

    let (client_tx, client_rx) = rns_net::event::channel();
    let mut client = rns_net::interface::local::start_client(
        LocalClientConfig {
            name: "blkspace-client".into(),
            instance_name: "blkspace-note".into(),
            port,
            interface_id: rns_core::transport::types::InterfaceId(8),
            reconnect_wait: Duration::from_secs(1),
        },
        client_tx,
    )
    .expect("local client");

    match server_rx
        .recv_timeout(Duration::from_secs(2))
        .expect("client joined")
    {
        rns_net::event::Event::InterfaceUp(_, Some(_writer), Some(info)) => {
            assert!(info.is_local_client);
        }
        other => panic!("expected the client to join, got {other:?}"),
    }
    match client_rx
        .recv_timeout(Duration::from_secs(2))
        .expect("client up")
    {
        rns_net::event::Event::InterfaceUp(id, _, _) => {
            assert_eq!(id, rns_core::transport::types::InterfaceId(8));
        }
        other => panic!("expected the client interface to come up, got {other:?}"),
    }

    client.send_frame(&frame).expect("client send");
    let received = match server_rx
        .recv_timeout(Duration::from_secs(2))
        .expect("server frame")
    {
        rns_net::event::Event::Frame { data, .. } => data,
        other => panic!("expected a frame on the server, got {other:?}"),
    };
    assert_eq!(received, frame);

    let opened = open_campus_event(&unpack_campus_frame(&received).unwrap()).unwrap();
    let json = String::from_utf8(opened).unwrap();
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
    drop(server);
}
