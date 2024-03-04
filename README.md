# Flumen

Simple tcp/websocket video streaming/broadcasting sample with a live chat.

Live stream frames from rust to the browser natively via html5 canvas.

Simply write a client (or use the sample `client.py` as an example),
run the service (i.e `cargo run`) and send
frames to the rust streaming service with browsers open to `127.0.0.1:7005`.

## Motivation

This project was initially brought up to enable streaming to the browser
from a vr headset without the use of external libraries and without using udp
based protocols/mechanisms (sadly a prerequisite to comply with
certain organisations).

## How

Flumen receives "frames" (the binary representation of valid images (jpeg, png,
etc..)) and asynchronously broadcasts them to the connected browser clients via
websockets. The frames are sent to the rust service prefixed with a 4 bytes big
endian integer that tells the server how many bytes to read for the upcoming
frame, the service reads the frame and proceeds to broadcast it to the
connected browsers. The broadcasting is done using a
single-producer/multi-consummer broadcast channel, where the producer sends
ordered frames to the subscribed consummers (browser clients).

The browser client uses an html5 canvas as a video stream source that is mapped to an
html video element (simply for ui purposes, could display the canvas directly).
The canvas is hidden, when receiving a new frame via websocket, the image that
is the source of the canvas is updated to that binary array. Since the image
source's is a simple binary blob, this allows using arbitrary image formats as
frames (as long as supported by the image source). This strategy also removes
the sometimes required base64 encoding, which inflates network traffic.

The client implementator is free to decide at which framerate the frames are
sent to the streaming service (tested with up to 60fps without issues on a few
modern-ish machines and phones when frames were under 50_000 bytes each).

There is also a live chat which leverages the already existing broadcasting
mechanism. It has little overhead but could be removed if only wanting to
support the video stream without the live chat.

## Write a Client

Writing a client is quite easy, the thoughest part is to find an efficient way
to grab the jpeg/png/xyz representation of a frame in your application. After
that you simply have to send it via tcp to the streaming service while
controlling the frame rate as you please. The protocol is quite simple: the
frames must be prefixed with a 4 bytes big endian integer that tells the streamer
how many bytes the current frame is. That's it.

It should be kept in mind that having smaller frames is ideal for network
traffic and to support much higher fps if required. 60 fps with frames of under
75_000 bytes was a non issue. Implementing some sort of diffing algo on the
client side can be a good idea to reduce redundancies (a personal suggestion of
mine is to implement something mjpeg like, where every frame is a valid
jpeg).

## Notes

The rust server currently serves the web client, this is purely for testing
reasons. In a "real" scenario the frontend client code would most likely not be
served by the streaming service directly (but doing so simplifies testing on
multiple machines in the same network and such).

