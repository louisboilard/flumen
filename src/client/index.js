// ------------- Initialization -------------
const container = document.getElementById("canvas-container");
var canvas = document.getElementById("imgCanvas");
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

    const ratio = window.devicePixelRatio;
    // Respect the current screen's pixel ratio
    canvas.width = canvas.width * ratio;
    canvas.height = canvas.height * ratio;

    if (video === null) {
        alert("could not grab video by id.");
        return;
    }
    const stream = canvas.captureStream(45);
    video.srcObject = stream;
}
init();


// ------------- Websockets / Drawing logic -------------
var ws = new WebSocket("ws://localhost:7005/ws");
ws.binaryType = "arraybuffer";

ws.onopen = function() {
    console.log("WebSocket connected.");
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

// var chat = document.querySelector("ul");
// function appendchat2(message) {
//     var newMessage = document.createElement("li");
//     var text = document.createElement("blockquote");
//
//     newMessage.innerText = 'louis';
//     text.innerText = message;
//
//     newMessage.appendChild(text);
//     chat.appendChild(newMessage);
// }

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

function draw(ctx, binaryJpeg) {
    var blob = new Blob([binaryJpeg], { type: 'application/octet-binary' });
    var url = URL.createObjectURL(blob);

    img.onload = function() {
        // TODO: make sure this isn't causing blur
        ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
        // ctx.drawImage(this, 0, 0);
    };
    img.src = url;
}

ws.onmessage = function(evt) {
    // var start = performance.now();
    if (evt.data instanceof ArrayBuffer) {
        var ctx = canvas.getContext("2d");
        draw(ctx, evt.data);
        return;
    }
    appendChat(evt.data);

    // var end = performance.now();
    // console.log("took: ", end-start, " ms.");
};

ws.onclose = function() {
    console.log("WebSocket closed.");
    // alert("WebSocket closed.");
};

ws.onerror = function(err) {
    console.log(err);
};
