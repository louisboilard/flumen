// ------------- Initialization -------------
const container = document.getElementById("canvas-container");
var canvas = document.getElementById("imgCanvas");
var ctx = canvas.getContext("2d", { alpha: false });
var img = new Image();
const video = document.getElementById('videoPlayBack');

function init() {
    if (canvas === null) {
        alert("could not grab canvas by id.");
        return;
    }
    if (container === null) {
        alert("could not grab container by id.");
        return;
    }

    // Respect the current screen's pixel ratio
    const ratio = window.devicePixelRatio;
    canvas.width = canvas.width * ratio;
    canvas.height = canvas.height * ratio;

    if (video === null) {
        alert("could not grab video by id.");
        return;
    }
    const stream = canvas.captureStream(25);
    video.srcObject = stream;
}
init();

// ------------- Websockets / Drawing logic -------------
var ws = new WebSocket("ws://localhost:7005/ws");
ws.binaryType = "arraybuffer";

ws.onopen = function() {
    console.log("connected.");
};

// cleanup on browser refresh/close
window.onbeforeunload = function() {
    console.log("closing");
    // disable onclose handler
    websocket.onclose = function() { };
    websocket.close();
};

// call sendMessage() when pressing enter or the send button
document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    if (message !== '') {
        ws.send(message);
    }
    messageInput.value = '';
}

function appendChat(data) {
    const chatMessages = document.querySelector('.chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.textContent = data;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function base64Draw(ctx, data) {
    img.src = "data:image/jpeg;base64," + data;
    img.onload = function() {
        ctx.drawImage(img, 0, 0);
    };
}

function draw(frame) {
    var blob = new Blob([frame], { type: 'application/octet-binary' });
    var url = URL.createObjectURL(blob);

    img.onload = function() {
        ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
        // ctx.drawImage(this, 0, 0);
    };
    img.src = url;
}

ws.onmessage = function(evt) {
    // var start = performance.now();
    if (evt.data instanceof ArrayBuffer) {
        // var ctx = canvas.getContext("2d", { alpha: false });
        draw(evt.data);
        // var end = performance.now();
        // console.log("took: ", end-start, " ms.");
        return;
    }
    appendChat(evt.data);
};

ws.onclose = function() {
    console.log("WebSocket closed.");

    // show "stream ended" message
    img.src = "";
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "100px sans-serif";
    ctx.fillText("Stream ended.", canvas.width/2, canvas.height/2);
};

ws.onerror = function(err) {
    console.log(err);
};
