import os
from dotenv import load_dotenv

load_dotenv()  # .env dosyasını yükle

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'çok-gizli-bir-anahtar'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Diğer genel ayarlar buraya

class DevelopmentConfig(Config):  # Config'ten miras al
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or 'sqlite:///dev.db'  # Geliştirme için SQLite

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or 'sqlite:///test.db'
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')  # .env'den oku
    # Diğer üretim ayarları