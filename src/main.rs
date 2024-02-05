//! Flumen
//! Receives the binary representation of a frame/image via tcp and broadcasts
//! it to the connected browser clients using websockets.
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

use futures_util::{sink::SinkExt, stream::StreamExt};
use tokio::{
    io::AsyncReadExt,
    net::{TcpListener, TcpStream},
    sync::broadcast,
};
use uuid::Uuid;

/// The binary representation of a frame/image in any given format
type Image = Vec<u8>;

/// The directives/data passed between producers/consumers
#[derive(Clone)]
enum Missive {
    /// ChatText -> Received from a websocket and broadcasted back
    ChatText(String),
    /// Close -> When wanting to close a specific websocket conn
    Close(Uuid),
    /// Frame -> Received from a client and broadcasted.
    Frame(Image),
}

/// Type shared between ws conns
#[derive(Clone)]
struct AppState {
    tx: broadcast::Sender<Missive>,
}

#[tokio::main]
async fn main() {
    let (tx, _) = broadcast::channel::<Missive>(1);

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

    tokio::spawn(async move {
        println!("listening on {}", server.local_addr());
        server.await.unwrap();
    });

    let tcp_listener = TcpListener::bind(&"127.0.0.1:7006").await.unwrap();
    println!(
        "tcp listener listening on {}",
        tcp_listener.local_addr().unwrap()
    );

    loop {
        let (mut socket, client_addr) = tcp_listener
            .accept()
            .await
            .expect("could not accept tcp conn");

        let tx = tx.clone();

        tokio::spawn(async move {
            println!("new tcp client conn: {client_addr}");
            process(&mut socket, tx).await;
        });
    }
}

// Initial request handler, registers fn before "upgrading" http to ws.
#[axum::debug_handler]
async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(|ws: WebSocket| async { broadcast(state, ws).await })
}

/// Per conn ws state machine where server<->browser interactions are handled.
async fn broadcast(app_state: AppState, ws: WebSocket) {
    let (mut sender, mut receiver) = ws.split();
    let mut rx = app_state.tx.subscribe();
    let conn_id = Uuid::new_v4();

    println!(
        "New browser client {}. Currently broadcasting to {} clients",
        conn_id,
        app_state.tx.receiver_count()
    );
    tokio::spawn(async move {
        while let Some(Ok(message)) = receiver.next().await {
            match message {
                Message::Close(_) => {
                    // Indicates we want to close the conn.
                    let _ = app_state.tx.send(Missive::Close(conn_id));
                    break;
                }
                Message::Text(text) => {
                    let _ = app_state.tx.send(Missive::ChatText(text));
                }
                // browser clients should only send chat texts or close missives
                _ => println!("browser client sent something unexpected"),
            }
        }
    });

    while let Ok(data) = rx.recv().await {
        match data {
            Missive::Frame(raw_img) => {
                sender
                    .send(Message::Binary(raw_img))
                    .await
                    .expect("ws::could not send frame");
            }
            Missive::ChatText(text) => {
                sender
                    .send(Message::Text(text))
                    .await
                    .expect("ws::could not send chat message");
            }
            // end loop -> close the ws stream and drop the current rx
            Missive::Close(id) => {
                if id == conn_id {
                    break;
                }
            }
        }
    }
    println!("Closed browser client {}.", conn_id);
}

/// Receives frame data from tcp client and send frames through the channel
async fn process(socket: &mut TcpStream, tx: tokio::sync::broadcast::Sender<Missive>) {
    let mut prefix: [u8; 4] = [0, 0, 0, 0];
    loop {
        let mut n = socket
            .read_exact(&mut prefix)
            .await
            .expect("failed to read data from socket");

        if n == 0 {
            println!("returning");
            return;
        }

        let prefix_val = i32::from_be_bytes(prefix);
        let mut buf = vec![0; prefix_val as usize];

        n = socket
            // .read(&mut buf)
            .read_exact(&mut buf)
            .await
            .expect("failed to read data from socket");

        if n != 0 {
            // let x = include_bytes!("../square_based.png");
            // buf.append(&mut x.to_vec());
            // let x_vec : Vec<u8> = x.to_vec();
            // let _ = tx.send(x_vec);

            // TODO: fix this nonsense.
            let _ = tx.send(buf.clone());
            // println!("{:?}", buf);
            // println!("sent {} bytes", buf.len());
            // println!("returning");
            // return;
        }
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
    let css = tokio::fs::read_to_string("./src/client/style.css")
        .await
        .expect("can't find css");

    Response::builder()
        .header("content-type", "text/css;charset=utf-8")
        .body(css)
        .unwrap()
}
