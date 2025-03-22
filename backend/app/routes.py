# backend/app/routes.py

from flask import Blueprint, request, jsonify, send_from_directory
from .models import db, User, DiaryEntry
from .services import analyze_sentiment

# Blueprint oluştur (URL öneki /api)
bp = Blueprint('api', __name__, url_prefix='/api')

# Kullanıcı Kayıt (POST /api/register)
@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Gerekli alan kontrolü
    if not data or 'username' not in data or 'password' not in data or 'email' not in data:
        return jsonify({'message': 'Missing username, password, or email'}), 400
    
    # Kullanıcı varlık kontrolü
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 409
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already exists'}), 409
    
    # Yeni kullanıcı oluştur
    new_user = User(
        username=data['username'],
        password=data['password'],  # Şifreyi hash'lemeniz önerilir!
        email=data['email']
    )
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'message': 'User created successfully'}), 201

# Giriş (POST /api/login)
@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'message': 'Missing username or password'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if not user or user.password != data['password']:
        return jsonify({'message': 'Invalid credentials'}), 401
    
    return jsonify({'message': 'Login successful', 'user_id': user.id}), 200

# Tüm Günlükleri Getir (GET /api/entries)
@bp.route('/entries', methods=['GET'])
def get_entries():
    user_id = _authenticate(request)
    if not user_id:
        return jsonify({'message': 'Unauthorized'}), 401
    
    entries = DiaryEntry.query.filter_by(user_id=user_id).all()
    return jsonify([entry.to_dict() for entry in entries]), 200

# Yeni Günlük Ekle (POST /api/entries)
@bp.route('/entries', methods=['POST'])
def add_entry():
    user_id = _authenticate(request)
    if not user_id:
        return jsonify({'message': 'Unauthorized'}), 401
    
    data = request.get_json()
    if 'content' not in data:
        return jsonify({'message': 'Missing content'}), 400
    
    # Duygu analizi yap
    sentiment = analyze_sentiment(data['content'])
    
    new_entry = DiaryEntry(
        content=data['content'],
        sentiment=sentiment,
        user_id=user_id
    )
    db.session.add(new_entry)
    db.session.commit()
    
    return jsonify(new_entry.to_dict()), 201

# Yardımcı Fonksiyon: Kimlik Doğrulama
def _authenticate(request):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    try:
        auth_type, user_id = auth_header.split()
        if auth_type.lower() != 'bearer':
            return None
        return int(user_id)
    except:
        return None

# Ana Sayfa için Route (Flask app direkt kullanımı)
def init_routes(app):
    @app.route('/')
    def serve_index():
        return send_from_directory(app.static_folder, 'index.html')
    
    @app.route('/<path:path>')
    def serve_static(path):
        return send_from_directory(app.static_folder, path)