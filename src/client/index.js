var ws = new WebSocket("ws://localhost:7005/ws");
ws.binaryType = "arraybuffer";

ws.onopen = function() {
    console.log("WebSocket connected.");
    // ws.send("Message to send");
};

var img = new Image();

function base64Draw(ctx, data) {
   img.src = "data:image/jpeg;base64," + data;
   img.onload = function () {
      ctx.drawImage(img, 0, 0);
   };
}

function binaryJpegDraw(ctx, binaryJpeg) {
   // var blob = new Blob([new Uint8ClampedArray(binaryJpeg)], {type: 'application/octet-binary'});
   var blob = new Blob([binaryJpeg], {type: 'application/octet-binary'});
   var url = URL.createObjectURL(blob);
   img.onload = function () {
     ctx.drawImage(this, 0, 0);
   };
   img.src = url;
}

ws.onmessage = function (evt) {
   var start = performance.now();
   var imgCanv = document.getElementById("imgCanvas");
   if (imgCanv === null) {
       console.log("could not grab canvas by id.");
       return;
   }

   var ctx = imgCanv.getContext("2d");

   binaryJpegDraw(ctx, evt.data);
   // base64Draw(ctx, evt.data);

   var end = performance.now();
   console.log("took: ", end-start, " ms.");
};

ws.onclose = function() {
    console.log("WebSocket closed.");
};

ws.onerror = function(err) { 
    console.log(err);
};
