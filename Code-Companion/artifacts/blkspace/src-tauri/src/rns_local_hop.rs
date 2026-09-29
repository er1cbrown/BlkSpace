//! One local Reticulum hop on this machine.
//!
//! Same shape as `rns-net`'s `client_send_receive`: a shared local server,
//! a second client, and one frame each way. This does not set
//! `courier_available`. That flag still waits for an announce the engine
//! has accepted.

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
