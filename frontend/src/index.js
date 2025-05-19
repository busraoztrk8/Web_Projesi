/* ../src/index.js (Tam ve Güncel Versiyon) */
/**
 * Initializes the application logic when the DOM is fully loaded.
 * Handles theme, background color (body & header), header interactions,
 * and initializes page-specific components like planner or slideshow if present.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log(`index.js: Initializing for page: ${window.location.pathname}`);

    // --- CORE DOM Element Selection ---
    const body = document.body;
    const root = document.documentElement; // CSS değişkenlerine erişmek için
    const themeToggleButton = document.getElementById('theme-toggle');
    const logoutButton = document.getElementById('logout-button');
    const profileIcon = document.getElementById('user-profile');
    const navLinks = document.querySelectorAll('.nav-link');
    const usernameSpan = document.getElementById('username');
    const headerElement = document.getElementById('main-header'); // Header Elementi

    // --- Arka Plan Renk Seçici Elementleri ---
    const bgColorPickerToggle = document.getElementById('bg-color-picker-toggle');
    const bgColorPickerPopover = document.getElementById('bg-color-picker-popover');
    const customBgColorInput = document.getElementById('custom-bg-color-input');
    const resetBgColorButton = document.getElementById('reset-bg-color-button');

    // --- Duygu İstatistikleri Chart Elementleri ---
    const moodStatsSection = document.getElementById('mood-stats-section');
    const sentimentChartCanvas = document.getElementById('sentiment-chart');
    const sentimentChartPlaceholder = document.getElementById('sentiment-chart-placeholder');
    const sentimentChartPlaceholderText = document.getElementById('sentiment-chart-placeholder-text');
    // Duygu Periyodu Başlığı ve Ok Elementleri
    const sentimentPeriodTitleSpan = document.getElementById('sentiment-period-title');
    const sentimentPeriodToggleArrow = document.getElementById('sentiment-period-toggle-arrow');


    // --- Constants ---
    const DEFAULT_LIGHT_BG = '#f8f9fa';
    const DEFAULT_DARK_BG = '#121212';
    const API_REMINDERS_URL = '/api/reminders';
    const API_SENTIMENT_STATS_URL = '/api/diary/sentiment-stats';


    // --- State Variables ---
    let slideshowIntervalId = null;
    let sentimentChartInstance = null; // Chart instance'ını tutmak için
    // Mevcut duygu periyodu durumu
    let currentSentimentPeriod = 'weekly'; // Başlangıçta haftalık


    // --- Kullanıcı Kimliği Yardımcısı ---
    const getUserId = () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId || isNaN(parseInt(userId))) {
                 console.warn("User ID not found or invalid in localStorage. User likely not logged in.");
                 // Kullanıcı kimliği yoksa null döndür, API istekleri bunu ele alacak
                 return null;
            }
            return parseInt(userId);
        } catch (e) {
             console.error("Error getting User ID from localStorage:", e);
             return null;
        }
    };

    // --- API İstek Yardımcısı ---
    const apiRequest = async (url, options = {}) => {
        const userId = getUserId();
        // Kimlik doğrulama gerektiren istekler için User ID yoksa hata fırlat
        // Opsiyonel: Eğer istek kimlik doğrulama gerektirmiyorsa (örn: public bir endpoint),
        // bu check'i isteğe bağlı yapabilirsiniz. Mevcut endpoint'ler gerektiriyor.
        if (!userId) {
             // getUserId zaten uyarıyı logluyor
             return Promise.reject(new Error("Kimlik doğrulama gerekli. Lütfen tekrar giriş yapın."));
        }

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'X-User-ID': userId // Kullanıcı ID'sini her isteğe ekle
        };
        const headers = { ...defaultHeaders, ...(options.headers || {}) };

        try {
            const response = await fetch(url, { ...options, headers });

            // 401 Unauthorized durumunu yakala ve yönlendir
            if (response.status === 401) {
                localStorage.removeItem('userId');
                localStorage.removeItem('username'); // Varsa
                console.error("API Request Unauthorized (401). Redirecting to login.");
                alert("Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.");
                // Yönlendirmeyi Flask'ın login sunduğu adrese yapıyoruz
                window.location.href = '/public/login.html';
                // Promise'i reddet ki çağıran fonksiyon hata durumunu bilsin
                return Promise.reject(new Error("Unauthorized (401)"));
            }

            // 204 No Content durumunu yakala (Genellikle DELETE/PUT başarıları)
            if (response.status === 204 && (options.method === 'DELETE' || options.method === 'PUT')) {
                 console.log(`API Request ${options.method} ${url} successful (204 No Content)`);
                 return {}; // Başarılı ama yanıt gövdesi yok
            }

            const contentType = response.headers.get("content-type");
            const contentLength = response.headers.get("content-length");

            // Başarılı olmayan yanıtları (ör: 400, 404, 500) hata olarak işle
            if (!response.ok) {
                let errorData = { message: `Sunucu hatası: ${response.status}` };
                try {
                    // Yanıt JSON ise hata mesajını parse et
                     if (contentType && contentType.includes("application/json")) {
                        errorData = await response.json();
                    } else {
                         // JSON değilse veya boşsa, status metnini veya varsayılanı kullan
                         const errorText = await response.text();
                         errorData.message = errorText || errorData.message;
                    }
                } catch (e) {
                    // JSON parse edilemezse
                    console.warn(`Could not parse error response body for ${url}:`, e);
                }
                 console.error(`API Request Failed: ${options.method || 'GET'} ${url} - Status: ${response.status}`, errorData);
                throw new Error(errorData.message || `API hatası: ${response.status}`);
            }

             // Başarılı ancak JSON olmayan yanıtları veya boş yanıtları işle
             // Duygu istatistikleri endpoint'i genellikle {} döner, liste endpoint'i [] döner.
            if (contentLength === '0' || !contentType || !contentType.includes("application/json")) {
                 console.log(`API Request ${options.method || 'GET'} ${url} successful (No Content or Not JSON)`);
                 // Hangi endpoint'in çağrıldığına göre varsayılan dönüş tipi belirleyebiliriz.
                 // Veya sadece boş obje döndürebiliriz, çağıran fonksiyonun gelen veriyi kontrol etmesi beklenir.
                 // Sentiment stats {} dönecek, boş liste [] dönecek.
                 if (url.includes(API_SENTIMENT_STATS_URL)) return {}; // Sentiment stats için boş obje
                 if (url.includes(API_REMINDERS_URL)) return []; // Reminder list için boş dizi
                 if (url.includes(API_DIARY_URL)) return []; // Diary list için boş dizi
                 return {}; // Varsayılan boş obje
            }


            // Başarılı JSON yanıtını döndür
            const data = await response.json();
            console.log(`API Request ${options.method || 'GET'} ${url} successful.`);
            return data;

        } catch (error) {
            // 'Unauthorized' hatası apiRequest içinde zaten özel olarak ele alınıyor ve yönlendirme yapılıyor
            // Diğer yakalanan hatalar (ağ hatası, fetch hatası vb.)
            if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) {
                 console.error(`API Request Failed (Catch): ${options.method || 'GET'} ${url}`, error);
                 // Kullanıcıya genel bir hata mesajı gösterilebilir ama genellikle UI elementi güncellemek yeterli
            }
            throw error; // Hatanın yukarıya iletilmesi için tekrar fırlat
        }
    };


    // --- Core Function Definitions ---

    /** Initialize Theme */
    const initializeTheme = () => {
        const themeIcon = themeToggleButton?.querySelector('i');
        const savedTheme = localStorage.getItem('theme');
        const currentTheme = savedTheme || 'light'; // Varsayılan açık tema

        body.classList.toggle('dark-theme', currentTheme === 'dark');
        if (themeIcon) {
            themeIcon.className = `fas ${currentTheme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
        }
        // Eğer local storage boşsa, varsayılanı kaydet
        if (!savedTheme) {
            localStorage.setItem('theme', currentTheme);
        }
        console.log("Theme initialized:", currentTheme);
        return currentTheme;
    };

    /**
     * Applies a custom background color to the body AND header, saves it.
     * @param {string} hexColor - The hex color code.
     */
    const applyCustomBackgroundColor = (hexColor) => {
        // Geçerli bir hex kodu mu kontrol et
        if (!hexColor || !/^#[0-9A-F]{6}([0-9A-F]{2})?$/i.test(hexColor)) {
            console.warn("Invalid hex color passed to applyCustomBackgroundColor:", hexColor);
            return;
        }
        // Body için CSS değişkenini ayarla
        root.style.setProperty('--background-color', hexColor);
        body.classList.add('custom-background-active'); // Özel renk aktif class'ı

        // Header varsa, doğrudan stil ata
        if (headerElement) {
            headerElement.style.backgroundColor = hexColor;
            // console.log("Applied custom color to header:", hexColor); // Çok fazla log üretebilir
        } else {
             // Header yoksa (beklenmedik durum), uyar
             console.warn("Header element (#main-header) not found for custom color application.");
        }
        // Renk input'unu senkronize et
        if (customBgColorInput) customBgColorInput.value = hexColor;
        // LocalStorage'a kaydet
        try {
            localStorage.setItem('customBackgroundColor', hexColor);
        } catch (e) { console.error("LocalStorage Error (Saving BG Color):", e); }
    };

    /**
     * Resets the background color (body & header) to the theme's default.
     * @param {string} currentTheme - 'light' or 'dark'.
     */
    const resetCustomBackgroundOnly = (currentTheme) => {
        // Body için inline değişkeni kaldır
        root.style.removeProperty('--background-color');
        body.classList.remove('custom-background-active');

        // Header için inline stili kaldır (CSS'teki tema rengi devreye girer)
        if (headerElement) {
            headerElement.style.removeProperty('background-color');
            // console.log("Removed inline background color from header."); // Log gereksiz olabilir
        }
        // Renk input'unu temanın varsayılanına ayarla
        if (customBgColorInput) {
            customBgColorInput.value = (currentTheme === 'dark') ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG;
        }
        // LocalStorage'dan sil
        try {
            localStorage.removeItem('customBackgroundColor');
        } catch (e) { console.error("LocalStorage Error (Removing BG Color):", e); }
        console.log("Custom background reset for theme:", currentTheme);
    };

    /**
     * Loads the saved custom background color on page load for body & header.
     */
    const loadCustomBackgroundColor = () => {
        try {
            const savedBgColor = localStorage.getItem('customBackgroundColor');
            if (savedBgColor) {
                // applyCustomBackgroundColor hem body hem header'ı ayarlar
                applyCustomBackgroundColor(savedBgColor);
                console.log("Loaded custom background color:", savedBgColor);
            } else if (customBgColorInput) {
                // Kayıtlı özel renk yoksa, input'u mevcut temanın rengine ayarla
                const currentThemeIsDark = body.classList.contains('dark-theme');
                customBgColorInput.value = currentThemeIsDark ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG;
            }
        } catch (e) { console.error("LocalStorage Error (Loading BG Color):", e); }
    };

    /** Toggle Theme */
    const handleThemeToggle = () => {
        const themeIcon = themeToggleButton?.querySelector('i');
        if (!themeToggleButton || !themeIcon) return; // Elementler yoksa çık

        const isDarkMode = body.classList.toggle('dark-theme');
        const newTheme = isDarkMode ? 'dark' : 'light';

        // İkonu güncelle
        themeIcon.className = `fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`;
        // Seçimi kaydet
        localStorage.setItem('theme', newTheme);

        // Özel renk seçiliyse onu kaldırıp tema rengine dön
        resetCustomBackgroundOnly(newTheme);

        // Chart varsa, tema değişiminde renkleri güncelle
        if (sentimentChartInstance) {
             updateSentimentChartColors(sentimentChartInstance, newTheme);
        }
        console.log("Theme toggled to:", newTheme);
    };

    /** Chart Renklerini Temaya Göre Güncelleme */
    const updateSentimentChartColors = (chartInstance, theme) => {
        const colors = getSentimentColors(theme);
        const dataset = chartInstance.data.datasets[0];

        // Mevcut etiketlere göre renkleri eşle
        const newBackgroundColors = chartInstance.data.labels.map(label => {
            const originalLabel = label.toLowerCase(); // 'Pozitif' -> 'pozitif'
            switch(originalLabel) {
                case 'pozitif': return colors.positive;
                case 'negatif': return colors.negative;
                case 'nötr': return colors.neutral;
                case 'bilinmiyor': return colors.unknown;
                default: return colors.unknown; // Beklenmeyen etiketler için default renk
            }
        });

        dataset.backgroundColor = newBackgroundColors;
        dataset.borderColor = newBackgroundColors.map(color => lightenDarkenColor(color, -15)); // Borderları biraz daha koyu yap
        dataset.hoverBackgroundColor = newBackgroundColors.map(color => lightenDarkenColor(color, -20));
        // hoverBorderColor statik beyaz/koyu olabilir veya lighten/darken ile hesaplanabilir.
        // Önceki CSS'de beyazdı, temaya duyarlı yapalım.
         dataset.hoverBorderColor = (theme === 'dark') ? lightenDarkenColor('#ffffff', -50) : '#ffffff'; // Koyu temada gri, açık temada beyaz

        // Tooltip renklerini güncelle
        if (chartInstance.options.plugins.tooltip) {
             const tooltipColors = (theme === 'dark') ? {
                 bg: 'rgba(255, 255, 255, 0.9)', // Biraz daha opak beyaz
                 title: '#111',
                 body: '#333',
                 border: '#555'
            } : {
                 bg: 'rgba(0, 0, 0, 0.9)', // Biraz daha opak siyah
                 title: '#fff',
                 body: '#ddd',
                 border: '#ccc'
            };
            chartInstance.options.plugins.tooltip.backgroundColor = tooltipColors.bg;
            chartInstance.options.plugins.tooltip.titleColor = tooltipColors.title;
            chartInstance.options.plugins.tooltip.bodyColor = tooltipColors.body;
            chartInstance.options.plugins.tooltip.borderColor = tooltipColors.border;
        }

        // Legend label rengini güncelle
        if (chartInstance.options.plugins.legend && chartInstance.options.plugins.legend.labels) {
             // Legend yazısı genellikle nötr renkte veya text-muted renginde olur.
             // Burada temaya duyarlı text-muted rengini kullanalım.
             chartInstance.options.plugins.legend.labels.color = getComputedStyle(root).getPropertyValue('--text-muted').trim();
        }

        chartInstance.update(); // Chart'ı güncelle
        console.log(`Chart colors updated for ${theme} theme.`);
    };

    /** Helper function to lighten or darken a color */
    function lightenDarkenColor(col, amt) {
        col = col.replace(/^#/, '');
        if (col.length === 3) col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];
        let [r, g, b] = col.match(/.{2}/g).map(x => parseInt(x, 16));
        r = Math.max(0, Math.min(255, r + amt));
        g = Math.max(0, Math.min(255, g + amt));
        b = Math.max(0, Math.min(255, b + amt));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /** Get sentiment colors based on theme */
    const getSentimentColors = (theme) => {
        const colors = {};
        // CSS değişkenlerinden renkleri oku
        if (theme === 'dark') {
            colors.positive = getComputedStyle(root).getPropertyValue('--dark-sentiment-positive-color').trim() || '#a3cfbb';
            colors.negative = getComputedStyle(root).getPropertyValue('--dark-sentiment-negative-color').trim() || '#f1a7b0';
            colors.neutral = getComputedStyle(root).getPropertyValue('--dark-sentiment-neutral-color').trim() || '#ffe69c';
            colors.unknown = getComputedStyle(root).getPropertyValue('--dark-sentiment-unknown-color').trim() || '#a0a0a0';
        } else {
            colors.positive = getComputedStyle(root).getPropertyValue('--sentiment-positive-color').trim() || '#4CAF50';
            colors.negative = getComputedStyle(root).getPropertyValue('--sentiment-negative-color').trim() || '#F44336';
            colors.neutral = getComputedStyle(root).getPropertyValue('--sentiment-neutral-color').trim() || '#FFC107';
            colors.unknown = getComputedStyle(root).getPropertyValue('--sentiment-unknown-color').trim() || '#9E9E9E';
        }
        return colors;
    };

    /** Handle Nav Link Click */
    const handleNavLinkClick = (event) => {
        // Sadece loglama amaçlı, genişletilebilir.
        console.log(`Nav link clicked: ${event.currentTarget.textContent.trim()}`);
    };

    /** Set Username */
    const setUsername = () => {
        // Sadece usernameSpan varsa çalıştır
        if (usernameSpan) {
            usernameSpan.textContent = localStorage.getItem('username') || "Ziyaretçi";
        }
    };

    // --- Slideshow Functions ---
    const SLIDESHOW_IMAGE_URLS = [
        'https://images.unsplash.com/photo-1501854140801-50d01698950b?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600',
        'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600',
        'https://images.unsplash.com/photo-1505144808419-1957a94ca61e?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600'
    ];
    const SLIDESHOW_INTERVAL = 6000;
    const FADE_DURATION = 800; // Yumuşak geçiş
    let currentImageIndex = 0;

    const showNextImage = (imgElement) => {
        if (!imgElement || SLIDESHOW_IMAGE_URLS.length === 0) return;
        imgElement.classList.add('fading'); // Opaklığı azalt (CSS'te tanımlı)
        setTimeout(() => {
            currentImageIndex = (currentImageIndex + 1) % SLIDESHOW_IMAGE_URLS.length;
            imgElement.src = SLIDESHOW_IMAGE_URLS[currentImageIndex];
            // Yeni resim yüklendikten sonra (veya kısa bir süre sonra) opaklığı geri getir
            imgElement.onload = () => { // Resim yüklendiğinde fade-in yap
                 setTimeout(() => {
                     imgElement.classList.remove('fading');
                 }, 50); // Çok kısa gecikme yeterli olabilir
            };
            imgElement.onerror = () => { // Yükleme hatası
                 console.error("Failed to load slideshow image:", imgElement.src);
                 imgElement.classList.remove('fading'); // Fade sınıfını kaldır
                 imgElement.alt = "Görsel yüklenemedi.";
            };

        }, FADE_DURATION); // CSS'teki transition süresi kadar bekle
    };

    const startImageSlideshow = (imgElement) => {
        if (!imgElement || SLIDESHOW_IMAGE_URLS.length === 0) {
            if(imgElement) imgElement.alt = "Görsel bulunamadı."; // Hata durumu
            return;
        }
        // İlk resmi göster
        imgElement.src = SLIDESHOW_IMAGE_URLS[currentImageIndex];
        imgElement.classList.remove('fading'); // Başlangıçta görünür olduğundan emin ol
         imgElement.onerror = () => { console.error("Failed to load initial slideshow image:", imgElement.src); imgElement.alt = "Görsel yüklenemedi"; };


        if (slideshowIntervalId) clearInterval(slideshowIntervalId);
        // Yeni interval'ı başlat
        slideshowIntervalId = setInterval(() => showNextImage(imgElement), SLIDESHOW_INTERVAL);
        console.log("Image slideshow started.");
    };

    // --- Planner Helper Functions ---
    // Feedback mesajlarını gösterme ve temizleme
    const showPlannerFeedback = (feedbackElement, message, type = 'info') => {
        if (!feedbackElement) return;
        feedbackElement.textContent = message;
        feedbackElement.className = 'form-feedback'; // Önceki sınıfları sıfırla
        if (type === 'success') feedbackElement.classList.add('success');
        else if (type === 'error') feedbackElement.classList.add('error');
        // Opsiyonel: Bir süre sonra mesajı temizle
        // setTimeout(() => clearPlannerFeedback(feedbackElement), 5000);
    };
    const clearPlannerFeedback = (feedbackElement) => {
        if (feedbackElement) {
            feedbackElement.textContent = '';
            feedbackElement.className = 'form-feedback';
        }
    };

    // --- Duygu İstatistikleri Chart Fonksiyonları ---

     /** Duygu periyodu başlığını ve ok ikonunu günceller. */
     const updateSentimentPeriodDisplay = (period) => {
        if (!sentimentPeriodTitleSpan || !sentimentPeriodToggleArrow) return;

        if (period === 'weekly') {
            sentimentPeriodTitleSpan.textContent = 'HAFTALIK';
            sentimentPeriodToggleArrow.className = 'fas fa-chevron-right period-toggle-arrow';
            sentimentPeriodToggleArrow.title = 'Aylık Görünüm';
            sentimentPeriodToggleArrow.setAttribute('aria-label', 'Aylık Görünüm');
        } else if (period === 'monthly') {
            sentimentPeriodTitleSpan.textContent = 'AYLIK';
            sentimentPeriodToggleArrow.className = 'fas fa-chevron-left period-toggle-arrow';
            sentimentPeriodToggleArrow.title = 'Haftalık Görünüm';
             sentimentPeriodToggleArrow.setAttribute('aria-label', 'Haftalık Görünüm');
        }
     };


    /** Chart.js ile duygu istatistikleri grafiğini çizer. */
    const renderSentimentChart = (data, theme) => {
        // Eğer canvas veya konteyner yoksa çık
        if (!sentimentChartCanvas || !moodStatsSection) {
             console.warn("Sentiment chart canvas or mood stats section not found. Skipping chart render.");
             return null; // Chart oluşturulamadı
        }

        // Eski chart instance'ını yok et
        if (sentimentChartInstance) {
            sentimentChartInstance.destroy();
            sentimentChartInstance = null;
        }
         console.log("Attempting to render sentiment chart...");

        const ctx = sentimentChartCanvas.getContext('2d');
        if (!ctx) {
             console.error("Failed to get 2D context for sentiment chart canvas.");
             return null;
        }

        // Data'yı Chart.js formatına çevir
        // Sadece count > 0 olan etiketleri al, 'bilinmiyor' 0 olsa bile dahil et
        const labels = Object.keys(data).filter(key => data[key] > 0 || key === 'bilinmiyor');
        // Karşılık gelen count'ları al (etiketlerin sıralamasına göre)
        const counts = labels.map(label => data[label] || 0); // Eğer data[label] tanımsızsa 0 al

        const totalEntries = counts.reduce((sum, count) => sum + count, 0);
        if (totalEntries === 0) {
            console.log(`No recent diary entries for sentiment stats (${currentSentimentPeriod}).`);
            if (sentimentChartPlaceholderText) {
                 sentimentChartPlaceholderText.textContent = `${currentSentimentPeriod === 'weekly' ? 'Son 7 güne' : 'Son 1 aya'} ait günlük bulunamadı.`;
            }
            moodStatsSection.classList.remove('chart-loaded'); // Placeholder'ı göster
            return null; // Chart oluşturulmadı
        }

        // Etiketleri Türkçeye çevir ve ilk harfi büyük yap ('bilinmiyor' dahil)
        const displayLabels = labels.map(label => {
            switch(label.toLowerCase()) {
                case 'pozitif': return 'Pozitif';
                case 'negatif': return 'Negatif';
                case 'nötr':    return 'Nötr';
                case 'bilinmiyor': return 'Bilinmiyor'; // 'bilinmiyor' etiketini de çevir
                default:        return label.charAt(0).toUpperCase() + label.slice(1); // Bilinmeyen etiket varsa olduğu gibi kullan
            }
        });

        // Renkleri temaya göre al
        const colors = getSentimentColors(body.classList.contains('dark-theme') ? 'dark' : 'light'); // Render sırasında geçerli temayı al
        const backgroundColors = labels.map(label => {
            switch(label.toLowerCase()) {
                case 'pozitif': return colors.positive;
                case 'negatif': return colors.negative;
                case 'nötr': return colors.neutral;
                case 'bilinmiyor': return colors.unknown;
                default: return colors.unknown;
            }
        });

         const borderColors = backgroundColors.map(color => lightenDarkenColor(color, -15)); // Biraz daha koyu border
         // Hover border rengi temaya göre beyaz veya koyu temada gri
         const hoverBorderColors = (body.classList.contains('dark-theme')) ? lightenDarkenColor('#ffffff', -50) : '#ffffff';


        // Yeni chart instance'ı oluştur
        sentimentChartInstance = new Chart(ctx, {
            type: 'doughnut', // Veya 'pie'
            data: {
                labels: displayLabels,
                datasets: [{
                    data: counts,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 2, // Kenarlık kalınlığı artırıldı
                    hoverBackgroundColor: backgroundColors.map(color => lightenDarkenColor(color, -20)),
                    hoverBorderColor: hoverBorderColors, // Temaya duyarlı hover border rengi
                    hoverBorderWidth: 3 // Hover kenarlık kalınlığı artırıldı
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Konteyner boyutuna uyması için
                cutout: '70%', // Ortadaki boşluk oranı (Doughnut kalınlığı)
                plugins: {
                    legend: {
                        position: 'bottom', // Legend'ı alta al
                        labels: {
                            color: getComputedStyle(root).getPropertyValue('--text-muted').trim(), // Legend yazıları temaya duyarlı metin rengi
                             font: {
                                size: 12, // Legend yazı boyutu
                                family: "'Inter', sans-serif" // Legend fontu
                             },
                             padding: 15 // Legend itemleri arası boşluk
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                const total = tooltipItem.dataset.data.reduce((sum, count) => sum + count, 0);
                                const percentage = total > 0 ? Math.round((tooltipItem.raw / total) * 100) + '%' : '0%';
                                return `${tooltipItem.label}: ${tooltipItem.raw} (${percentage})`;
                            }
                        },
                         // Tooltip renkleri temaya duyarlı
                         backgroundColor: (body.classList.contains('dark-theme')) ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)', // Biraz daha opak
                         titleColor: (body.classList.contains('dark-theme')) ? '#111' : '#fff',
                         bodyColor: (body.classList.contains('dark-theme')) ? '#333' : '#ddd',
                         borderColor: (body.classList.contains('dark-theme')) ? '#555' : '#ccc',
                         borderWidth: 1,
                         titleFont: { weight: 'bold', family: "'Inter', sans-serif" },
                         bodyFont: { weight: 'normal', family: "'Inter', sans-serif" },
                         padding: 10, // Tooltip padding
                         cornerRadius: 5 // Tooltip köşeleri
                    }
                },
                animation: {
                     animateScale: true, // Ortadan dışa doğru büyüme animasyonu
                     animateRotate: true // Döndürme animasyonu
                },
                hover: {
                    mode: 'nearest', // En yakın öğeyi vurgula
                    intersect: true
                },
                // layout padding genellikle responsive canvas için gerekmez
                /*layout: {
                   padding: {
                       top: 0, bottom: 0, left: 0, right: 0
                   }
               }*/
            }
        });

        console.log("Sentiment chart created.");
        // Chart başarılı şekilde oluşturulduysa placeholder'ı gizle, chart container'ı göster
        moodStatsSection.classList.add('chart-loaded');


         return sentimentChartInstance; // Oluşturulan chart instance'ını döndür
    };


    /** Haftalık/Aylık duygu istatistiklerini API'den çeker ve Chart çizer. */
    // period parametresi alıyor
    const loadAndRenderSentimentStats = async (period) => {
        // Elementlerin varlığını kontrol et
        if (!sentimentChartCanvas || !moodStatsSection || !sentimentChartPlaceholder || !sentimentChartPlaceholderText || !sentimentPeriodTitleSpan || !sentimentPeriodToggleArrow) {
             console.warn("Sentiment chart elements not found on this page. Skipping stats loading.");
             return;
        }

        const userId = getUserId();
        if (userId === null) {
             console.log("User not logged in, skipping sentiment stats loading.");
             if (sentimentChartPlaceholderText) sentimentChartPlaceholderText.textContent = 'Duygu istatistiklerini görmek için giriş yapın.';
             moodStatsSection.classList.remove('chart-loaded'); // Placeholder'ı göster
              // Chart varsa temizle
              if (sentimentChartInstance) {
                 sentimentChartInstance.destroy();
                 sentimentChartInstance = null;
              }
             // Başlığı ve oku doğru duruma getir (giriş yapılmadıysa)
             updateSentimentPeriodDisplay('weekly'); // Varsayılan olarak haftalık göster
             sentimentPeriodToggleArrow.disabled = true; // Ok'u pasif yap
             return;
        }

        // Yükleniyor durumunu ayarla
        if (sentimentChartPlaceholderText) {
            sentimentChartPlaceholderText.textContent = `Duygu istatistikleri (${period === 'weekly' ? 'son 7 gün' : 'son 1 ay'}) yükleniyor...`;
        }
        moodStatsSection.classList.remove('chart-loaded'); // Placeholder'ı göster
        sentimentPeriodToggleArrow.disabled = true; // Oku pasif yap

        try {
            console.log(`Fetching sentiment stats from ${API_SENTIMENT_STATS_URL}?period=${period} for user ${userId}`);
            // apiRequest zaten X-User-ID header'ını ekliyor
            const stats = await apiRequest(`${API_SENTIMENT_STATS_URL}?period=${period}`, { method: 'GET' });

            console.log(`Sentiment stats received (${period}):`, stats);

            // API'den dönen veri boşsa (örn: son 7 günde/1 ayda hiç günlük yoksa) veya tüm sayımlar 0 ise
            const totalCountInResponse = Object.values(stats).reduce((sum, count) => sum + count, 0);

            if (!stats || totalCountInResponse === 0) {
                 console.log(`No recent diary entries with sentiment data found for period: ${period}.`);
                 if (sentimentChartPlaceholderText) {
                    sentimentChartPlaceholderText.textContent = `${period === 'weekly' ? 'Son 7 güne' : 'Son 1 aya'} ait duygu verisi bulunamadı.`;
                 }
                 moodStatsSection.classList.remove('chart-loaded'); // Placeholder'ı göster
                 // Eğer chart instance'ı varsa yok et
                 if (sentimentChartInstance) {
                    sentimentChartInstance.destroy();
                    sentimentChartInstance = null;
                 }
                 // Periyot başlığını güncelle (veri olmasa bile periyodu göstermeli)
                 updateSentimentPeriodDisplay(period);
                 return;
            }

            // Chart'ı çiz
            // renderSentimentChart'a duygu sayımlarını ve geçerli temayı gönderiyoruz
            sentimentChartInstance = renderSentimentChart(stats, body.classList.contains('dark-theme') ? 'dark' : 'light');

            if (!sentimentChartInstance) {
                 console.error("Failed to render sentiment chart.");
                 if (sentimentChartPlaceholderText) sentimentChartPlaceholderText.textContent = 'Grafik yüklenemedi.';
                 moodStatsSection.classList.remove('chart-loaded');
                 return;
            }

            console.log(`Sentiment stats loaded and chart rendered for period: ${period}.`);
            // Başlık periyodunu güncelle
            updateSentimentPeriodDisplay(period);


        } catch (error) {
             // Unauthorized hatası apiRequest içinde ele alındı ve yönlendirme yapıldı
             // Diğer hatalar için placeholder'a hata mesajı yaz
             if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) {
                console.error(`Failed to load sentiment stats (${period}):`, error);
                if (sentimentChartPlaceholderText) {
                    sentimentChartPlaceholderText.textContent = `İstatistikler yüklenemedi: ${error.message}`;
                }
                moodStatsSection.classList.remove('chart-loaded');
                 if (sentimentChartInstance) {
                    sentimentChartInstance.destroy();
                    sentimentChartInstance = null;
                 }
             } else {
                // Yetkilendirme hatasıysa (zaten yönlendirildi/uyarıldı)
                 if (sentimentChartPlaceholderText) {
                    sentimentChartPlaceholderText.textContent = 'Duygu istatistiklerini görmek için giriş yapın.';
                 }
                 moodStatsSection.classList.remove('chart-loaded');
             }
             // Hata durumunda bile başlık periyodunu güncelle
             updateSentimentPeriodDisplay(period);

        } finally {
             // API isteği tamamlandığında (başarı veya hata) oku tekrar aktif yap
             sentimentPeriodToggleArrow.disabled = false;
        }
    };


    // --- ================================== ---
    // --- CORE INITIALIZATION SEQUENCE       ---
    // --- ================================== ---
    // 1. Temayı yükle/ayarla
    const currentTheme = initializeTheme();
    // 2. Kayıtlı özel rengi yükle (body ve header için)
    loadCustomBackgroundColor();
    // 3. Kullanıcı adını ayarla (varsa)
    setUsername();

    // --- ================================== ---
    // --- ATTACH CORE EVENT LISTENERS        ---
    // --- ================================== ---

    // Tema Değiştirici
    themeToggleButton?.addEventListener('click', handleThemeToggle);

    // Çıkış Yap
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            console.log("Logout button clicked.");
            localStorage.clear(); // Tüm local veriyi temizle
            sessionStorage.clear(); // Tüm session veriyi temizle
            // Yönlendirmeyi Flask'ın login sunduğu adrese yapıyoruz
            window.location.href = '/public/login.html'; // Giriş sayfasına yönlendir
        });
    }

    // Profil İkonu (Yönlendirme Eklendi)
    if (profileIcon) {
        profileIcon.addEventListener('click', () => {
            console.log("Profile icon clicked, redirecting to profil.html");
            // Yönlendirmeyi Flask'ın profil sunduğu adrese yapıyoruz
            window.location.href = '/public/profil.html';
        });
    }

    // Navigasyon Linkleri (Sadece loglama)
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavLinkClick);
    });

    // Arka Plan Renk Seçici Toggle ve Kapatma
    if (bgColorPickerToggle && bgColorPickerPopover) {
        bgColorPickerToggle.addEventListener('click', (event) => {
            event.stopPropagation(); // Click'in document'a yayılmasını engelle
            bgColorPickerPopover.classList.toggle('visible');
        });
        bgColorPickerPopover.addEventListener('click', (event) => event.stopPropagation()); // Popover içindeki tıklamaların popover'ı kapatmasını engelle
    }
    // Özel Renk Input Değişikliği
    if (customBgColorInput) {
        customBgColorInput.addEventListener('input', (e) => applyCustomBackgroundColor(e.target.value));
    }
    // Renk Sıfırlama Butonu
    if (resetBgColorButton) {
        resetBgColorButton.addEventListener('click', () => {
            const themeNow = body.classList.contains('dark-theme') ? 'dark' : 'light';
            resetCustomBackgroundOnly(themeNow); // Temanın varsayılan rengine sıfırla
            if (bgColorPickerPopover) bgColorPickerPopover.classList.remove('visible'); // Popover'ı kapat
        });
    }
    // Sayfanın herhangi bir yerine tıklanınca popover'ı kapat
    document.addEventListener('click', (event) => {
        if (bgColorPickerPopover && bgColorPickerPopover.classList.contains('visible')) {
            // Tıklanan yer toggle butonu veya popover'ın kendisi değilse kapat
            if (!bgColorPickerToggle?.contains(event.target) && !bgColorPickerPopover.contains(event.target)) {
                 bgColorPickerPopover.classList.remove('visible');
            }
        }
    });


    console.log("index.js: Core initializations and listeners attached.");

    // --- ================================== ---
    // --- PAGE-SPECIFIC INITIALIZATIONS      ---
    // --- ================================== ---

    // **Planner Initialization (Sadece planner formu varsa)**
    const plannerForm = document.getElementById('planner-form');
    if (plannerForm) {
        console.log("index.js: Initializing planner...");
        // Planner için gerekli diğer elementleri seç
        const plannerDateInput = document.getElementById('planner-date');
        const plannerTimeInput = document.getElementById('planner-time');
        const plannerDescriptionInput = document.getElementById('planner-description');
        const reminderList = document.getElementById('reminder-list');
        const plannerFeedback = document.getElementById('planner-feedback');
        const addReminderButton = document.getElementById('add-reminder-button');


         // Hatırlatıcıları API'den çek ve listeye ekle
         const loadAndDisplayReminders = async () => {
            if (!reminderList) { console.error("Reminder list element not found."); return; }

            const userId = getUserId(); // User ID'yi al
            if (userId === null) {
                 reminderList.innerHTML = '<li class="no-reminders error">Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.</li>';
                 return;
            }

            reminderList.innerHTML = '<li class="no-reminders">Hatırlatıcılar yükleniyor...</li>'; // Yükleniyor mesajı

            try {
                // API'den GET isteği yaparken X-User-ID header'ını ekle
                const reminders = await apiRequest(API_REMINDERS_URL, { method: 'GET' });

                reminderList.innerHTML = ''; // Listeyi temizle

                if (!Array.isArray(reminders) || reminders.length === 0) {
                    reminderList.innerHTML = '<li class="no-reminders">Henüz hatırlatıcı eklenmemiş.</li>';
                    return;
                }

                // Tarih ve saate göre sırala (backend'de yapılıyor ama frontend'de de sağlamak iyi)
                reminders.sort((a, b) => {
                    // Geçersiz tarih/saat durumunda hatayı ele al
                    const dateTimeA = new Date(`${a.date}T${a.time || '00:00:00'}`); // time yoksa varsayılan saat
                    const dateTimeB = new Date(`${b.date}T${b.time || '00:00:00'}`); // time yoksa varsayılan saat

                    if (isNaN(dateTimeA.getTime()) && isNaN(dateTimeB.getTime())) return 0; // İkisi de geçersizse sıralama önemsiz
                    if (isNaN(dateTimeA.getTime())) return 1; // A geçersizse B önce gelsin
                    if (isNaN(dateTimeB.getTime())) return -1; // B geçersizse A önce gelsin

                    return dateTimeA - dateTimeB;
                });

                // Her bir hatırlatıcı için liste öğesi oluştur
                reminders.forEach(reminder => {
                     if (!reminder.id) { console.warn("Reminder missing ID:", reminder); return; }

                     const li = document.createElement('li');
                     li.setAttribute('data-id', reminder.id);

                     // Tarih ve saat formatlama
                     const eventDateTime = new Date(`${reminder.date}T${reminder.time}`);
                     const isValidDate = !isNaN(eventDateTime.getTime());
                     const formattedDate = isValidDate ? eventDateTime.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Geçersiz Tarih';
                     const formattedTime = isValidDate ? eventDateTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';


                     li.innerHTML = `
                         <div class="reminder-info">
                             <strong>${reminder.description || 'Açıklama Yok'}</strong>
                             <span><i class="far fa-calendar-alt"></i> ${formattedDate}   <i class="far fa-clock"></i> ${formattedTime}</span>
                             ${reminder.notified ? '<small class="notified"><i class="fas fa-check-circle"></i> Bildirim Gönderildi (Simge)</small>' : ''}
                         </div>
                         <div class="reminder-actions">
                             <!-- İsterseniz bir "Bildirim gönderildi" işaretleme butonu ekleyebilirsiniz -->
                             <!-- <button class="mark-notified-button" data-id="${reminder.id}" title="Bildirim Gönderildi Olarak İşaretle"><i class="fas fa-check"></i></button> -->
                             <button class="delete-reminder-button" data-id="${reminder.id}" aria-label="Hatırlatıcıyı Sil" title="Hatırlatıcıyı Sil">
                                 <i class="fas fa-trash-alt"></i>
                             </button>
                         </div>`;
                     reminderList.appendChild(li);
                 });

             } catch (error) {
                 // apiRequest 401'i ele aldığı için burada sadece diğer hataları yakalarız.
                 console.error('Hatırlatıcılar yüklenirken hata:', error);
                 reminderList.innerHTML = `<li class="no-reminders error">Hatırlatıcılar yüklenemedi: ${error.message || ''}</li>`;
             }
         };

        // Hatırlatıcı Ekleme Formu Gönderme
         const handleAddReminder = async (event) => {
             event.preventDefault();
             if (!plannerFeedback || !plannerDateInput || !plannerTimeInput || !plannerDescriptionInput || !addReminderButton) { console.error("Planner DOM elements missing."); return; }
             clearPlannerFeedback(plannerFeedback);
             const userId = getUserId(); // User ID'yi al
             if (userId === null) { showPlannerFeedback(plannerFeedback, 'Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.', 'error'); return; }

             const reminderData = {
                 date: plannerDateInput.value,
                 time: plannerTimeInput.value,
                 description: plannerDescriptionInput.value.trim(),
                 // email: plannerEmailInput.value.trim() // Email artık backend'de tutulmuyor
             };

             // Client-side Validasyon
             if (!reminderData.date || !reminderData.time || !reminderData.description) {
                 showPlannerFeedback(plannerFeedback, 'Lütfen tüm alanları doldurun.', 'error');
                 return;
             }

             // Gelecek tarih/saat kontrolü
             try {
                 const reminderDateTime = new Date(`${reminderData.date}T${reminderData.time}`);
                 if (isNaN(reminderDateTime.getTime())) { showPlannerFeedback(plannerFeedback, 'Geçersiz tarih veya saat formatı.', 'error'); return; }
                 if (reminderDateTime <= new Date()) { showPlannerFeedback(plannerFeedback, 'Lütfen gelecek bir tarih ve saat seçin.', 'error'); return; }
             } catch (e) { console.error("Date validation error:", e); showPlannerFeedback(plannerFeedback, 'Tarih veya saat doğrulanırken bir hata oluştu.', 'error'); return; }

             addReminderButton.disabled = true; // Butonu pasif yap
             showPlannerFeedback(plannerFeedback, 'Hatırlatıcı ekleniyor...', 'info'); // Yükleniyor mesajı

             try {
                 // API'ye POST isteği apiRequest tarafından X-User-ID header'ı eklenerek yapılıyor
                 const result = await apiRequest(API_REMINDERS_URL, {
                     method: 'POST',
                     body: JSON.stringify(reminderData),
                 });
                 showPlannerFeedback(plannerFeedback, result.message || 'Hatırlatıcı başarıyla eklendi!', 'success');
                 plannerForm.reset(); // Formu temizle
                 loadAndDisplayReminders(); // Listeyi yeniden yükle

             } catch (error) {
                 console.error('Hatırlatıcı gönderilirken hata:', error);
                 // apiRequest 401'i ele aldığı için burada sadece diğer hataları yakalarız.
                 showPlannerFeedback(plannerFeedback, `Hata: ${error.message || 'Hatırlatıcı eklenemedi.'}`, 'error');
             } finally {
                 addReminderButton.disabled = false; // Butonu tekrar aktif yap
             }
         };

        // Hatırlatıcı Silme (Event Delegation)
        const handleDeleteReminder = async (event) => {
            const deleteButton = event.target.closest('.delete-reminder-button');
            // Gerekli elementler ve tıklananın silme butonu olduğundan emin ol
            if (!deleteButton || !reminderList || !plannerFeedback) return;
            const reminderId = deleteButton.getAttribute('data-id'); // Silinecek ID'yi al
            if (!reminderId) { console.warn("Delete button clicked but no data-id found."); return; }

            const userId = getUserId(); // User ID'yi al
             if (userId === null) {
                 showPlannerFeedback(plannerFeedback, 'Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.', 'error');
                 return;
             }

            // Kullanıcıdan onay al
            if (confirm('Bu hatırlatıcıyı silmek istediğinizden emin misiniz?')) {
                // Butonu pasif yap ve öğeyi soluklaştır (iyimser UI)
                deleteButton.disabled = true;
                const listItem = deleteButton.closest('li');
                if (listItem) listItem.style.opacity = '0.5';
                clearPlannerFeedback(plannerFeedback); // Önceki mesajları temizle
                showPlannerFeedback(plannerFeedback, 'Hatırlatıcı siliniyor...', 'info'); // Siliniyor mesajı

                try {
                    // API'ye DELETE isteği apiRequest tarafından X-User-ID header'ı eklenerek yapılıyor
                    await apiRequest(`${API_REMINDERS_URL}/${reminderId}`, { method: 'DELETE' });

                    console.log('Hatırlatıcı başarıyla silindi, ID:', reminderId);
                    if (listItem) listItem.remove(); // Öğeyi DOM'dan kaldır

                    // Liste boşaldysa "Henüz hatırlatıcı eklenmemiş" mesajını göster
                    // .no-reminders ve .error class'ı olanları sayıma dahil etme
                    const remainingItems = reminderList.querySelectorAll('li:not(.no-reminders, .error)');
                    if (remainingItems.length === 0) {
                         reminderList.innerHTML = '<li class="no-reminders">Henüz hatırlatıcı eklenmemiş.</li>';
                    }
                    showPlannerFeedback(plannerFeedback, 'Hatırlatıcı başarıyla silindi.', 'success');

                } catch (error) {
                    // apiRequest 401 ve 404'ü ele aldığı için burada sadece diğer hataları yakalarız.
                    console.error('Hatırlatıcı silinirken hata:', error);
                    showPlannerFeedback(plannerFeedback, `Hata: ${error.message || 'Hatırlatıcı silinemedi.'}`, 'error');
                    // İyimser UI'yi geri al
                    deleteButton.disabled = false;
                    if (listItem) listItem.style.opacity = '1';
                }
            }
        };


        // --- Planner Event Listener'ları Ekle ---
        plannerForm.addEventListener('submit', handleAddReminder);
        // Reminder listesi üzerine tıklamaları dinle (Silme butonu için event delegation)
        if (reminderList) {
            reminderList.addEventListener('click', handleDeleteReminder);
        }

        // Sayfa yüklendiğinde hatırlatıcıları yükle ve göster
        loadAndDisplayReminders();


        console.log("index.js: Planner initialized.");

    } else {
        console.log("index.js: Planner form not found on this page.");
    }


    // **Slideshow Initialization (Sadece ilgili element varsa)**
    const inspirationImage = document.getElementById('inspiration-image');
    if (inspirationImage) {
        console.log("index.js: Initializing slideshow...");
        startImageSlideshow(inspirationImage); // Slideshow'u başlat
    } else {
        console.log("index.js: Slideshow image not found.");
    }

     // **Sentiment Stats Initialization (Sadece ilgili element varsa)**
    // Gerekli tüm elementlerin varlığını kontrol et
    if (sentimentChartCanvas && moodStatsSection && sentimentChartPlaceholder && sentimentChartPlaceholderText && sentimentPeriodTitleSpan && sentimentPeriodToggleArrow) {
         console.log("index.js: Initializing sentiment stats chart...");

         // Başlangıçta haftalık veriyi yükle ve başlığı ayarla
         currentSentimentPeriod = 'weekly'; // Varsayılan periyodu ayarla
         updateSentimentPeriodDisplay(currentSentimentPeriod); // Başlık metni ve ok yönünü ayarla

         // Başlangıçta grafiği yükle
         loadAndRenderSentimentStats(currentSentimentPeriod);

         // Ok ikonuna tıklama olayını dinle
         sentimentPeriodToggleArrow.addEventListener('click', () => {
             // Eğer ok pasif ise (yüklenme sürüyor olabilir), tıklamayı yoksay
             if (sentimentPeriodToggleArrow.disabled) {
                 console.log("Period toggle disabled, ignoring click.");
                 return;
             }

             console.log("Sentiment period toggle clicked.");
             // Periyodu değiştir
             currentSentimentPeriod = (currentSentimentPeriod === 'weekly') ? 'monthly' : 'weekly';
             // Başlığı ve oku güncelle (loadAndRenderSentimentStats içinde de güncelleniyor ama burada hemen görsel geri bildirim sağlar)
             updateSentimentPeriodDisplay(currentSentimentPeriod);
             // Yeni periyot için veriyi yükle ve grafiği çiz
             loadAndRenderSentimentStats(currentSentimentPeriod);
         });


    } else {
         // Elementlerden biri veya birkaçı bulunamazsa
         console.warn("index.js: Sentiment chart elements not found on this page. Sentiment stats chart initialization skipped.");
         // Eğer sadece section ve placeholder metin alanı varsa, bir hata mesajı göster
         if (moodStatsSection && sentimentChartPlaceholderText) {
              sentimentChartPlaceholderText.textContent = 'Duygu analizi grafiği yüklenemedi (Gerekli elementler bulunamadı).';
              moodStatsSection.classList.remove('chart-loaded'); // Placeholder'ı göster
              // Ok ikonu varsa pasif yap
             if (sentimentPeriodToggleArrow) {
                sentimentPeriodToggleArrow.style.display = 'none'; // Oku gizle
             }
             // Başlığı da uygun hale getir (varsayılan haftalık)
             if(sentimentPeriodTitleSpan) sentimentPeriodTitleSpan.textContent = 'HAFTALIK'; // Veya sabit bir metin
         }
    }

    // **Add Entry Button Initialization (Sadece ilgili buton varsa)**
    const addEntryButtonElement = document.getElementById("add-entry-button");
    if (addEntryButtonElement) {
        // Tıklanınca diary.html'e yönlendir
        addEntryButtonElement.addEventListener("click", () => {
            console.log("Yeni Günlük Ekle butonuna tıklandı. Yönlendiriliyor...");
            // Yönlendirmeyi Flask'ın diary sunduğu adrese yapıyoruz
            window.location.href = "/public/diary.html";
        });
        console.log("index.js: Add Entry button listener attached.");
    } else {
        console.log("index.js: Add Entry button not found.");
    }

    console.log("index.js: All initializations complete.");


}); // End DOMContentLoaded