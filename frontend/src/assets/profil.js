// ../src/profil.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('profil.js yüklendi.');

    // --- Kullanıcı Oturum Kontrolü ---
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');

    if (!userId || !username) {
        console.warn("Kullanıcı oturumu bulunamadı. Giriş sayfasına yönlendiriliyor.");
        // Pencereyi tamamen yönlendir
        window.location.replace('login.html');
        return; // Kodu daha fazla çalıştırma
    }

    console.log(`Kullanıcı ID ${userId}, Kullanıcı Adı "${username}" ile profil yükleniyor.`);

    // --- DOM Elementlerini Alma ---
    const profileForm = document.getElementById('profile-form');
    const userIdSpan = document.getElementById('user-id');
    const kayitTarihiSpan = document.getElementById('kayit-tarihi');
    const adInput = document.getElementById('ad');
    const soyadInput = document.getElementById('soyad');
    const kullaniciAdiInput = document.getElementById('kullanici-adi'); // Kullanıcı adı read-only kalacak
    const epostaInput = document.getElementById('eposta');
    const dogumTarihiInput = document.getElementById('dogum-tarihi');
    const passwordSection = document.querySelector('.password-section');
    const yeniSifreInput = document.getElementById('yeni-sifre');
    const yeniSifreOnayInput = document.getElementById('yeni-sifre-onay');
    const feedbackDiv = document.getElementById('profile-feedback');
    const editButton = document.getElementById('edit-button');
    const saveButton = document.getElementById('save-button');
    const cancelButton = document.getElementById('cancel-button');
    const logoutButton = document.getElementById('logout-button'); // Çıkış butonu

    // Orijinal veriyi saklamak için değişken
    let originalProfileData = {};

    // --- API Base URL (Geliştirme için) ---
    // Gerçek bir projede, bu URL bir konfigürasyon dosyasından veya değişkenden gelmelidir.
    const API_BASE_URL = window.location.origin; // Örneğin: http://localhost:5000


    // --- Fonksiyon: Geri Bildirimi Göster ---
    function showFeedback(message, type = 'info') {
        feedbackDiv.textContent = message;
        feedbackDiv.className = 'form-feedback'; // Tüm mevcut classları temizle
        if (type === 'success') {
            feedbackDiv.classList.add('success');
        } else if (type === 'error') {
            feedbackDiv.classList.add('error');
        }
        // Bilgi (info) için ekstra class eklemeye gerek yok, varsayılan stil kullanır.
    }

    // --- Fonksiyon: Geri Bildirimi Temizle ---
    function clearFeedback() {
        feedbackDiv.textContent = '';
        feedbackDiv.className = 'form-feedback'; // Classları sıfırla
    }

    // --- Fonksiyon: Alanların Düzenlenebilirliğini Değiştir ---
    function toggleEditMode(isEditing) {
        const editableInputs = [adInput, soyadInput, epostaInput, dogumTarihiInput];
        editableInputs.forEach(input => {
            input.readOnly = !isEditing;
            // input.classList.toggle('read-only', !isEditing); // CSS için read-only class'ı kullanılıyorsa
        });

        passwordSection.classList.toggle('hidden', !isEditing);
        editButton.classList.toggle('hidden', isEditing);
        saveButton.classList.toggle('hidden', !isEditing);
        cancelButton.classList.toggle('hidden', !isEditing);

        // Düzenleme bittiğinde şifre alanlarını temizle
        if (!isEditing) {
            yeniSifreInput.value = '';
            yeniSifreOnayInput.value = '';
            clearFeedback(); // Mod değiştiğinde geri bildirimi temizle
        } else {
             // Düzenlemeye başlarken mevcut veriyi sakla
             originalProfileData = {
                ad: adInput.value,
                soyad: soyadInput.value,
                eposta: epostaInput.value,
                dogum_tarihi: dogumTarihiInput.value // Input'un formatı (YYYY-MM-DD) saklanacak
             };
             clearFeedback(); // Düzenlemeye başlarken geri bildirimi temizle
        }

        // Kullanıcı adı her zaman read-only
        kullaniciAdiInput.readOnly = true;
        // ID ve Kayıt Tarihi her zaman read-only span'lerde olduğu için onlara dokunmaya gerek yok.
    }

    // --- Fonksiyon: Profil Verisini Çek ---
    async function fetchProfileData() {
        showFeedback('Profil bilgileri yükleniyor...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/profile`, {
                method: 'GET',
                headers: {
                    'X-User-ID': userId,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Profil verisi başarıyla çekildi:', data);
                clearFeedback();
                // Alanları doldur
                userIdSpan.textContent = data.id;
                kayitTarihiSpan.textContent = data.kayit_tarihi ? new Date(data.kayit_tarihi).toLocaleDateString() : 'Belirtilmemiş'; // Formatla
                adInput.value = data.ad || '';
                soyadInput.value = data.soyad || '';
                kullaniciAdiInput.value = data.kullanici_adi || '';
                epostaInput.value = data.eposta || '';
                dogumTarihiInput.value = data.dogum_tarihi || ''; // YYYY-MM-DD formatında gelmeli input için

                // Başlangıçta read-only modunda
                toggleEditMode(false);

            } else {
                console.error('Profil verisi çekilirken hata:', response.status, data.message);
                 showFeedback(`Profil bilgileri yüklenemedi: ${data.message || 'Bir hata oluştu.'}`, 'error');
                 if (response.status === 401) {
                     // Oturum geçersizse veya kullanıcı bulunamazsa login sayfasına yönlendir
                     setTimeout(() => window.location.replace('login.html'), 2000);
                 }
            }

        } catch (error) {
            console.error('Profil verisi çekilirken beklenmeyen hata:', error);
            showFeedback('Profil bilgileri yüklenirken sunucuda bir sorun oluştu.', 'error');
        }
    }

    // --- Fonksiyon: Profil Verisini Güncelle ---
    async function updateProfileData(updatedData) {
        showFeedback('Profil güncelleniyor...', 'info');

        try {
             const response = await fetch(`${API_BASE_URL}/api/profile`, {
                 method: 'PUT',
                 headers: {
                     'X-User-ID': userId,
                     'Content-Type': 'application/json'
                 },
                 body: JSON.stringify(updatedData)
             });

             const data = await response.json();

             if (response.ok) {
                 console.log('Profil başarıyla güncellendi:', data.message);
                 showFeedback(data.message || 'Profil başarıyla güncellendi!', 'success');

                 // Başarılı olursa yeni veriyi sakla (şifre hariç) ve read-only moda dön
                 // Not: Backend sadece başarılı mesajı döndürüyorsa, frontend'deki input değerlerini kullan
                 originalProfileData = {
                     ad: adInput.value,
                     soyad: soyadInput.value,
                     eposta: epostaInput.value,
                     dogum_tarihi: dogumTarihiInput.value
                 };
                 toggleEditMode(false); // Read-only moda dön

             } else {
                 console.error('Profil güncellenirken hata:', response.status, data.message);
                 showFeedback(`Güncelleme Başarısız: ${data.message || 'Bir hata oluştu.'}`, 'error');
                 toggleEditMode(true); // Düzenleme modunda kal ki kullanıcı düzeltsin
                  if (response.status === 401) {
                     // Oturum geçersizse veya kullanıcı bulunamazsa login sayfasına yönlendir
                     setTimeout(() => window.location.replace('login.html'), 2000);
                 }
             }

        } catch (error) {
             console.error('Profil güncellenirken beklenmeyen hata:', error);
             showFeedback('Profil güncellenirken sunucuda bir sorun oluştu.', 'error');
             toggleEditMode(true); // Düzenleme modunda kal
        }
    }


    // --- Olay Dinleyicileri ---

    // Düzenle Butonu
    editButton.addEventListener('click', () => {
        console.log('Düzenle butonuna tıklandı.');
        toggleEditMode(true);
    });

    // İptal Butonu
    cancelButton.addEventListener('click', () => {
        console.log('İptal butonuna tıklandı.');
        // Alanları orijinal değerlere geri döndür
        adInput.value = originalProfileData.ad || '';
        soyadInput.value = originalProfileData.soyad || '';
        epostaInput.value = originalProfileData.eposta || '';
        dogumTarihiInput.value = originalProfileData.dogum_tarihi || '';
        // Şifre alanlarını temizle (zaten toggleEditMode içinde temizleniyor)
        // yeniSifreInput.value = '';
        // yeniSifreOnayInput.value = '';

        toggleEditMode(false); // Read-only moda dön
        showFeedback('Değişiklikler iptal edildi.', 'info');
    });

    // Form Gönderme (Kaydet Butonu Tetikler)
    profileForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Sayfanın yeniden yüklenmesini engelle

        console.log('Profil form gönderildi (Kaydet).');
        clearFeedback(); // Eski geri bildirimi temizle

        // Alanları devre dışı bırak (isteğe bağlı, UI geri bildirimi için)
        toggleEditMode(false); // Geçici olarak devre dışı

        // Güncellenecek verileri topla
        const updatedData = {
            ad: adInput.value.trim(),
            soyad: soyadInput.value.trim(),
            eposta: epostaInput.value.trim(),
            dogum_tarihi: dogumTarihiInput.value // YYYY-MM-DD formatında
        };

        const newPassword = yeniSifreInput.value;
        const newPasswordConfirm = yeniSifreOnayInput.value;

        // --- Frontend Doğrulama ---
        let isValid = true;

        if (!updatedData.ad || !updatedData.soyad || !updatedData.eposta) {
            showFeedback('Ad, Soyad ve E-posta alanları boş olamaz.', 'error');
            isValid = false;
        }

         // Basit e-posta formatı kontrolü
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (updatedData.eposta && !emailRegex.test(updatedData.eposta)) {
            showFeedback('Lütfen geçerli bir e-posta adresi girin.', 'error');
            isValid = false;
        }


        // Eğer yeni şifre girildiyse, şifre doğrulamalarını yap
        if (newPassword) {
            if (newPassword.length < 6) {
                showFeedback('Yeni şifre en az 6 karakter olmalıdır.', 'error');
                isValid = false;
            }
            if (newPassword !== newPasswordConfirm) {
                showFeedback('Yeni şifreler uyuşmuyor.', 'error');
                isValid = false;
            }
             // Şifre değiştirmek istiyorsa, updatedData'ya ekle
             if (isValid) { // Şifre doğrulaması geçtiyse
                 updatedData.yeni_sifre = newPassword;
             }
        } else {
             // Yeni şifre girilmediyse, onay alanının da boş olduğundan emin olalım (UI/UX için)
             yeniSifreOnayInput.value = '';
        }

        // Eğer doğrulama başarısız olursa, işlemi durdur ve tekrar düzenleme moduna dön
        if (!isValid) {
            toggleEditMode(true); // Kullanıcının hataları düzeltmesi için
            console.warn("Frontend doğrulaması başarısız.");
            return;
        }

        // --- Güncelleme İşlemi ---
        console.log("Doğrulama başarılı. Güncellenecek veriler (şifre hariç):", updatedData);
        await updateProfileData(updatedData);

    });

     // Logout Butonu (index.js tarafından da eklenebilir, burada da eklenebilir)
     // Eğer index.js yüklendiğinde bu butona listener ekliyorsa, buradaki fazlalık olur.
     // Ama emin olmak için ekleyelim, sadece bir kere çalışacaktır.
     logoutButton.addEventListener('click', () => {
         console.log("Çıkış yapılıyor...");
         localStorage.removeItem('userId');
         localStorage.removeItem('username');
         // Eğer tema ayarları da kullanıcıya özelse, onları da temizleyebilirsiniz
         // localStorage.removeItem('theme');
         // localStorage.removeItem('bgColor');
         window.location.replace('login.html'); // Geçmişe eklemeden yönlendir
     });


    // --- Sayfa Yüklendiğinde Profil Bilgilerini Çek ---
    fetchProfileData();

    // --- Tema ve Renk Ayarlarını Uygula (index.js'ten geldiği varsayılır) ---
    // Eğer index.js'teki logic DOMContentLoaded'dan sonra çalışıyorsa, buraya bekleme
    // veya index.js'teki fonksiyonları doğrudan çağırma eklemek gerekebilir.
    // Şimdilik index.js'in kendi kendine hallettiğini varsayıyoruz.
    // Eğer common.js kullanılıyorsa, o dosya buraya include edilmeli ve gerekli
    // init fonksiyonları çağrılmalıdır. profil.html zaten index.js'i include ediyor,
    // bu yüzden index.js'in DOMContentLoaded listener'ı içindeki tema/renk logic'i
    // burada da çalışacaktır.

});