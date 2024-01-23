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
  canvas.width  = canvas.width * ratio;
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
    // ws.send("Message to send");
};

function base64Draw(ctx, data) {
   img.src = "data:image/jpeg;base64," + data;
   img.onload = function () {
      ctx.drawImage(img, 0, 0);
   };
}

function binaryJpegDraw(ctx, binaryJpeg) {
   var blob = new Blob([binaryJpeg], {type: 'application/octet-binary'});
   var url = URL.createObjectURL(blob);

   img.onload = function () {
     // TODO: make sure this isn't causing blur
     ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
     // ctx.drawImage(this, 0, 0);
   };
   img.src = url;
}

ws.onmessage = function (evt) {
   // var start = performance.now();
   var ctx = canvas.getContext("2d");
   binaryJpegDraw(ctx, evt.data);

   // var end = performance.now();
   // console.log("took: ", end-start, " ms.");
};

ws.onclose = function() {
    console.log("WebSocket closed.");
};

ws.onerror = function(err) { 
    console.log(err);
};
