from datetime import datetime
from .utils import db  # SQLAlchemy nesnesini import et

class User(db.Model):
    """
    Kullanıcı modeli.

    Veritabanındaki 'users' tablosunu temsil eder.
    """
    __tablename__ = 'users'  # Tablo adı

    id = db.Column(db.Integer, primary_key=True)  # Birincil anahtar (otomatik artan)
    username = db.Column(db.String(80), unique=True, nullable=False)  # Kullanıcı adı (benzersiz ve zorunlu)
    password = db.Column(db.String(120), nullable=False)  # Şifre (zorunlu) - GÜVENLİK İÇİN HASH'LENMELİ!
    email = db.Column(db.String(120), unique=True, nullable=False)  # E-posta (benzersiz ve zorunlu)

    # İlişki (bir kullanıcının birden fazla günlük girişi olabilir)
    entries = db.relationship('DiaryEntry', backref='user', lazy=True)

    def __repr__(self):
        """
        Nesnenin okunabilir bir temsilini döndürür (hata ayıklama için).
        """
        return f'<User {self.username}>'


class DiaryEntry(db.Model):
    """
    Günlük girişi modeli.

    Veritabanındaki 'diary_entries' tablosunu temsil eder.
    """
    __tablename__ = 'diary_entries'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Hangi kullanıcıya ait (foreign key)
    content = db.Column(db.Text, nullable=False)  # Günlük içeriği (zorunlu)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)  # Oluşturulma zamanı (otomatik)
    audio_url = db.Column(db.String(255))  # Ses kaydı URL'si (isteğe bağlı)
    sentiment = db.Column(db.String(50))   # Duygu durumu (örneğin, "positive", "negative", "neutral")
    summary = db.Column(db.Text)          # Yapay zeka tarafından oluşturulan özet (isteğe bağlı)

    def __repr__(self):
        return f'<DiaryEntry {self.id} by User {self.user_id}>'

    def to_dict(self):
        """
        Nesneyi JSON formatına dönüştürmek için bir sözlük (dictionary) döndürür.
        """
        return {
            'id': self.id,
            'user_id': self.user_id,
            'content': self.content,
            'timestamp': self.timestamp.isoformat(),  # ISO formatında tarih/saat
            'audio_url': self.audio_url,
            'sentiment': self.sentiment,
            'summary': self.summary
        }