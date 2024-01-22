// ------------- Initialization -------------
const container = document.getElementById("canvas-container");
var canvas = document.getElementById("imgCanvas");

function initialValidation() {
  if (canvas === null) {
     alert("could not grab canvas by id.");
     return;
  }
  if (container === null) {
     alert("could not grab container by id.");
     return;
  }
}
initialValidation();


// ------------- Websockets / Drawing logic -------------
var ws = new WebSocket("ws://localhost:7005/ws");
ws.binaryType = "arraybuffer";
var img = new Image();

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
     // TODO: make sure this isn't causing blurr
     ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
     // ctx.drawImage(this, 0, 0);
   };
   img.src = url;
}

ws.onmessage = function (evt) {
   var start = performance.now();
   var ctx = canvas.getContext("2d");
   binaryJpegDraw(ctx, evt.data);

   var end = performance.now();
   console.log("took: ", end-start, " ms.");
};

ws.onclose = function() {
    console.log("WebSocket closed.");
};

ws.onerror = function(err) { 
    console.log(err);
};

// ------------- Resizing -------------

// Register a resizeObserver on the canvas and keep ratio
var width = container.style.width;
function canvasResize() {
  const newWidth = container.style.width;
  if (newWidth !== width) {
    width = newWidth;
    canvas.width  = parseInt(width);
    canvas.height = parseInt(width) * 0.5625; // 16/9
    console.log("xyz width height", canvas.width, canvas.height);
  }
};
new ResizeObserver(canvasResize).observe(container)
