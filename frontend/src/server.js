// server.js (veya index.js)
const express = require('express');
const mysql = require('mysql2/promise'); // promise-based API
const cors = require('cors');
const bodyParser = require('body-parser');

const port = 3001; // Farklı bir port kullanın (3000 genellikle React için kullanılır)

// CORS'u etkinleştir
app.use(cors());

// İstek gövdesini (request body) JSON olarak ayrıştırmak için
app.use(bodyParser.json());

// SingleStore bağlantı bilgileri (KENDİ BİLGİLERİNİZLE DEĞİŞTİRİN)
const dbConfig = {
    host: 'your_singlestore_host', //örn:  svc-xxxxx-dml.aws-london-1.svc.singlestore.com
    user: 'your_singlestore_user', //örn: admin
    password: 'your_singlestore_password',
    database: 'your_singlestore_database', //örn:  kayit_db
    port: 3306, // SingleStore port (genellikle 3306)
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};



// Veritabanı bağlantı havuzu (pool) oluştur
const pool = mysql.createPool(dbConfig);

// Test bağlantısı
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Veritabanına başarıyla bağlandı!');
        connection.release(); // Bağlantıyı havuza geri bırak
    } catch (error) {
        console.error('Veritabanına bağlanırken hata:', error);
        if (error.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Veritabanı bağlantısı koptu.');
        }
        if (error.code === 'ER_CON_COUNT_ERROR') {
            console.error('Çok fazla veritabanı bağlantısı var.');
        }
        if (error.code === 'ECONNREFUSED') {
            console.error('Veritabanı bağlantısı reddedildi.');
        }
    }
}
testConnection();

// Kayıt verilerini işleyen endpoint
app.post('/api/kayit', async (req, res) => {
    try {
        const { ad, soyad, dogumTarihi, kullaniciAdi, sifre, email } = req.body;

        // GÜVENLİK İÇİN ÇOK ÖNEMLİ: Şifreyi HASH'LE! (Örnek bcrypt ile)
        // npm install bcrypt
        const bcrypt = require('bcrypt');
        const saltRounds = 10; // Tuzlama tur sayısı (genellikle 10 yeterlidir)
        const hashedPassword = await bcrypt.hash(sifre, saltRounds);


        // SQL sorgusu (prepared statement ile - SQL injection'a karşı koruma)
        const sql = `INSERT INTO kullanicilar (ad, soyad, dogum_tarihi, kullanici_adi, sifre, email) VALUES (?, ?, ?, ?, ?, ?)`;
        const [results] = await pool.execute(sql, [ad, soyad, dogumTarihi, kullaniciAdi, hashedPassword, email]); //sifre yerine hashedPassword

        console.log('Kayıt eklendi, ID:', results.insertId);
        res.status(201).json({ message: 'Kayıt başarıyla eklendi', insertId: results.insertId }); // 201 Created

    } catch (error) {
        console.error('Kayıt eklenirken hata:', error);
        res.status(500).json({ message: 'Kayıt eklenirken bir hata oluştu', error: error.message }); // 500 Internal Server Error
    }
});


// Sunucuyu başlat
app.listen(port, () => {
    console.log(`Sunucu ${port} portunda çalışıyor...`);
});

// ÖNEMLİ:  "kullanicilar" tablosunu SingleStore'da OLUŞTURUN:
/*
CREATE TABLE kullanicilar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad VARCHAR(255) NOT NULL,
    soyad VARCHAR(255) NOT NULL,
    dogum_tarihi DATE NOT NULL,
    kullanici_adi VARCHAR(255) UNIQUE NOT NULL,  -- UNIQUE constraint
    sifre VARCHAR(255) NOT NULL,  -- Şifre hash'lenmiş olarak saklanacak
    email VARCHAR(255) UNIQUE NOT NULL      -- UNIQUE constraint
);
*/
const express = require('express');
const app = express();

app.use(express.static('public')); // Public klasörünü statik olarak sun

app.listen(3000, () => console.log('Server 3000 portunda çalışıyor'));
