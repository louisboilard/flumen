function drawCanvas() {
    var imgCanv = document.getElementById("imgCanvas");
    if (imgCanv === null) {
        console.log("could not grab canvas by id.");
        return;
    }
    var ctx = imgCanv.getContext("2d");

    var grd = ctx.createLinearGradient(0, 0, 200, 0);
    grd.addColorStop(0, "red");
    grd.addColorStop(1, "white");
    ctx.fillStyle = grd;
    ctx.fillRect(10, 10, 150, 80);
}

var ws = new WebSocket("ws://localhost:7005/ws");
ws.binaryType = "arraybuffer";

ws.onopen = function() {
    console.log("WebSocket connected.");
    // ws.send("Message to send");
};

ws.onmessage = function (evt) {
   var start = performance.now();
   var imgCanv = document.getElementById("imgCanvas");
   if (imgCanv === null) {
       console.log("could not grab canvas by id.");
       return;
   }

   var ctx = imgCanv.getContext("2d");
   // console.log("Message received: ", evt.data);

   // draw image data
   ctx.putImageData(
       new ImageData(new Uint8ClampedArray(evt.data), 200, 200),
       0, 0,
   );
   var end = performance.now();
   console.log("took: ", end-start, " ms.");
};

ws.onclose = function() { 
    console.log("WebSocket closed.");
};

ws.onerror = function(err) { 
    console.log(err);
};
