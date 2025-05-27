from flask import Flask, render_template, Response, jsonify, request, url_for
import cv2
import mediapipe as mp
import numpy as np
import tensorflow as tf
import joblib
import base64

app = Flask(__name__)

MODEL_PATH = 'modelo_señas.keras'
SCALER_PATH = 'scaler.pkl'
LABEL_ENCODER_PATH = 'label_encoder.pkl'

model = tf.keras.models.load_model(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
le = joblib.load(LABEL_ENCODER_PATH)

mp_hands = mp.solutions.hands
hands_detector = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)

cap = None

def predict_from_frame(frame):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands_detector.process(rgb)
    label = "N/A"
    confidence = 0.0

    if results.multi_hand_landmarks:
        hand_landmarks = results.multi_hand_landmarks[0]
        keypoints = []
        for lm in hand_landmarks.landmark:
            keypoints.extend([lm.x, lm.y, lm.z])
        keypoints = np.array(keypoints).reshape(1, -1)
        
        keypoints_norm = scaler.transform(keypoints)
       
        preds = model.predict(keypoints_norm, verbose=0)
        idx = np.argmax(preds)
        confidence = float(preds[0][idx] * 100)
        label = le.inverse_transform([idx])[0]
    return label, confidence
def gen_frames():
    global cap
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        label, conf = predict_from_frame(frame)
        cv2.putText(
            frame,
            f"{label} ({conf:.1f}%)",
            (30, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2
        )
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n'
               b'--letra\r\n'
               b'Content-Type: text/plain\r\n\r\n' + label.encode() + b'\r\n')

@app.route('/')
def index():
    return render_template('pagina.html')

@app.route('/camara')
def camara():
    return render_template('camara.html')

@app.route('/activar_camara')
def activar_camara():
    global cap
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return "Error al acceder a la cámara", 500
    return Response(
        gen_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@app.route('/detect_fingers', methods=['POST'])
def detect_fingers():
    data = request.get_json()
    image_data = data['image'].split(",")[1]
    img_array = np.frombuffer(base64.b64decode(image_data), np.uint8)
    frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    label, conf = predict_from_frame(frame)
    return jsonify({'letra': label, 'confianza': f"{conf:.1f}%"})

@app.route('/traducir', methods=['POST'])
def traducir():
    data = request.get_json()
    texto = data.get('texto', '')
    mapping = {
        **{c: url_for('static', filename=f'images/{c.upper()}/{c}.jpeg') for c in 'abcdefghijklmnopqrstuvwyzx'},
        'ñ': url_for('static', filename='images/Ñ/ñ.png')
    }
    traduccion = [mapping[l] for l in texto.lower() if l in mapping]
    return jsonify({'traduccion': traduccion})

@app.route('/pagina2')
def pagina2():
    return render_template('pagina2.html')

@app.route ('/RV')
def RV():
    return render_template('RV.html')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
