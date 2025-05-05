# backend/app/database.py
import pymysql
import pymysql.cursors
import os
import logging
from flask import current_app
import time # Sadece initialize_database içinde loglama için kaldı, isterseniz kaldırılabilir

logger = logging.getLogger(__name__)

# Temel Bağlantı Zaman Aşımı (Saniye)
CONNECT_TIMEOUT = 15

def get_db_connection():
    """
    SingleStore veritabanına .env ayarlarına göre SSL kullanarak bağlanır.
    Şifreyi UTF-8 bytes olarak gönderir.
    """
    connection = None
    db_host = os.environ.get('DB_HOST')
    db_user = os.environ.get('DB_USER')
    db_password_str = os.environ.get('DB_PASSWORD') # Şifreyi string olarak al
    db_name = os.environ.get('DB_NAME')
    db_port_str = os.environ.get('DB_PORT', '3333') # SSL için varsayılan
    ca_path = None # CA yolu için başlangıç değeri

    # Gerekli değişkenlerin kontrolü
    required_vars = {'DB_HOST': db_host, 'DB_USER': db_user, 'DB_PASSWORD': db_password_str, 'DB_NAME': db_name, 'DB_PORT': db_port_str}
    missing_vars = [k for k, v in required_vars.items() if not v]
    if missing_vars:
        logger.error(f"!!! Gerekli ortam değişkenleri eksik: {', '.join(missing_vars)}")
        return None

    # Port dönüşümü
    try:
        db_port = int(db_port_str.strip())
    except (ValueError, TypeError):
        logger.error(f"!!! Geçersiz DB_PORT: '{db_port_str}'")
        return None

    # SSL CA Dosya Yolu
    ca_path = os.environ.get('DB_SSL_CA')
    if not ca_path:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ca_path = os.path.join(project_root, 'singlestore_bundle.pem')
        logger.info(f"Varsayılan SSL CA yolu kullanılıyor: '{ca_path}'")
    else:
        logger.info(f"DB_SSL_CA kullanılıyor: '{ca_path}'")

    if not os.path.isfile(ca_path):
        logger.error(f"!!! SSL CA dosyası bulunamadı veya bir dosya değil: '{ca_path}'")
        return None

    ssl_args = {'ca': ca_path}

    try:
        logger.info(f"Bağlanılıyor (SSL Etkin): {db_host}:{db_port} (CA: {os.path.basename(ca_path)})")

        # --- ŞİFREYİ UTF-8 BYTES'A ÇEVİRME (UnicodeEncodeError ÇÖZÜMÜ) ---
        try:
            # Şifreyi string'den UTF-8 bytes'a çeviriyoruz
            db_password_bytes = db_password_str.encode('utf-8')
            logger.debug("Şifre UTF-8 bytes'a çevrildi.")
        except UnicodeDecodeError as ude:
             # Bu, .env dosyası UTF-8 değilse olabilir
            logger.error(f"!!! .env dosyasındaki şifre okunurken/kodlanırken UnicodeDecodeError: {ude}", exc_info=True)
            logger.error("--- Lütfen .env dosyasının UTF-8 formatında kaydedildiğinden emin olun.")
            return None
        except Exception as e:
            logger.error(f"!!! Şifre UTF-8'e kodlanırken beklenmedik hata: {e}", exc_info=True)
            return None
        # --- Şifre Çevirme Bitti ---

        # --- Veritabanı bağlantısını kur (ŞİFRE BYTES OLARAK) ---
        connection = pymysql.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password_bytes, # <-- ÖNEMLİ: Bytes olarak veriliyor
            database=db_name,
            charset='utf8mb4',          # Bağlantı charset'i önemli
            cursorclass=pymysql.cursors.DictCursor,
            ssl=ssl_args,
            connect_timeout=CONNECT_TIMEOUT
        )
        logger.info("Veritabanı bağlantısı başarılı (SSL etkin).")
        return connection

    # --- Hata Yakalama ---
    except pymysql.Error as e:
        error_code = e.args[0] if len(e.args) > 0 else 'N/A'
        error_message = e.args[1] if len(e.args) > 1 else str(e)
        logger.error(f"!!! Bağlantı başarısız (pymysql.Error): Kod {error_code} - {error_message}", exc_info=True)
        if error_code == 1045: logger.error("--- Erişim reddedildi. Kullanıcı adı/şifre kontrol edin.")
        elif error_code == 2003: logger.error("--- Sunucuya bağlanılamadı. Host/Port/Ağ/Firewall kontrol edin.")
        elif error_code == 1049: logger.error(f"--- Veritabanı '{db_name}' bulunamadı.")
        elif 'SSL' in str(error_message).upper(): logger.error("--- SSL hatası. CA dosyasını veya Firewall'u kontrol edin.")
        return None
    except Exception as e:
        # Diğer beklenmedik Python hataları
        logger.exception(f"!!! Bağlantı sırasında beklenmedik Python hatası: {e}")
        return None


# --- initialize_database fonksiyonu (Değişiklik yok, doğru get_db_connection'ı kullanır) ---
def initialize_database(app):
    with app.app_context():
        logger = current_app.logger
        logger.info("Veritabanı başlatılıyor (initialize_database)...")
        connection = None
        try:
            connection = get_db_connection()
            if connection is None:
                logger.error("!!! Veritabanı başlatılamadı (bağlantı alınamadı).")
                return
            logger.info("Tablo kontrolü için bağlantı başarılı.")
            with connection.cursor() as cursor:
                sql_create_table = """
                CREATE TABLE IF NOT EXISTS uyeler (
                    id INT AUTO_INCREMENT PRIMARY KEY, ad VARCHAR(100) NOT NULL, soyad VARCHAR(100) NOT NULL,
                    kullanici_adi VARCHAR(80) NOT NULL, sifre VARCHAR(255) NOT NULL, eposta VARCHAR(120) NOT NULL,
                    dogum_tarihi DATE NULL, kayit_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"""
                cursor.execute(sql_create_table)
            logger.info("'uyeler' tablosu kontrol edildi/oluşturuldu.")
        except pymysql.Error as e:
            logger.error(f"!!! Tablo oluşturma/kontrol hatası: {e}", exc_info=True)
        except Exception as e:
             logger.exception(f"!!! initialize_database içinde beklenmedik hata: {e}")
        finally:
            if connection and connection.open:
                try:
                    connection.close()
                    logger.debug("initialize_database bağlantısı kapatıldı.")
                except Exception as close_err:
                    logger.error(f"!!! initialize_database bağlantısı kapatma hatası: {close_err}")