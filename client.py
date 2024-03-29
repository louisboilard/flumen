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

    # cv2.imshow('camera', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

    resized = cv2.resize(frame, (960, 540))
    img = cv2.imencode('.JPEG', resized)[1]
    img_bytes = img.tobytes()

    # img_b64 = base64.b64encode(img_bytes)

    # prefix
    length = len(img_bytes)
    s = struct.pack("!i", length)
    # print(length)
    sock.send(s)

    # payload
    sock.send(img_bytes)


sock.close()
cap.release()
cv2.destroyAllWindows()
