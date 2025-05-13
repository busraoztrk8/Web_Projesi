// diary.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("diary.js: Initializing Diary with AI Plan Modal and Voice Recording...");

    // --- Element Referansları ---
    const diaryTitleInput = document.getElementById('diary-title');
    const diaryContentDiv = document.getElementById('diary-content');
    const saveDiaryButton = document.getElementById('save-diary');
    const diaryEntriesList = document.getElementById('diary-entries');
    const analyzeSentimentButton = document.getElementById('analyze-sentiment-button');
    const pageColorPicker = document.getElementById('page-color-picker');
    const diaryBody = document.getElementById('diary-body'); // Body'ye ID verdik

    // --- Modal Elementleri ---
    const analysisModal = document.getElementById('analysis-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const modalLoading = document.getElementById('modal-loading');
    const modalResults = document.getElementById('modal-results');
    const modalSentimentResult = document.getElementById('modal-sentiment-result');
    const modalPlanContent = document.getElementById('modal-plan-content');
    const modalError = document.getElementById('modal-error');

    // --- Öneri Div'i (HTML'de varsa seçilir) ---
    // Artık modal içinde göstereceğiz, bu referanslar gerekmeyebilir ama temiz tutalım
    const recommendationDiv = document.getElementById('ai-recommendation');
    const sentimentResultDiv = document.getElementById('sentiment-result'); // Yerinde gösterim için

    // Toolbar Elementleri
    const fontFamilySelect = document.getElementById('font-family-select');
    const fontSizeSelect = document.getElementById('font-size-select');
    const fontColorPicker = document.getElementById('font-color-picker');
    const toolbarButtons = document.querySelectorAll('.toolbar-button');

    // --- Ses Kaydı Elementleri ---
    const startRecordingButton = document.getElementById('start-recording');
    const stopRecordingButton = document.getElementById('stop-recording');
    const saveAudioButton = document.getElementById('save-audio');
    const cancelRecordingButton = document.getElementById('cancel-recording');
    const audioPlayback = document.getElementById('audio-playback');
    const recordingStatusSpan = document.getElementById('recording-status'); // Kayıt durumu

    // --- API ve Genel Değişkenler ---
    const API_DIARY_URL = '/api/diary';
    const API_ANALYZE_PLAN_URL = '/api/diary/analyze-and-plan';
    const API_TRANSCRIBE_URL = '/api/transcribe'; // Ses çeviri endpoint'i
    let diaryEntries = [];
    let currentlyEditingId = null;

    // --- Ses Kaydı Değişkenleri ---
    let mediaRecorder;
    let audioChunks = [];
    let audioBlob;
    let audioStream;
    let audioUrl; // Kaydedilen sesin URL'si
    let audioPlaybackUrl; // <-- Bu satırın var olduğundan ve yorum satırı olmadığından emin olun!

    // --- API ve Kullanıcı Kimliği Yardımcıları ---
    const getUserId = () => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            console.error("User ID not found. Redirecting to login.");
            // apiRequest içindeki kontrol yönlendirme yapacak
            return null;
        }
        return userId;
    };

    const apiRequest = async (url, options = {}) => {
        const userId = getUserId();
        // Register endpoint'i hariç, User ID yoksa hata fırlat
        if (!userId && !url.endsWith('/api/register') && !url.endsWith('/api/login')) {
             console.error(`API Request to ${url} requires User ID, but none found.`);
             alert("Oturumunuz sonlanmış veya bulunamadı. Lütfen tekrar giriş yapınız.");
             window.location.href = '/login.html'; // login.html varsayıldı
             throw new Error("Kimlik doğrulama gerekli. Lütfen giriş yapın.");
        }


        const defaultHeaders = {
            // FormData gönderirken 'Content-Type' application/json OLMAMALI.
            // Tarayıcı otomatik olarak multipart/form-data ve boundary bilgisini ekler.
            // Bu yüzden defaultHeaders'tan Content-Type'ı kaldırıyoruz
            // veya FormData olup olmadığını kontrol ederek ekliyoruz.
            'X-User-ID': userId // User ID her zaman gönderilebilir (backend loglayabilir)
        };

         // FormData gönderiliyorsa Content-Type'ı ayarlama
         const isFormData = options.body instanceof FormData;
         const headers = isFormData ? { 'X-User-ID': userId } : {
             'Content-Type': 'application/json',
             'X-User-ID': userId
         };

        const body = isFormData ? options.body : JSON.stringify(options.body);


        try {
            // Fetch isteği
            const response = await fetch(url, { ...options, headers: headers, body: body });

            // Oturum sonlanmışsa veya yetki yoksa (401)
            if (response.status === 401) {
                localStorage.removeItem('userId');
                localStorage.removeItem('username'); // Varsa
                console.error("API Request Unauthorized (401). Redirecting to login.");
                alert("Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.");
                window.location.href = '/login.html';
                throw new Error("Unauthorized (401)");
            }

             // Silme işlemi başarılı (204 No Content) veya PUT (204)
            if (response.status === 204) {
                 console.log(`API Request ${options.method} ${url} successful (204)`);
                 return {}; // Başarılı ama içerik yok
            }

            // Diğer başarılı durumlar (2xx, 200, 201 vb.)
            if (response.ok) {
                const contentType = response.headers.get("content-type");

                // Başarılı ama JSON olmayan veya boş yanıt
                if (!contentType || !contentType.includes("application/json")) {
                     console.log(`API Request ${options.method || 'GET'} ${url} successful (Not JSON or Empty)`);
                     // Eğer GET isteği ve boş JSON bekliyorsak (örn: [] gelmesi gereken yer)
                     // veya DELETE/PUT gibi işlemler için {} bekliyorsak
                     // Bu noktada boş obje döndürmek güvenli olabilir.
                     // Ancak backend 204 dönüyorsa zaten yukarıda yakalandı.
                     return {}; // Boş obje döndür
                 }

                // Başarılı ve JSON içerik var
                const data = await response.json();
                console.log(`API Request ${options.method || 'GET'} ${url} successful.`);
                return data;
            }

            // 4xx veya 5xx hataları (401 hariç)
            let errorData = { message: `Sunucu hatası: ${response.status}` };
            try {
                 const contentType = response.headers.get("content-type");
                 if (contentType && contentType.includes("application/json")) {
                     errorData = await response.json();
                 } else {
                     // JSON olmayan hata yanıtlarını da text olarak almaya çalış
                     const errorText = await response.text();
                     errorData.message = errorText || errorData.message;
                 }
            } catch (e) {
                console.warn("Could not parse error response body:", e);
            }
            console.error(`API Request Failed: ${options.method || 'GET'} ${url} - Status: ${response.status}`, errorData);
            throw new Error(errorData.message || `API hatası: ${response.status}`);


        } catch (error) {
            // fetch sırasında oluşan ağ hataları veya yukarıda fırlatılan hatalar
            // 401 hatası zaten yukarıda ele alındı ve yönlendirme yapıldı.
            if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) {
                 console.error(`API Request Failed (Catch): ${options.method || 'GET'} ${url}`, error);
                 // Kullanıcıya genel bir hata mesajı gösterilebilir, ancak bu çok tekrar edici olabilir.
                 // alert(`İstek işlenirken bir sorun oluştu: ${error.message}`); // Tercihen sadece belirli yerlerde göster
            }
            // Hatanın yukarıya iletilmesi için tekrar fırlat
            throw error;
        }
    };


    // --- Zengin Metin Düzenleyici İşlevleri ---
    const formatDoc = (cmd, value = null) => {
        // İçerik alanına odaklan, eğer zaten odaklı değilse
        if (document.activeElement !== diaryContentDiv) {
            diaryContentDiv.focus();
        }
        document.execCommand(cmd, false, value);
        // Komut sonrası tekrar odaklanmak genellikle iyi bir UX sağlar
        diaryContentDiv.focus();
    };

    if (fontFamilySelect) fontFamilySelect.addEventListener('change', () => {
        const selectedFont = fontFamilySelect.value;
        formatDoc('fontName', selectedFont);
        // Ayrıca div'in kendi stilini de güncelleyelim ki yeni yazılar da doğru fontla başlasın
        if (diaryContentDiv) diaryContentDiv.style.fontFamily = selectedFont;
    });
    if (fontSizeSelect) fontSizeSelect.addEventListener('change', () => formatDoc('fontSize', fontSizeSelect.value));
    if (fontColorPicker) fontColorPicker.addEventListener('input', () => formatDoc('foreColor', fontColorPicker.value));
    if (toolbarButtons) toolbarButtons.forEach(button => button.addEventListener('click', (e) => {
        e.preventDefault(); // Butonun varsayılan davranışını engelle
        formatDoc(button.dataset.command);
    }));
    // Sayfa Rengi Değiştirici
    if (pageColorPicker && diaryBody) {
         // Başlangıç değerini body'den al (eğer style varsa) veya CSS'den geleni kullan
         // pageColorPicker.value = getComputedStyle(diaryBody).backgroundColor; // Bu renk kodu '#rrggbb' formatında olmayabilir

        pageColorPicker.addEventListener('input', () => {
            diaryBody.style.backgroundColor = pageColorPicker.value;
        });
         // Sayfa yüklendiğinde başlangıç rengini pageColorPicker'a yansıt
         // (eğer CSS ile ayarlıysa)
         const computedBg = getComputedStyle(diaryBody).backgroundColor;
         if (computedBg && computedBg !== 'rgba(0, 0, 0, 0)') { // Şeffaf değilse
              // computedBg genellikle rgb(x, y, z) formatındadır, color picker #RRGGBB bekler
              // Basit bir çevrim (tüm formatları desteklemeyebilir)
              const rgbMatch = computedBg.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
              if (rgbMatch) {
                   const toHex = (c) => parseInt(c).toString(16).padStart(2, '0');
                   pageColorPicker.value = `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
              }
         }
    }
    // --- Zengin Metin Düzenleyici Sonu ---

    // --- Modal Yönetimi ---
    function showModal() {
        if (!analysisModal || !modalLoading || !modalResults || !modalError || !modalSentimentResult || !modalPlanContent) {
            console.error("Modal elements not found!");
            return;
        }
        // Önceki içerik ve stilleri temizle
        modalSentimentResult.innerHTML = '';
        // Sadece JS ile eklenmiş style özelliklerini temizle, CSS sınıflarını koru
        modalSentimentResult.style.backgroundColor = '';
        modalSentimentResult.style.color = '';
        modalSentimentResult.style.border = '';
        modalSentimentResult.className = 'modal-sentiment-display'; // Temel sınıfı koru

        modalPlanContent.innerHTML = '';
        modalError.innerHTML = '';
        modalError.style.display = 'none'; // Hata div'ini gizle
        modalError.className = 'modal-error-display'; // Hata sınıfını sıfırla

        // Durumu ayarla ve göster
        modalResults.style.display = 'none';
        modalLoading.style.display = 'block';
        analysisModal.classList.add('visible'); // Animasyon için class ekle
        // Body scroll'u engelle (opsiyonel)
        document.body.style.overflow = 'hidden';
    }

    function hideModal() {
        if (analysisModal) {
            analysisModal.classList.remove('visible'); // Animasyon için class kaldır
             // Body scroll'u tekrar aktif et
             document.body.style.overflow = '';
        }
    }
    if (closeModalButton) closeModalButton.addEventListener('click', hideModal);
    // Modal dışına tıklayınca kapat
    if (analysisModal) analysisModal.addEventListener('click', (event) => {
        if (event.target === analysisModal) {
            hideModal();
        }
    });
    // ESC tuşu ile kapat
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && analysisModal.classList.contains('visible')) {
            hideModal();
        }
    });
    // --- Modal Yönetimi Sonu ---

    // --- Ses Kaydı İşlevleri ---
    function setAudioButtonStates(isRecording, isStopped, canSaveOrCancel) {
        if (!startRecordingButton || !stopRecordingButton || !saveAudioButton || !cancelRecordingButton || !recordingStatusSpan || !audioPlayback) return;

        startRecordingButton.disabled = isRecording || canSaveOrCancel; // Kayıt sırasında veya kayıttan sonra başlatılamaz
        stopRecordingButton.disabled = !isRecording; // Sadece kayıt sırasında durdurulabilir
        saveAudioButton.disabled = !canSaveOrCancel; // Sadece durdurulduktan ve veri varsa kaydedilebilir
        cancelRecordingButton.disabled = !canSaveOrCancel; // Sadece durdurulduktan ve veri varsa iptal edilebilir

        // Kayıt durumu göstergesi
        recordingStatusSpan.style.display = isRecording ? 'inline' : 'none';
        recordingStatusSpan.textContent = isRecording ? 'Kaydediliyor...' : 'İşleniyor...'; // Duruma göre metin

        // Oynatıcıyı göster/gizle
        audioPlayback.style.display = canSaveOrCancel ? 'inline-block' : 'none'; // inline-block daha iyi hizalama sağlar
    }

    function resetAudioState() {
        console.log("Resetting audio state...");
        audioChunks = [];
        audioBlob = null;
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl); // Önceki URL'yi serbest bırak
            audioUrl = null;
        }
        if (audioStream) {
            // Tüm medya izlerini durdur (hem video hem audio stream olabilir, video istemedik ama yine de güvenli olsun)
            audioStream.getTracks().forEach(track => {
                if (track.readyState === 'live') {
                    track.stop();
                }
            });
            audioStream = null;
        }
        mediaRecorder = null;
        if (audioPlayback) {
            audioPlayback.src = ''; // Oynatıcı kaynağını temizle
            audioPlayback.removeAttribute('controls'); // Controls'u kaldır
        }

        setAudioButtonStates(false, true, false); // Başlangıç durumu: Kayıt yok, durmuş, kaydedilecek/iptal edilecek bir şey yok
        // Hata durumunda da status gizlensin
        if (recordingStatusSpan) {
             recordingStatusSpan.style.display = 'none';
             recordingStatusSpan.textContent = ''; // Metni de temizle
        }
        console.log("Audio state reset complete.");
    }

    async function startRecording() {
        console.log("Attempting to start recording...");
        resetAudioState(); // Önceki durumu temizle

        try {
            // Kullanıcıdan mikrofon izni iste
            // Sadece audio iste, video isteme
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            console.log("Microphone access granted.");

            // MediaRecorder oluştur
            // MIME Type belirtmek önemlidir. backend'in işleyebileceği formatlar denenmeli.
            // audio/webm (Opus veya Vorbis codec ile) tarayıcılarda yaygındır.
            // backend'deki pydub/FFmpeg kurulumu bunu işleyebilmeli.
            const preferredMimeType = 'audio/webm; codecs=opus';
            const fallbackMimeType = 'audio/webm'; // Opus codec desteklenmiyorsa
            let options = {};

            if (MediaRecorder.isTypeSupported(preferredMimeType)) {
                 options = { mimeType: preferredMimeType };
                 console.log(`Using preferred MIME type: ${preferredMimeType}`);
             } else if (MediaRecorder.isTypeSupported(fallbackMimeType)) {
                 options = { mimeType: fallbackMimeType };
                 console.warn(`Preferred MIME type ${preferredMimeType} not supported, using fallback: ${fallbackMimeType}`);
             } else {
                 console.warn("Neither preferred nor fallback MIME types supported, using browser default.");
                 // Tarayıcının varsayılanını kullanacak, umarız backend bunu işleyebilir
             }
             mediaRecorder = new MediaRecorder(audioStream, options);


            // Kayıt başladığında
            mediaRecorder.onstart = () => {
                console.log("Recording started.");
                setAudioButtonStates(true, false, false); // Durum: Kaydediyor, durmadı, kaydedilecek/iptal edilecek bir şey yok
                recordingStatusSpan.textContent = 'Kaydediliyor...';
            };

            // Veri geldiğinde (kayıt sırasında)
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                    console.debug("Audio chunk received, size:", event.data.size);
                }
            };

            // Kayıt durduğunda
            mediaRecorder.onstop = () => {
                console.log("Recording stopped.");
                // Stream'i durdur, artık mikrofona ihtiyacımız yok
                 audioStream.getTracks().forEach(track => {
                     if (track.readyState === 'live') {
                         track.stop();
                     }
                 });
                 audioStream = null;


                if (audioChunks.length === 0) {
                     console.warn("No audio data recorded.");
                     resetAudioState(); // Hiç veri yoksa başa dön
                     alert("Ses kaydı alınamadı. Lütfen mikrofonunuzu kontrol edin veya tarayıcı ayarlarını kontrol edin.");
                     return;
                }
                // Kaydedilen parçalardan bir Blob oluştur
                // Blob type olarak ilk chunk'ın type'ını kullanmak genellikle en güvenlisidir.
                audioBlob = new Blob(audioChunks, { type: audioChunks[0].type });
                 audioChunks = []; // Parçaları temizle
                console.log("Audio Blob created, size:", audioBlob.size, "type:", audioBlob.type);

                // Blob'dan bir URL oluştur ve oynatıcıya ata
                audioUrl = URL.createObjectURL(audioBlob);
                if (audioPlayback) {
                    audioPlayback.src = audioUrl;
                    audioPlayback.setAttribute('controls', ''); // Controls'u ekle
                }
                console.log("Audio URL created:", audioUrl);

                setAudioButtonStates(false, true, true); // Durum: Kaydetmiyor, durdu, kaydedilebilir/iptal edilebilir
                recordingStatusSpan.textContent = 'Hazır.';
            };

             // Hata durumunda
             mediaRecorder.onerror = (event) => {
                console.error("MediaRecorder error:", event.error);
                alert(`Ses kaydı sırasında bir hata oluştu: ${event.error.message || event.error}`);
                resetAudioState();
            };

            // Kaydı başlat
            mediaRecorder.start();

        } catch (error) {
            console.error("Error starting recording:", error);
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError' || error.name === 'SecurityError') {
                alert("Ses kaydı için mikrofon izni vermeniz gerekiyor. Lütfen tarayıcı ayarlarınızı kontrol edin.");
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError'){
                 alert("Kullanılabilir bir mikrofon bulunamadı. Cihazınızın mikrofonunun bağlı olduğundan emin olun.");
            } else if (error.name === 'NotReadableError') {
                 alert("Mikrofona erişilemiyor. Başka bir uygulama kullanıyor olabilir veya sorunlu olabilir.");
            }
            else {
                alert(`Mikrofona erişilemiyor veya kayıt başlatılamadı: ${error.message}`);
            }
            resetAudioState(); // Hata durumunda durumu sıfırla
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            console.log("Stopping recording...");
            mediaRecorder.stop(); // Bu onstop olayını tetikleyecek ve onstop içinde stream durdurulacak
             if (recordingStatusSpan) recordingStatusSpan.textContent = 'İşleniyor...'; // İşleniyor mesajını göster
        } else {
             console.warn("MediaRecorder not found or not recording.");
        }
    }

    // frontend/src/diary.js (Mevcut saveAudio fonksiyonunu bu kod bloğu ile DEĞİŞTİRİN)

const saveAudio = async () => {
    if (!audioBlob || !diaryContentDiv || !saveAudioButton) {
        console.error("No audio Blob to save or editor/button not found.");
        alert("Kaydedilecek ses kaydı bulunamadı veya bir hata oluştu.");
        return;
    }
    console.log("Attempting to save audio (send to backend for transcription and saving)... Blob size:", audioBlob.size, "type:", audioBlob.type);

    // Butonları devre dışı bırak ve durumu göster
    setAudioButtonStates(false, true, false); // Kaydet/İptal pasif
    if (recordingStatusSpan) {
        recordingStatusSpan.style.display = 'inline';
        recordingStatusSpan.textContent = 'Yükleniyor ve Çevriliyor...'; // Yükleniyor mesajı
    }
     // Ses oynatıcıyı ve geçici URL'yi temizle/gizle
    if (audioPlayback) {
         audioPlayback.style.display = 'none';
         audioPlayback.src = '';
         audioPlayback.removeAttribute('controls');
    }
    if (audioPlaybackUrl) {
         URL.revokeObjectURL(audioPlaybackUrl);
         audioPlaybackUrl = null;
    }


    // FormData oluştur ve audio Blob'u ekle
    const formData = new FormData();
    // Blob'a bir dosya adı vermek önemlidir. Backend uzantıyı anlayabilir.
    // Dosya adını frontend tarafında tahmin edelim, backend bunu düzeltebilir.
    let filename = 'recording.wav'; // Default fallback filename
    if (audioBlob.type) {
        const extension = audioBlob.type.split('/')[1].split(';')[0]; // mime/type;codec -> type
        // Basit extension eşleşmeleri, pydub backend'de formatı okumalı
        const knownExtensions = {
             'webm': 'webm', 'ogg': 'ogg', 'wav': 'wav', 'mpeg': 'mp3', 'mp4': 'mp4', 'aac': 'aac'
        };
        filename = `recording.${knownExtensions[extension] || extension}`;
    }
    console.log(`Appending audio blob to FormData. Filename: ${filename}, Type: ${audioBlob.type}`);

    formData.append('audio', audioBlob, filename); // 'audio' key'i backend'de bekleniyor

    try {
        console.log(`Sending audio blob to ${API_TRANSCRIBE_URL}`);
        // apiRequest FormData'yı otomatik handle ediyor (Content-Type set etmiyor)
        const result = await apiRequest(API_TRANSCRIBE_URL, {
            method: 'POST',
            body: formData
        });

        console.log("Transcription and Save Audio result received:", result);

        let transcribedText = result && result.transcribedText ? result.transcribedText.trim() : '';
        let audioUrl = result && result.audioUrl ? result.audioUrl : null; // Backend'den gelen kalıcı URL
        let audioFilename = result && result.audioFilename ? result.audioFilename : 'kayit.wav'; // Backend'den gelen dosya adı
        let message = result && result.message ? result.message : "İşlem tamamlandı.";

         // DİKKAT GÜVENLİK: audioUrl ve audioFilename'ı HTML içine yazdırırken
         // XSS riskine karşı sanitize etmek GEREKİR. encodeURIComponent yeterli olabilir.
         const safeAudioUrl = audioUrl ? encodeURI(audioUrl) : null; // URL'yi güvenli hale getir
         const safeAudioFilename = audioFilename ? encodeURIComponent(audioFilename) : 'kayit.wav'; // Dosya adını güvenli hale getir

        if (safeAudioUrl) {
             // Başarılı çeviri metni veya sadece mesaj
             // Çevrilen metin varsa onu göster, yoksa backend'den gelen mesajı göster (örn: çevrilemedi)
             const textContentHTML = transcribedText ? `<p><strong>Ses Kaydı Çevirisi:</strong> ${transcribedText}</p>` : (message ? `<p><em>${message}</em></p>` : '');

             // Oynatıcı ve İndir linki için HTML oluştur
             // İndirme linkini audio tag'inin hemen altına koyalım
             const audioHtml = `
                <p class="inserted-audio">
                    <audio controls src="${safeAudioUrl}"></audio>
                    <br>
                    <a href="${safeAudioUrl}" download="${safeAudioFilename}" title="Ses Kaydını İndir" class="audio-download-link">
                        <i class="fas fa-download"></i> Sesi İndir
                    </a>
                </p>
                <br> <!-- Sonraki içerikle araya boşluk bırak -->
             `;

             // Mevcut içeriğe ekle
             // DİKKAT: contenteditable'ın innerHTML'ini doğrudan değiştirmek,
             // imleç pozisyonunu ve seçimi kaybetmenize neden olabilir.
             // Daha iyi bir UX için, execCommand('insertHTML') kullanmak veya
             // selection/range objelerini kullanarak içeriği eklemek daha iyidir.
             // Basitlik için şimdilik innerHTML'e ekliyoruz, bu imleci en başa alabilir.
             // Alternatif: diaryContentDiv.innerHTML += textContentHTML + audioHtml;
             // execCommand('insertHTML', false, htmlString) daha iyidir.
             const contentToInsert = textContentHTML + audioHtml; // 'contentTextHTML' yerine 'textContentHTML' kullanıldı
             formatDoc('insertHTML', contentToInsert); // İçeriği imlecin olduğu yere eklemeye çalışır

             console.log("Audio tag and download link added to diary content.");
             alert(message || "Ses kaydı günlüğe başarıyla eklendi.");

              // Metin/ses eklendikten sonra odaklanıp imleci sonuna veya eklenen içeriğin sonuna al
              diaryContentDiv.focus();
              // execCommand('insertHTML') genellikle imleci eklenen içeriğin sonuna taşır,
              // bu nedenle manuel olarak imleci sonuna almaya gerek kalmayabilir.
              // Gerekirse buraya imleci ayarlayan DOM manipulation kodu eklenebilir.

        } else {
             // URL gelmediyse (backend hatası veya dosya kaydedilemedi)
             console.error("Audio URL not received from backend.");
             alert(message || "Ses dosyası kaydedilemedi ve günlüğe eklenemedi.");
        }


    } catch (error) {
         if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) {
            console.error("Audio transcribe/save API error:", error);
            alert(`Ses kaydı işlenirken bir hata oluştu: ${error.message}`);
         }
         // Yetkilendirme hatası apiRequest içinde ele alındı.
    } finally {
        // Ses durumunu sıfırla (başarılı veya hatalı olsa da)
        resetAudioState();
        console.log("Audio save/transcribe process finished, state reset.");
    }
};



    function cancelAudio() {
        console.log("Canceling recorded audio...");
        alert("Ses kaydı iptal edildi.");
        resetAudioState(); // URL'yi iptal et, state'i sıfırla
        console.log("Audio canceled and state reset.");
    }

    // Buton Event Listener'ları
    if (startRecordingButton) startRecordingButton.addEventListener("click", startRecording);
    if (stopRecordingButton) stopRecordingButton.addEventListener("click", stopRecording);
    if (saveAudioButton) saveAudioButton.addEventListener("click", saveAudio);
    if (cancelRecordingButton) cancelRecordingButton.addEventListener("click", cancelAudio);

    // Başlangıçta ses buton durumlarını ayarla
    resetAudioState(); // Sayfa ilk yüklendiğinde durumu sıfırla

    // --- Ses Kaydı İşlevleri Sonu ---


    // --- Günlük Yönetimi (API Entegrasyonu) ---
    function resetEditorForm() {
        if (!diaryTitleInput || !diaryContentDiv || !saveDiaryButton || !sentimentResultDiv || !recommendationDiv || !fontFamilySelect || !fontSizeSelect || !fontColorPicker || !pageColorPicker || !diaryBody) {
            console.error("Editor form elements missing for reset.");
            // Hata olsa bile devam etmeye çalış
        }

        if (diaryTitleInput) diaryTitleInput.value = "";
        if (diaryContentDiv) diaryContentDiv.innerHTML = ""; // İçeriği temizle

        // Rich text stillerini sıfırla (contenteditable div'in kendi stili)
        if (diaryContentDiv) {
             diaryContentDiv.style.fontFamily = ''; // CSS ile ayarlanmışsa bu satır etkisiz olur
             diaryContentDiv.style.fontSize = '';
             diaryContentDiv.style.color = '';
             // Diğer stiller...
        }


        currentlyEditingId = null;

        if (saveDiaryButton) {
            // İkonu koruyarak metni değiştir
            const saveIconHTML = '<i class="fas fa-save"></i> ';
            saveDiaryButton.innerHTML = saveIconHTML + 'Günlüğü Kaydet';
            saveDiaryButton.disabled = false;
        }

        hideModal(); // Açık modal varsa kapat
        resetAudioState(); // Ses kaydı durumunu da sıfırla

        // Yerinde gösterim alanlarını temizle (artık kullanılmayabilir ama temiz tutalım)
        if (sentimentResultDiv) {
            sentimentResultDiv.textContent = '';
            // Sadece JS ile eklenmiş style özelliklerini temizle, CSS sınıflarını koru
            sentimentResultDiv.style.backgroundColor = '';
            sentimentResultDiv.style.color = '';
            sentimentResultDiv.style.border = '';
             sentimentResultDiv.className = 'sentiment-result-inline'; // Temel sınıfı koru
        }
        if (recommendationDiv) {
            recommendationDiv.innerHTML = '';
            recommendationDiv.style.display = 'none';
        }

        // Toolbar'ı sıfırla (opsiyonel)
        if (fontFamilySelect) fontFamilySelect.value = fontFamilySelect.options[0].value;
        if (fontSizeSelect) fontSizeSelect.value = '3'; // Normal boyut (12pt)
        if (fontColorPicker) fontColorPicker.value = '#333333'; // Başlangıç rengi
        if (pageColorPicker && diaryBody) {
             pageColorPicker.value = '#f8f9fa'; // Varsayılan arka plan rengi
             diaryBody.style.backgroundColor = '#f8f9fa';
        }


        console.log("Editor form reset.");
    }

    const saveOrUpdateDiary = async () => {
        if (!diaryTitleInput || !diaryContentDiv || !saveDiaryButton) {
             console.error("Editor elements missing for save/update.");
             alert("Günlük kaydedilirken bir sorun oluştu.");
             return;
        }

        const title = diaryTitleInput.value.trim();
        // DİKKAT: Güvenlik Riski! contenteditable'dan alınan HTML doğrudan alınıyor.
        // XSS saldırılarına karşı sanitize edilmesi GEREKİR. DOMPurify önerilir.
        let contentHTML = diaryContentDiv.innerHTML.trim();


        // Boş içerik kontrolü: Sadece boş etiketler veya boşluklar varsa
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentHTML;
        // Metin içeriği boşsa VE resim/audio/video gibi embed içerik yoksa boş say
        const isEmpty = !tempDiv.textContent.trim() && !tempDiv.querySelector('img') && !tempDiv.querySelector('audio') && !tempDiv.querySelector('video');


        if (isEmpty) {
            alert("Lütfen içerik alanına bir şeyler yazın veya ekleyin!");
            return;
        }
        if (title === "") {
            alert("Lütfen bir başlık girin!");
            diaryTitleInput.focus();
            return;
        }

        // Buton durumunu ayarla
        saveDiaryButton.disabled = true;
        const updating = currentlyEditingId !== null;
        const buttonText = updating ? 'Güncelleniyor...' : 'Kaydediliyor...';
        const iconHTML = updating ? '<i class="fas fa-sync-alt fa-spin"></i> ' : '<i class="fas fa-spinner fa-spin"></i> ';
        saveDiaryButton.innerHTML = iconHTML + buttonText;


        // DİKKAT: Blob URL'leri ('blob:http://...') geçicidir ve veritabanına kaydedilemez.
        // Sayfa yenilendiğinde çalışmazlar.
        // Kalıcı çözüm için dosya yükleme endpoint'i ve kalıcı URL'ler GEREKİR.
        // Şu anki implementasyon sadece demo amaçlıdır.

        const diaryData = {
            baslik: title,
            dusunce: contentHTML // Blob URL'leri içeren HTML veya Rich Text
        };

        try {
            let successMessage = '';
            // API'den dönen yeni/güncellenmiş entry objesi (isteğe bağlı)
            let responseData;

            if (updating) {
                console.log(`Updating diary entry ${currentlyEditingId}...`);
                // Backend PUT endpoint'i 200 OK ve güncellenmiş objeyi dönebilir
                 responseData = await apiRequest(`${API_DIARY_URL}/${currentlyEditingId}`, { method: 'PUT', body: JSON.stringify(diaryData) });
                successMessage = 'Günlük başarıyla güncellendi!';
            } else {
                console.log("Saving new diary entry...");
                // Backend POST endpoint'i genellikle 201 Created ve yeni objeyi döner
                responseData = await apiRequest(API_DIARY_URL, { method: 'POST', body: JSON.stringify(diaryData) });
                successMessage = 'Günlük başarıyla kaydedildi!';
            }
            alert(successMessage);
            resetEditorForm();
            await loadDiaryEntries(); // Listeyi yenile (Daha sağlam bir yaklaşım)

        } catch (error) {
             // Unauthorized hatası zaten apiRequest içinde ele alınıyor
            if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) {
                console.error("Diary save/update API error:", error);
                alert(`Günlük kaydedilemedi/güncellenemedi: ${error.message}`);
                 // Butonu eski haline getir
                 saveDiaryButton.disabled = false;
                 const saveIconHTML = '<i class="fas fa-save"></i> ';
                 saveDiaryButton.innerHTML = saveIconHTML + (updating ? 'Günlüğü Güncelle' : 'Günlüğü Kaydet');
            }
            // Yetkilendirme hatası durumunda buton zaten etkin kalmamalı, sayfa yönlendirilecek.
        }
    };
    if (saveDiaryButton) saveDiaryButton.addEventListener('click', saveOrUpdateDiary);

    const loadDiaryEntries = async () => {
        if (!diaryEntriesList) return;
        console.log(`Loading diary entries via GET ${API_DIARY_URL}`);
        // Daha iyi bir yükleniyor göstergesi
        diaryEntriesList.innerHTML = `<li class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Günlükler yükleniyor...</li>`;

        try {
            const entriesFromApi = await apiRequest(API_DIARY_URL);
             // API'den dönen veri Array değilse veya null/undefined ise boş dizi kullan
            diaryEntries = Array.isArray(entriesFromApi) ? entriesFromApi : [];

            if (!Array.isArray(diaryEntries)) {
                console.warn("API did not return a valid array for diary entries. Received:", entriesFromApi);
                diaryEntries = []; // Boş diziye ayarla
            }
            renderDiaryEntries();
            console.log("Diary entries loaded and rendered:", diaryEntries.length);
        } catch (error) {
            // Unauthorized hatası apiRequest içinde ele alındı
            if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) {
                console.error("Failed to load diary entries:", error);
                diaryEntriesList.innerHTML = `<li class="error-placeholder"><i class="fas fa-exclamation-triangle"></i> Günlükler yüklenemedi: ${error.message}</li>`;
            } else {
                // Yetkilendirme hatasıysa placeholder gösterilebilir
                diaryEntriesList.innerHTML = `<li class="error-placeholder"><i class="fas fa-lock"></i> Günlükleri görmek için lütfen giriş yapın.</li>`;
            }
        }
    };

    function renderDiaryEntries() {
        if (!diaryEntriesList) {
            console.error("Diary entries list element not found for rendering.");
            return;
        }
        diaryEntriesList.innerHTML = ""; // Önce temizle

        if (!Array.isArray(diaryEntries) || diaryEntries.length === 0) {
            diaryEntriesList.innerHTML = `<li class="no-entries-placeholder"><i class="fas fa-book-reader placeholder-icon"></i>Henüz günlük eklenmedi.</li>`;
            return;
        }

        try {
            // En yeniden en eskiye doğru sırala (lastModifiedAt veya createdAt'e göre)
            diaryEntries.sort((a, b) => {
                const dateA = new Date(a.lastModifiedAt || a.createdAt);
                const dateB = new Date(b.lastModifiedAt || b.createdAt);
                return dateB - dateA; // Sondan başa sıralama
            });


            diaryEntries.forEach((entry) => {
                if (!entry || typeof entry.id === 'undefined' || entry.id === null) {
                    console.warn("Skipping invalid or null entry ID:", entry);
                    return;
                }

                const listItem = document.createElement("li");
                listItem.dataset.entryId = entry.id;

                // Aksiyon Butonları (Sağ Üst)
                const actionsContainer = document.createElement("div");
                actionsContainer.classList.add("entry-actions");

                const editButton = document.createElement("button");
                editButton.innerHTML = '<i class="fas fa-edit"></i>';
                editButton.classList.add("entry-action-button", "edit-button");
                editButton.title = 'Düzenle';
                editButton.setAttribute('aria-label', `Günlüğü Düzenle: ${entry.baslik || 'Başlıksız'}`);
                editButton.addEventListener("click", (e) => {
                    e.stopPropagation(); // li'ye tıklama olayını engelle
                    editDiaryEntry(entry.id);
                });

                const deleteButton = document.createElement("button");
                deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteButton.classList.add("entry-action-button", "delete-button");
                deleteButton.title = 'Sil';
                 deleteButton.setAttribute('aria-label', `Günlüğü Sil: ${entry.baslik || 'Başlıksız'}`);
                deleteButton.addEventListener("click", (e) => {
                    e.stopPropagation(); // li'ye tıklama olayını engelle
                    deleteDiaryEntry(entry.id);
                });

                actionsContainer.appendChild(editButton);
                actionsContainer.appendChild(deleteButton);
                listItem.appendChild(actionsContainer);

                // Başlık ve Duygu Rozeti
                const entryTitle = document.createElement("div");
                entryTitle.classList.add("entry-title");
                entryTitle.textContent = entry.baslik || '(Başlık Yok)'; // Sadece metin

                if (entry.sentimentLabel && entry.sentimentLabel !== 'bilinmiyor') {
                    const sentimentBadge = document.createElement('span');
                    const labelText = entry.sentimentLabel.charAt(0).toUpperCase() + entry.sentimentLabel.slice(1);
                    sentimentBadge.textContent = labelText;
                    sentimentBadge.style.display = 'inline-block';
                    sentimentBadge.classList.add('sentiment-badge'); // CSS ile stil vermek için sınıf

                    let bgColor, textColor, titleText;
                    switch (entry.sentimentLabel.toLowerCase()) {
                        case 'pozitif': bgColor = '#d4edda'; textColor = '#155724'; titleText = 'Pozitif Duygu'; break;
                        case 'negatif': bgColor = '#f8d7da'; textColor = '#721c24'; titleText = 'Negatif Duygu'; break;
                        case 'nötr':    bgColor = '#fff3cd'; textColor = '#856404'; titleText = 'Nötr Duygu'; break;
                        default:        bgColor = '#e2e3e5'; textColor = '#383d41'; titleText = 'Duygu Belirlenemedi'; sentimentBadge.textContent = '?';
                    }
                    sentimentBadge.style.backgroundColor = bgColor;
                    sentimentBadge.style.color = textColor;
                    sentimentBadge.style.border = `1px solid ${bgColor}`; // Hafif border
                    sentimentBadge.title = titleText;
                    entryTitle.appendChild(sentimentBadge);
                }
                listItem.appendChild(entryTitle);

                // İçerik (Kısa Önizleme)
                const entryContent = document.createElement("div");
                entryContent.classList.add("entry-content");
                // DİKKAT: Güvenlik Riski! API'den gelen HTML'i doğrudan innerHTML'e atamak XSS riski taşır.
                // Gerçek uygulamada sanitize edilmesi GEREKİR. (örn: DOMPurify kütüphanesi)
                entryContent.innerHTML = entry.dusunce || '(İçerik Yok)';
                 // Çok uzunsa içeriği kısaltmak için CSS kullanılıyor (max-height, overflow)
                 // Eğer metinsel önizleme istenirse textContent alınıp kısaltılır.

                listItem.appendChild(entryContent);

                // Tarih Bilgisi
                const entryDate = document.createElement("small");
                let createdText = '?';
                let modifiedText = '';
                try {
                    if (entry.createdAt) {
                        // ISO string'i Date objesine çevirirken timezone sorunları olabilir
                        // Daha güvenli bir yöntem: new Date(entry.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
                         const createdDate = new Date(entry.createdAt);
                         createdText = `Oluşturuldu: ${createdDate.toLocaleDateString('tr-TR', {year: 'numeric', month: 'short', day: 'numeric'})} ${createdDate.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}`;
                    }
                    if (entry.lastModifiedAt && entry.lastModifiedAt !== entry.createdAt) {
                         const modifiedDate = new Date(entry.lastModifiedAt);
                         modifiedText = ` | Düzenlendi: ${modifiedDate.toLocaleDateString('tr-TR', {year: 'numeric', month: 'short', day: 'numeric'})} ${modifiedDate.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}`;
                    }
                } catch (e) {
                    console.warn("Date parse/format error:", e);
                    createdText = `Oluşturuldu: ${entry.createdAt || '?'}`;
                    modifiedText = entry.lastModifiedAt ? ` | Düzenlendi: ${entry.lastModifiedAt}` : '';
                }
                entryDate.textContent = createdText + modifiedText;
                listItem.appendChild(entryDate);

                // Listeye ekle
                diaryEntriesList.appendChild(listItem);
            });
        } catch (renderError) {
            console.error("Render error:", renderError);
            diaryEntriesList.innerHTML = `<li class="error-placeholder"><i class="fas fa-exclamation-circle"></i> Liste oluşturulurken hata: ${renderError.message}</li>`;
        }
    }

    /** Düzenleme modunu başlatır, formu doldurur. */
    function editDiaryEntry(id) {
        const entryToEdit = diaryEntries.find((entry) => entry.id === id);
         if (!entryToEdit || !diaryTitleInput || !diaryContentDiv || !saveDiaryButton) {
             console.error("Edit entry not found or editor elements missing:", id);
             alert("Düzenlenecek günlük bulunamadı veya düzenleyici yüklenemedi.");
             return;
         }
        console.log(`Editing diary entry: ${id}`);

        // Formu sıfırla (mevcut düzenlemeyi iptal eder)
        resetEditorForm(); // Bu, currentlyEditingId'yi null yapar

        diaryTitleInput.value = entryToEdit.baslik || '';
        // DİKKAT: Güvenlik! API'den gelen HTML'i doğrudan innerHTML'e atamak XSS riski taşır.
        // Gerçek uygulamada sanitize edilmesi GEREKİR. (örn: DOMPurify kütüphanesi)
        diaryContentDiv.innerHTML = entryToEdit.dusunce || '';
        currentlyEditingId = id; // Şimdi düzenlenen ID'yi tekrar set et


        // Kaydet butonunu güncelle
        const saveIconHTML = '<i class="fas fa-save"></i> ';
        saveDiaryButton.innerHTML = saveIconHTML + 'Günlüğü Güncelle';
        saveDiaryButton.disabled = false;

        hideModal(); // Varsa modalı kapat
        resetAudioState(); // Düzenlemeye başlarken ses durumunu sıfırla

        // Varsa yerinde gösterim alanlarını temizle (artık modal kullanılıyor)
        if (sentimentResultDiv) sentimentResultDiv.textContent = '';
        if (recommendationDiv) recommendationDiv.style.display = 'none';


        // Sayfanın başına kaydır ve başlığa odaklan
        window.scrollTo({ top: 0, behavior: 'smooth' });
        diaryTitleInput.focus();
    }

    /** Seçilen günlüğü API üzerinden siler. */
    const deleteDiaryEntry = async (id) => {
        if (!confirm("Bu günlüğü kalıcı olarak silmek istediğinizden emin misiniz?\nBu işlem geri alınamaz.")) {
            return;
        }
        console.log(`Attempting to delete diary entry: ${id}`);

        // Silme butonunu geçici olarak devre dışı bırak (görsel geri bildirim)
        const listItem = diaryEntriesList?.querySelector(`li[data-entry-id="${id}"]`);
        const deleteButton = listItem?.querySelector('.delete-button');
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Yükleniyor ikonu
        }
         if (listItem) {
             listItem.style.opacity = '0.5'; // Silindiğini belirtmek için soluklaştır
         }


        try {
            await apiRequest(`${API_DIARY_URL}/${id}`, { method: 'DELETE' });
            alert("Günlük başarıyla silindi.");

            // Eğer silinen günlük düzenleniyorsa, formu sıfırla
            if (currentlyEditingId === id) {
                resetEditorForm();
            }
            // Listeyi API'den yeniden yüklemek yerine yerel diziden çıkarabiliriz (daha hızlı)
            diaryEntries = diaryEntries.filter(entry => entry.id !== id);
            renderDiaryEntries(); // Listeyi yeniden çiz
            // Veya API'den yükle: await loadDiaryEntries();

        } catch (error) {
            if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) {
                 console.error("Diary delete API error:", error);
                 alert(`Günlük silinemedi: ${error.message}`);
                 // Hata durumunda butonu ve görünümü eski haline getir
                 if (deleteButton) {
                     deleteButton.disabled = false;
                     deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                 }
                 if (listItem) {
                    listItem.style.opacity = '1';
                 }
            }
            // Yetkilendirme hatası zaten apiRequest'te ele alınıyor.
        }
    };

    // --- Analiz Et Butonu İşlevi (Modal Kullanımı) ---
    // Bu fonksiyon mevcut HTML içeriğini alıp analiz endpoint'ine gönderir.
    // Ses kaydı çevirisinden gelen metin, saveAudio fonksiyonu tarafından HTML içeriğine eklenir,
    // bu nedenle bu fonksiyon o metni de otomatik olarak analiz edecektir.
    if (analyzeSentimentButton && analysisModal) { // Gerekli ana elementler var mı?
        analyzeSentimentButton.addEventListener('click', async () => {
            console.log("Analyze button clicked!");
            // Analiz için sadece metin içeriğini al
            const currentContentText = diaryContentDiv.innerText.trim();

            if (!currentContentText) {
                alert("Analiz etmek için lütfen önce bir şeyler yazın.");
                return;
            }

            showModal(); // Modal'ı göster (içinde loading durumu ayarlanıyor)
            analyzeSentimentButton.disabled = true;
            analyzeSentimentButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analiz Ediliyor...';

            try {
                console.log(`Sending text to analyze-and-plan (${currentContentText.length} chars)...`);
                const result = await apiRequest(API_ANALYZE_PLAN_URL, {
                    method: 'POST',
                    body: JSON.stringify({ text: currentContentText })
                });
                console.log("Analysis and Plan result received:", result);

                if (result && result.sentimentLabel && typeof result.plan !== 'undefined') {
                     // Duygu sonucunu modal içinde göster
                    modalSentimentResult.textContent = `Tespit Edilen Duygu: ${result.sentimentLabel.charAt(0).toUpperCase() + result.sentimentLabel.slice(1)}`;
                    // Sınıf ekleyerek CSS ile renklendirelim
                    modalSentimentResult.className = 'modal-sentiment-display ' + result.sentimentLabel.toLowerCase(); // örn: 'modal-sentiment-display pozitif'


                    // Planı modal içinde göster
                    // Metin içindeki \n karakterlerini <br> ile değiştirerek yeni satırları koru
                    modalPlanContent.innerHTML = result.plan.replace(/\n/g, '<br>') || '<em>Yapay zeka bir plan oluşturamadı veya gerekli görülmedi.</em>';

                    // Sonuçları göster, yükleniyor ve hata div'lerini gizle
                    modalLoading.style.display = 'none';
                    modalResults.style.display = 'block';
                    modalError.style.display = 'none';

                } else {
                    // API'den beklenen formatta yanıt gelmediyse
                    throw new Error("API'den geçersiz veya eksik yanıt alındı.");
                }
            } catch (error) {
                 if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) {
                    console.error("Analyze/Plan API error:", error);
                    // Hata mesajını modal içinde göster
                    modalError.textContent = `Analiz sırasında bir hata oluştu: ${error.message}`;
                    modalError.className = 'modal-error-display'; // Hata stili
                    modalLoading.style.display = 'none';
                    modalResults.style.display = 'none';
                    modalError.style.display = 'block'; // Hata mesajını göster
                 }
                  // Yetkilendirme hatasıysa modal zaten kapanacak/kullanıcı yönlendirilecek.
            } finally {
                // Butonu tekrar aktif et ve eski haline getir
                analyzeSentimentButton.disabled = false;
                analyzeSentimentButton.innerHTML = '<i class="fas fa-brain"></i> Analiz Et';
            }
        });
    } else {
        console.error("Analyze button or Modal elements could not be found!");
        // Buton bulunamıyorsa gizle (HTML veya JS hatası durumunda)
        if(analyzeSentimentButton) analyzeSentimentButton.style.display = 'none';
    }
    // --- Analiz Butonu Sonu ---

    // --- Başlangıç ---
    const initialUserId = getUserId(); // Sayfa yüklenirken ID kontrolü
    if (initialUserId) {
        loadDiaryEntries(); // Kullanıcı varsa günlükleri yükle
         // Sayfa rengi picker'ı da başlangıçta ayarla
         if (pageColorPicker && diaryBody) {
             const computedBg = getComputedStyle(diaryBody).backgroundColor;
              if (computedBg && computedBg !== 'rgba(0, 0, 0, 0)') {
                   const rgbMatch = computedBg.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
                   if (rgbMatch) {
                        const toHex = (c) => parseInt(c).toString(16).padStart(2, '0');
                        pageColorPicker.value = `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
                   }
              }
         }
    } else {
        // Kullanıcı yoksa (getUserId yönlendirme yapmış olmalı veya ana sayfadan geldi)
        console.log("User not logged in, diary entries will not be loaded.");
        if (diaryEntriesList) {
            diaryEntriesList.innerHTML = `<li class="no-entries-placeholder"><i class="fas fa-lock placeholder-icon"></i>Günlükleri görmek için lütfen giriş yapın.</li>`;
        }
        // Giriş yapılmamışsa bazı form elementlerini devre dışı bırakmak iyi olabilir
        if (diaryTitleInput) diaryTitleInput.disabled = true;
        if (diaryContentDiv) {
             diaryContentDiv.contentEditable = 'false';
             diaryContentDiv.textContent = "Günlük yazmak için lütfen giriş yapın.";
             diaryContentDiv.style.color = '#6c757d';
             diaryContentDiv.style.backgroundColor = '#e9ecef';
        }
        if (saveDiaryButton) saveDiaryButton.disabled = true;
        if (analyzeSentimentButton) analyzeSentimentButton.disabled = true;
        // Ses kaydı butonları zaten resetAudioState ile pasif
        // Toolbar butonlarını da devre dışı bırak
         if (fontFamilySelect) fontFamilySelect.disabled = true;
         if (fontSizeSelect) fontSizeSelect.disabled = true;
         if (fontColorPicker) fontColorPicker.disabled = true;
         if (pageColorPicker) pageColorPicker.disabled = true;
         if (toolbarButtons) toolbarButtons.forEach(button => button.disabled = true);

    }

}); // DOMContentLoaded Sonu