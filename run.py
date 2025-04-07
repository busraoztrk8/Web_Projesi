# run.py
from dotenv import load_dotenv
load_dotenv() # .env dosyasını en başta yükle

import logging
import os
from flask import Flask, abort, send_from_directory

# --- Temel Loglama Ayarları ---
logging.basicConfig(level=logging.INFO, # Debug için logging.DEBUG yapabilirsiniz
                    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__) # Ana uygulama logger'ı

# --- Flask Uygulaması Kurulumu ---
app = Flask(__name__, static_folder='frontend', static_url_path='')
logger.info("Flask uygulaması oluşturuldu.")

# --- Blueprint'i Kaydet ---
try:
    # routes.py'nin backend/app içinde olduğunu varsayıyoruz
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
    # Bu fonksiyon içindeki logger artık app context içinde çalışır
    app.logger.info("İstek -> / (login.html sunuluyor)")
    try:
        public_dir = os.path.join(app.static_folder, 'public')
        return send_from_directory(public_dir, 'login.html')
    except FileNotFoundError:
        app.logger.error("login.html bulunamadı (frontend/public içinde olmalı)")
        abort(404)

# Genel statik dosya sunucusu (CSS, JS, diğer HTML'ler için)
@app.route('/<path:filename>')
def serve_static_files(filename):
    app.logger.debug(f"İstek -> Statik dosya: {filename}")
    # Flask'ın kendi statik dosya mekanizmasını kullanıyoruz
    # static_folder='frontend' olarak ayarlandığı için frontend/ içinden sunar
    # Örneğin /src/kayit.js isteği frontend/src/kayit.js dosyasını sunar
    # Örneğin /public/kayit.html isteği frontend/public/kayit.html dosyasını sunar
    try:
        return send_from_directory(app.static_folder, filename)
    except FileNotFoundError:
         app.logger.warning(f"Statik dosya bulunamadı: {filename} (frontend/ içinde arandı)")
         abort(404)


# --- Uygulamayı Çalıştır ---
if __name__ == '__main__':
    # Ortam değişkeni kontrolü
    logger.info("Ortam değişkenleri kontrol ediliyor...")
    required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
    for var in required:
        if not os.getenv(var):
            logger.warning(f"!!! UYARI: Ortam değişkeni '{var}' eksik veya boş. .env dosyası doğru yüklendi mi?")
        else:
             # Şifreyi loglamadan diğerlerini loglayabiliriz (debug için)
             if var != 'DB_PASSWORD':
                 logger.info(f"   {var}: {os.getenv(var)}")
             else:
                 logger.info(f"   {var}: ****** (Loaded)")


    logger.info("Flask uygulaması başlatılıyor...")
    # port=5000 yerine başka bir port da kullanabilirsiniz
    app.run(debug=True, host='0.0.0.0', port=5000)