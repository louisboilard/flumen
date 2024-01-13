import cv2
import socket
import base64
import struct

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Cannot open camera")
    exit()

TCP_IP = 'localhost'
TCP_PORT = 7006

sock = socket.socket()
sock.connect((TCP_IP, TCP_PORT))

while True:
    # Capture frame-by-frame
    ret, frame = cap.read()
    if not ret:
        print("Can't receive frame. Exiting ...")
        break

    resized = cv2.resize(frame, (480, 270))
    img = cv2.imencode('.JPEG', resized)[1]
    img_bytes = img.tobytes()
    img_b64 = base64.b64encode(img_bytes)

    # prefix
    length = len(img_b64)
    s = struct.pack("!i", length)
    sock.send(s)

    # payload
    sock.send(img_b64)


sock.close()
cap.release()
cv2.destroyAllWindows()
