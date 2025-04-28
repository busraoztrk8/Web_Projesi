# run.py
from dotenv import load_dotenv
load_dotenv() # .env dosyasını en başta yükle

import logging
import os
from flask import Flask, abort, send_from_directory

# --- NLTK ve VADER Kurulumu/Kontrolü ---
import nltk
import ssl

logger_nltk = logging.getLogger('nltk_setup') # Ayrı bir logger

# NLTK veri indirme sırasında SSL sertifika sorunlarını önlemek için
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass # Eski Python sürümlerinde bu attribute olmayabilir
else:
    # Eğer varsa, varsayılan context'i doğrulanmamış olanla değiştir
    # Bu genellikle sadece bir kerelik indirme için gereklidir
    # Üretim ortamında dikkatli kullanılmalıdır
    try:
        # Sadece indirme yapmadan önce kontrol edelim
        nltk.data.find('sentiment/vader_lexicon.zip')
    except LookupError:
        ssl._create_default_https_context = _create_unverified_https_context

# VADER lexicon'unu indir (eğer indirilmemişse)
try:
    nltk.data.find('sentiment/vader_lexicon.zip')
    logger_nltk.info("NLTK VADER lexicon zaten indirilmiş.")
except LookupError: # nltk.data.find hata fırlatırsa (LookupError)
    logger_nltk.warning("NLTK VADER lexicon bulunamadı, indiriliyor...")
    try:
        nltk.download('vader_lexicon')
        logger_nltk.info("NLTK VADER lexicon başarıyla indirildi.")
    except Exception as download_err:
        logger_nltk.error(f"!!! NLTK VADER lexicon indirilemedi: {download_err}", exc_info=True)
        logger_nltk.error("--- Duygu analizi çalışmayabilir! Manuel olarak indirmeyi deneyin: python -m nltk.downloader vader_lexicon")
# --- NLTK Kurulumu Bitti ---


# --- Temel Loglama Ayarları ---
logging.basicConfig(level=logging.INFO, # Debug için logging.DEBUG yapabilirsiniz
                    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__) # Ana uygulama logger'ı

# --- Flask Uygulaması Kurulumu ---
app = Flask(__name__, static_folder='frontend', static_url_path='')
logger.info("Flask uygulaması oluşturuldu.")

# --- Blueprint'i Kaydet ---
try:
    from backend.app.routes import bp as api_blueprint
    app.register_blueprint(api_blueprint)
    logger.info("API Blueprint ('/api') başarıyla kaydedildi.")
except ImportError as e:
    logger.error(f"!!! HATA: API Blueprint (backend.app.routes) import edilemedi! Hata: {e}")
    logger.error("--- Kontrol Et: Dosya yapısı doğru mu? __init__.py dosyaları var mı?")
except Exception as e:
     logger.error(f"!!! HATA: API Blueprint kaydedilirken hata oluştu: {e}")

# --- Statik Dosya Sunumu ---
@app.route('/')
def serve_login():
    app.logger.info("İstek -> / (login.html sunuluyor)")
    try:
        # public dizininin frontend klasörü içinde olduğunu varsayıyoruz
        public_dir = os.path.join(app.static_folder, 'public')
        return send_from_directory(public_dir, 'login.html')
    except FileNotFoundError:
        app.logger.error("login.html bulunamadı (frontend/public içinde olmalı)")
        abort(404)

# Genel statik dosya sunucusu (CSS, JS, diğer HTML'ler için)
@app.route('/<path:filename>')
def serve_static_files(filename):
    # Güvenlik Notu: Bu route çok genel. Belirli dizinlere erişimi kısıtlamak daha iyi olabilir.
    # Örneğin sadece 'public', 'src' gibi klasörlerden dosya sunmak.
    app.logger.debug(f"İstek -> Statik dosya: {filename}")
    try:
        # static_folder='frontend' olarak ayarlandığı için 'frontend/' içinden sunar
        return send_from_directory(app.static_folder, filename)
    except FileNotFoundError:
         app.logger.warning(f"Statik dosya bulunamadı: {filename} (frontend/ içinde arandı)")
         abort(404)


# --- Uygulamayı Çalıştır ---
if __name__ == '__main__':
    logger.info("Ortam değişkenleri kontrol ediliyor...")
    required_env = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'GOOGLE_API_KEY'] # GOOGLE_API_KEY eklendi
    missing_env = []
    for var in required_env:
        value = os.getenv(var)
        if not value:
            missing_env.append(var)
            logger.warning(f"!!! UYARI: Ortam değişkeni '{var}' eksik veya boş. .env dosyası doğru yüklendi mi?")
        else:
             # Şifreleri ve API anahtarını loglamayalım
             if var not in ['DB_PASSWORD', 'GOOGLE_API_KEY']:
                 logger.info(f"   {var}: {value}")
             else:
                 logger.info(f"   {var}: ****** (Loaded)")

    # Eksik kritik değişken varsa programı durdurabiliriz (opsiyonel)
    # if 'DB_HOST' in missing_env or 'DB_USER' in missing_env: # vb.
    #     logger.critical("Kritik veritabanı ortam değişkenleri eksik. Uygulama başlatılamıyor.")
    #     exit(1)
    if 'GOOGLE_API_KEY' in missing_env:
        logger.warning("--- Google AI API Anahtarı eksik, yapay zeka öneri özelliği çalışmayacak. ---")


    logger.info("Flask uygulaması başlatılıyor...")
    # port=5000 yerine başka bir port da kullanabilirsiniz
    # debug=False üretim ortamı için önerilir
    app.run(debug=True, host='0.0.0.0', port=5000)