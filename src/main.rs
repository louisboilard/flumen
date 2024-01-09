//! Flumen
//! Receives raw/binary RGBA data via tcp and broadcasts
//! to browser clients using websockets.

use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    http::Response,
    response::{Html, IntoResponse},
    routing::get,
    Router, Server,
};
use tokio::{io::AsyncReadExt, net::TcpListener, sync::broadcast};

type RGBA = Vec<u8>;

#[derive(Clone)]
struct AppState {
    tx: broadcast::Sender<RGBA>,
}

#[tokio::main]
async fn main() {
    let (tx, _) = broadcast::channel::<RGBA>(1);

    tracing_subscriber::fmt::init();

    let app_state = AppState { tx: tx.clone() };

    let router = Router::new()
        .route("/ws", get(ws_handler))
        .route("/ping", get(|| async { "pong" }))
        .route("/", get(get_root))
        .route("/index.js", get(get_js))
        .route("/style.css", get(get_css))
        .with_state(app_state.clone());

    let server = Server::bind(&"127.0.0.1:7005".parse().unwrap()).serve(router.into_make_service());
    let addr = server.local_addr();
    println!("Listening on {addr}");

    // Receive rgba data from a single tcp client and update sender accordingly
    tokio::spawn(async move {
        let tcp_listener = TcpListener::bind(&"127.0.0.1:7006").await.unwrap();
        let tcp_addr = tcp_listener.local_addr().unwrap();
        println!("tcp listener listening on {tcp_addr}");

        loop {
            let (mut socket, client_addr) = tcp_listener
                .accept()
                .await
                .expect("could not accept tcp conn");

            println!("new tcp client conn: {client_addr}");

            let mut buf = vec![0; 160_000];
            loop {
                let n = socket
                    .read(&mut buf)
                    .await
                    .expect("failed to read data from socket");

                if n == 0 {
                    // TODO: fix this nonsense.
                    let _ = tx.send(buf.clone());
                    println!("sent {n} bytes");
                    println!("sent {} bytes", buf.len());
                    println!("returning");
                    return;
                }
            }
        }
    });

    server.await.unwrap();
}

/// Initial http request handler, registers fn before "upgrading" http to ws.
#[axum::debug_handler]
async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    println!("new browser client.");
    ws.on_upgrade(|ws: WebSocket| async { broadcast(state, ws).await })
}

/// Actual ws state machine (one per conn).
async fn broadcast(app_state: AppState, mut ws: WebSocket) {
    // ws.send(Message::Text("hello hello hello".to_string()))
    //     .await
    //     .expect("ws::could not send hello");

    // register a receiver
    let mut rx = app_state.tx.subscribe();

    while let Ok(rgba) = rx.recv().await {
        println!("~sending data~");
        ws.send(Message::Binary(rgba))
            .await
            .expect("ws::could not send");
    }
}

// The following handlers are for testing purposes,
// in reality the browser clients would be external.
#[axum::debug_handler]
async fn get_root() -> impl IntoResponse {
    let html = tokio::fs::read_to_string("./src/client/index.html")
        .await
        .expect("can't find html");

    Html(html)
}

#[axum::debug_handler]
async fn get_js() -> impl IntoResponse {
    let js = tokio::fs::read_to_string("./src/client/index.js")
        .await
        .expect("can't find js");

    Response::builder()
        .header("content-type", "application/javascript;charset=utf-8")
        .body(js)
        .unwrap()
}

#[axum::debug_handler]
async fn get_css() -> impl IntoResponse {
    let css = tokio::fs::read_to_string("./src/client/css/style.css")
        .await
        .expect("can't find css");

    Response::builder()
        .header("content-type", "text/css;charset=utf-8")
        .body(css)
        .unwrap()
}
