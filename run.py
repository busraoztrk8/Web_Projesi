from flask import Flask, send_from_directory

app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory('frontend/public', 'login.html')

if __name__ == '__main__':
    app.run(debug=True, port=8080)