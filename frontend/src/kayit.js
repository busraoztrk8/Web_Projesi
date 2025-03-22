// kayit.js (DÜZELTİLMİŞ - En Güncel)

import Pikaday from 'pikaday';
import 'pikaday/css/pikaday.css';

document.addEventListener('DOMContentLoaded', function() {
    // Pikaday başlatma (Pikaday kodunuz aynı kalabilir)
    const picker = new Pikaday({
        field: document.getElementById('dogumTarihi'),
        format: 'YYYY-MM-DD',
        yearRange: [1900, new Date().getFullYear()],
        maxDate: new Date(),
        i18n: {
            previousMonth: 'Önceki Ay',
            nextMonth: 'Sonraki Ay',
            months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
            weekdays: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
            weekdaysShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
        }
    });
    

    // Şifre gösterme/gizleme işlevi (FONKSİYONU ÖNCE TANIMLA)
    function togglePasswordVisibility(passwordInput, toggleButton) {
        if (passwordInput && toggleButton) {
            console.log("togglePasswordVisibility fonksiyonu çağrıldı.");
            console.log("passwordInput:", passwordInput);
            console.log("toggleButton:", toggleButton);

            toggleButton.addEventListener('click', function() {
                console.log("Göz ikonuna tıklandı.");
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                console.log("Yeni type:", type);
                passwordInput.setAttribute('type', type);

                // İkon değiştirme kodu (Font Awesome 6'ya uygun)
                if (type === 'password') {
                    toggleButton.classList.remove('fa-eye-slash');
                    toggleButton.classList.add('fa-eye');
                } else {
                    toggleButton.classList.remove('fa-eye');
                    toggleButton.classList.add('fa-eye-slash');
                }
            });
        }
    }


     // Şifre ve şifre tekrar alanları için toggle işlevlerini çağır (SONRA ÇAĞIR)
    togglePasswordVisibility(document.querySelector('#sifre'), document.querySelector('#toggleSifre'));
    togglePasswordVisibility(document.querySelector('#sifreTekrar'), document.querySelector('#toggleSifreTekrar'));


    // Form doğrulama (Form doğrulama kodunuz aynı kalabilir)
    const kayitFormu = document.getElementById('kayitFormu');
    kayitFormu.addEventListener('submit', function(event) {
        event.preventDefault();

        let isValid = true;

        // Helper function to show/hide error messages
        function toggleError(element, message, show) {
            const errorElement = document.getElementById(element + 'Error');
            if (show) {
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            } else {
                errorElement.style.display = 'none';
            }
        }

        // Ad kontrolü
        const ad = document.getElementById('ad');
        toggleError('ad', 'Ad alanı zorunludur.', ad.value.trim() === '');
        isValid = isValid && (ad.value.trim() !== '');

        // Soyad kontrolü
        const soyad = document.getElementById('soyad');
        toggleError('soyad', 'Soyad alanı zorunludur.', soyad.value.trim() === '');
        isValid = isValid && (soyad.value.trim() !== '');

      // Doğum tarihi kontrolü ve 18 yaş kontrolü
        const dogumTarihi = document.getElementById('dogumTarihi');
        if (!dogumTarihi.value.trim()) {
            toggleError('dogumTarihi', 'Doğum tarihi zorunludur.', true);
            isValid = false;
        } else {
            const tarih = new Date(dogumTarihi.value);
            if (isNaN(tarih.getTime())) {
                toggleError('dogumTarihi', 'Geçerli bir tarih giriniz.', true);
                isValid = false;
            } else {
                const bugun = new Date();
                let yas = bugun.getFullYear() - tarih.getFullYear();
                const ayFarki = bugun.getMonth() - tarih.getMonth();

                // Doğum günü bu yıl geçmiş mi kontrolü
                if (ayFarki < 0 || (ayFarki === 0 && bugun.getDate() < tarih.getDate())) {
                    yas--;
                }

                if (yas < 18) {
                    toggleError('dogumTarihi', '18 yaşından büyük olmalısınız.', true);
                    isValid = false;
                } else {
                    toggleError('dogumTarihi', '', false);
                }
            }
        }

        // Kullanıcı adı kontrolü
        const kullaniciAdi = document.getElementById('kullaniciAdi');
        toggleError('kullaniciAdi', 'Kullanıcı adı zorunludur.', kullaniciAdi.value.trim() === '');
        isValid = isValid && (kullaniciAdi.value.trim() !== '');

        // Şifre kontrolü
        const sifre = document.getElementById('sifre');
        toggleError('sifre', 'Şifre zorunludur.', sifre.value.trim() === '');
        isValid = isValid && (sifre.value.trim() !== '');

        // Şifre tekrar kontrolü
        const sifreTekrar = document.getElementById('sifreTekrar');
        if (sifreTekrar.value.trim() === '') {
            toggleError('sifreTekrar', 'Şifre tekrarı zorunludur.', true);
            isValid = false;
        } else if (sifre.value !== sifreTekrar.value) {
            toggleError('sifreTekrar', 'Şifreler eşleşmiyor.', true);
            isValid = false;
        } else {
            toggleError('sifreTekrar', '', false);
        }

        // E-posta kontrolü
        const email = document.getElementById('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (email.value.trim() === '') {
            toggleError('email', 'E-posta adresi zorunludur.', true);
            isValid = false;
        } else if (!emailRegex.test(email.value)) {
            toggleError('email', 'Geçerli bir e-posta adresi giriniz.', true);
            isValid = false;
        } else {
            toggleError('email', '', false);
        }


        if (isValid) {
            alert('Kayıt başarılı!');
            kayitFormu.reset(); // Formu sıfırla
        }
    });
});