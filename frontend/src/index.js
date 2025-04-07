/**
 * Initializes the application logic when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const addEntryButton = document.getElementById('add-entry-button');
    const profileIcon = document.getElementById('user-profile');
    const logoutButton = document.getElementById('logout-button');
    const body = document.body;
    const navLinks = document.querySelectorAll('.nav-link');
    const usernameSpan = document.getElementById('username');
    const root = document.documentElement;

    // --- Arka Plan Renk Seçici Elementleri ---
    const bgColorPickerToggle = document.getElementById('bg-color-picker-toggle');
    const bgColorPickerPopover = document.getElementById('bg-color-picker-popover');
    const customBgColorInput = document.getElementById('custom-bg-color-input');
    const resetBgColorButton = document.getElementById('reset-bg-color-button');

    // --- Planlayıcı Elementleri ---
    const plannerForm = document.getElementById('planner-form');
    const plannerDateInput = document.getElementById('planner-date');
    const plannerTimeInput = document.getElementById('planner-time');
    const plannerDescriptionInput = document.getElementById('planner-description');
    const plannerEmailInput = document.getElementById('planner-email');
    const reminderList = document.getElementById('reminder-list');
    const plannerFeedback = document.getElementById('planner-feedback'); // Feedback div

    // --- Görsel Slideshow Elementi ---
    const inspirationImage = document.getElementById('inspiration-image'); // Correct ID

    // --- Constants ---
    const DEFAULT_LIGHT_BG = '#f8f9fa';
    const DEFAULT_DARK_BG = '#121212';
    const API_REMINDERS_URL = '/api/reminders'; // Adjust if needed

    // <<< YENİ: Slideshow Constants >>>
    // (Replace with your desired high-quality, royalty-free nature image URLs)
    const SLIDESHOW_IMAGE_URLS = [
        'https://images.unsplash.com/photo-1501854140801-50d01698950b?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', // Lake mountains
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', // Forest path
        'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', // Misty forest floor
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', // Mountain range view
        'https://images.unsplash.com/photo-1505144808419-1957a94ca61e?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600'  // Beach sunset
    ];
    const SLIDESHOW_INTERVAL = 6000; // Milliseconds (6 seconds)
    const FADE_DURATION = 700; // Milliseconds (must match CSS transition duration)


    // --- State Variables ---
    let currentImageIndex = 0;
    let slideshowIntervalId = null; // To potentially clear interval later

    // --- Function Definitions ---

    /** Temayı başlatır */
    const initializeTheme = () => {
        // ... (previous code unchanged)
        const themeIcon = themeToggleButton?.querySelector('i');
        if (!themeToggleButton || !themeIcon) return 'light';
        const savedTheme = localStorage.getItem('theme');
        const currentTheme = savedTheme || 'light';
        body.classList.toggle('dark-theme', currentTheme === 'dark');
        themeIcon.className = `fas ${currentTheme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
        if (!savedTheme) localStorage.setItem('theme', currentTheme);
        console.log("Theme initialized:", currentTheme);
        return currentTheme;
    };

    /** Tema değiştirme */
    const handleThemeToggle = () => {
        // ... (previous code unchanged)
        const themeIcon = themeToggleButton?.querySelector('i');
        if (!themeToggleButton || !themeIcon) return;
        const isDarkMode = body.classList.toggle('dark-theme');
        const newTheme = isDarkMode ? 'dark' : 'light';
        themeIcon.className = `fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`;
        localStorage.setItem('theme', newTheme);
        resetCustomBackgroundOnly(newTheme); // Reset BG color *after* theme toggle
        console.log("Theme toggled to:", newTheme);
    };

    /** Özel ARKA PLAN rengi uygular */
    const applyCustomBackgroundColor = (hexColor) => {
        // ... (previous code unchanged)
         if (!hexColor || !/^#[0-9A-F]{6}$/i.test(hexColor)) return;
        root.style.setProperty('--background-color', hexColor);
        body.classList.add('custom-background-active');
        if (customBgColorInput) customBgColorInput.value = hexColor;
        try { localStorage.setItem('customBackgroundColor', hexColor); }
        catch (e) { console.error("LocalStorage'a renk kaydedilemedi:", e); }
    };

    /** Özel ARKA PLAN rengini sıfırlar */
    const resetCustomBackgroundOnly = (currentTheme) => {
        // ... (previous code unchanged)
         root.style.removeProperty('--background-color');
        body.classList.remove('custom-background-active');
        if (customBgColorInput) {
            customBgColorInput.value = (currentTheme === 'dark') ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG;
        }
        try { localStorage.removeItem('customBackgroundColor'); }
        catch (e) { console.error("LocalStorage'dan renk silinemedi:", e); }
    };

    /** Kaydedilmiş özel ARKA PLAN rengini yükler */
    const loadCustomBackgroundColor = () => {
       // ... (previous code unchanged)
        try {
            const savedBgColor = localStorage.getItem('customBackgroundColor');
            if (savedBgColor) { applyCustomBackgroundColor(savedBgColor); }
            else if (customBgColorInput) {
                const currentThemeIsDark = body.classList.contains('dark-theme');
                customBgColorInput.value = currentThemeIsDark ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG;
            }
        } catch (e) { console.error("LocalStorage'dan renk okunamadı:", e); }
    };

    /** Nav link tıklama loglama */
    const handleNavLinkClick = (event) => console.log(`${event.currentTarget.textContent.trim()} linkine tıklandı.`);

    /** Kullanıcı adını ayarlar */
    const setUsername = () => {
        if (usernameSpan) usernameSpan.textContent = localStorage.getItem('username') || "Ziyaretçi";
    };

    // --- YENİ: GÖRSEL SLIDESHOW FONKSİYONLARI ---

    /**
     * Shows the next image in the slideshow with a fade effect.
     */
    const showNextImage = () => {
        if (!inspirationImage || SLIDESHOW_IMAGE_URLS.length === 0) return;

        // 1. Fade out current image
        inspirationImage.classList.add('fading');

        // 2. Wait for fade out, then change src and fade in
        setTimeout(() => {
            currentImageIndex = (currentImageIndex + 1) % SLIDESHOW_IMAGE_URLS.length;
            inspirationImage.src = SLIDESHOW_IMAGE_URLS[currentImageIndex];

            // Ensure image is loaded before fading in (optional but good practice)
            inspirationImage.onload = () => {
                inspirationImage.classList.remove('fading');
                inspirationImage.onload = null; // Remove listener after use
            };
            // Fallback if onload doesn't fire (e.g., cached image)
             setTimeout(() => inspirationImage.classList.remove('fading'), 50);

        }, FADE_DURATION); // Wait for CSS transition to finish
    };

    /**
     * Starts the image slideshow interval.
     */
    const startImageSlideshow = () => {
        if (!inspirationImage || SLIDESHOW_IMAGE_URLS.length === 0) {
            console.warn("Slideshow image element or URLs not found.");
            if(inspirationImage) inspirationImage.alt = "Görsel yüklenemedi.";
            return;
        }

        // Show the first image immediately (without fade initially)
        inspirationImage.src = SLIDESHOW_IMAGE_URLS[currentImageIndex];
        inspirationImage.classList.remove('fading'); // Ensure it's visible

        // Clear any existing interval
        if (slideshowIntervalId) {
            clearInterval(slideshowIntervalId);
        }

        // Start the interval timer
        slideshowIntervalId = setInterval(showNextImage, SLIDESHOW_INTERVAL);
        console.log("Image slideshow started.");
    };

    // --- PLANLAYICI FONKSİYONLARI ---

    /**
     * Displays feedback messages in the planner form area.
     * @param {string} message - The message to display.
     * @param {'success' | 'error' | 'info'} type - The type of message.
     */
    const showPlannerFeedback = (message, type = 'info') => {
        if (!plannerFeedback) return;
        plannerFeedback.textContent = message;
        plannerFeedback.className = 'form-feedback'; // Reset classes
        if (type === 'success') {
            plannerFeedback.classList.add('success');
        } else if (type === 'error') {
            plannerFeedback.classList.add('error');
        }
        // Automatically clear feedback after a while? (Optional)
        // setTimeout(() => { if (plannerFeedback.textContent === message) clearPlannerFeedback(); }, 5000);
    };

    /** Clears the planner feedback area. */
    const clearPlannerFeedback = () => {
        if (plannerFeedback) {
            plannerFeedback.textContent = '';
            plannerFeedback.className = 'form-feedback';
        }
    };

    /** Hatırlatıcı ekleme */
    const handleAddReminder = async (event) => {
        event.preventDefault();
        clearPlannerFeedback(); // Clear previous messages

        const reminderData = {
            date: plannerDateInput.value,
            time: plannerTimeInput.value,
            description: plannerDescriptionInput.value.trim(),
            email: plannerEmailInput.value.trim()
        };

        // Frontend Doğrulama
        if (!reminderData.date || !reminderData.time || !reminderData.description || !reminderData.email) {
            showPlannerFeedback('Lütfen tüm alanları doldurun.', 'error');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(reminderData.email)) {
             showPlannerFeedback('Lütfen geçerli bir e-posta adresi girin.', 'error');
             return;
        }
        const reminderDateTime = new Date(`${reminderData.date}T${reminderData.time}`);
        if (isNaN(reminderDateTime.getTime()) || reminderDateTime <= new Date()) { // Check for invalid date/time too
            showPlannerFeedback('Lütfen geçerli ve gelecek bir tarih ve saat seçin.', 'error');
            return;
        }

        const submitButton = plannerForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        showPlannerFeedback('Gönderiliyor...', 'info');

        try {
            const response = await fetch(API_REMINDERS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reminderData),
            });

            if (!response.ok) {
                let errorMsg = `Sunucu hatası: ${response.status}`;
                try { errorMsg = (await response.json()).message || errorMsg; } catch (e) {}
                throw new Error(errorMsg);
            }

            const result = await response.json();
            showPlannerFeedback(result.message || 'Hatırlatıcı başarıyla eklendi!', 'success');
            plannerForm.reset();
            loadAndDisplayReminders();

        } catch (error) {
            console.error('Hatırlatıcı gönderilirken hata:', error);
            showPlannerFeedback(`Hata: ${error.message || 'Hatırlatıcı eklenemedi.'}`, 'error');
        } finally {
             submitButton.disabled = false;
        }
    };

    /** Hatırlatıcıları yükler ve gösterir */
    const loadAndDisplayReminders = async () => {
        if (!reminderList) return;
        reminderList.innerHTML = '<li class="no-reminders">Hatırlatıcılar yükleniyor...</li>';

        try {
            const response = await fetch(API_REMINDERS_URL);
            if (!response.ok) {
                throw new Error(`Sunucu hatası: ${response.status}`);
            }
            const reminders = await response.json();

            reminderList.innerHTML = ''; // Listeyi temizle

            if (!Array.isArray(reminders) || reminders.length === 0) {
                reminderList.innerHTML = '<li class="no-reminders">Henüz hatırlatıcı eklenmemiş.</li>';
                return;
            }

             // Tarih ve saate göre sırala
            reminders.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

            reminders.forEach(reminder => {
                // ID kontrolü - Backend mutlaka ID sağlamalı
                if (!reminder.id) {
                    console.warn("Reminder received without ID:", reminder);
                    return; // ID'siz hatırlatıcıyı atla
                }

                const li = document.createElement('li');
                li.setAttribute('data-id', reminder.id);

                const eventDate = new Date(`${reminder.date}T${reminder.time}`);
                const isValidDate = !isNaN(eventDate.getTime());
                const formattedDate = isValidDate ? eventDate.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Geçersiz Tarih';
                const formattedTime = isValidDate ? eventDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Geçersiz Saat';

                li.innerHTML = `
                    <div class="reminder-info">
                        <strong>${reminder.description || 'Açıklama Yok'}</strong>
                        <span>${formattedDate} - ${formattedTime}</span>
                        <small>E-posta: ${reminder.email || 'Belirtilmemiş'}</small>
                        ${reminder.notifiedTwoHoursBefore ? '<small class="notified"><i class="fas fa-check-circle"></i> Bildirim Gönderildi</small>' : ''}
                    </div>
                    <div class="reminder-actions">
                        <button class="delete-reminder-button" data-id="${reminder.id}" aria-label="Hatırlatıcıyı Sil">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                reminderList.appendChild(li);
            });

        } catch (error) {
            console.error('Hatırlatıcılar yüklenirken hata:', error);
            reminderList.innerHTML = '<li class="no-reminders" style="color: var(--danger-color);">Hatırlatıcılar yüklenemedi.</li>';
        }
    };

    /** Hatırlatıcı silme */
    const handleDeleteReminder = async (event) => {
         const deleteButton = event.target.closest('.delete-reminder-button');
        if (!deleteButton) return;

        const reminderId = deleteButton.getAttribute('data-id');
        if (!reminderId) return;

        if (confirm('Bu hatırlatıcıyı silmek istediğinizden emin misiniz?')) {
             deleteButton.disabled = true;
             const listItem = deleteButton.closest('li');
             if (listItem) listItem.style.opacity = '0.5';

             try {
                 const response = await fetch(`${API_REMINDERS_URL}/${reminderId}`, {
                    method: 'DELETE',
                 });

                 if (!response.ok) {
                    let errorMsg = `Silinemedi: ${response.status}`;
                    try { errorMsg = (await response.json()).message || errorMsg; } catch(e){}
                    throw new Error(errorMsg);
                 }

                 console.log('Hatırlatıcı silindi, ID:', reminderId);
                 if (listItem) listItem.remove();
                 if (reminderList && reminderList.children.length === 0) {
                     reminderList.innerHTML = '<li class="no-reminders">Henüz hatırlatıcı eklenmemiş.</li>';
                 }
                 // Başarı mesajı (isteğe bağlı)
                 // showPlannerFeedback('Hatırlatıcı silindi.', 'success');

             } catch (error) {
                 console.error('Hatırlatıcı silinirken hata:', error);
                 // Silme hatası mesajı (alert veya feedback div)
                 showPlannerFeedback(`Hata: ${error.message || 'Hatırlatıcı silinemedi.'}`, 'error');
                 // Görsel durumu geri al
                 deleteButton.disabled = false;
                 if (listItem) listItem.style.opacity = '1';
             }
        }
    };


    // --- Event Listener Setup ---
    if (themeToggleButton) themeToggleButton.addEventListener('click', handleThemeToggle);
    if (addEntryButton) addEntryButton.addEventListener('click', () => alert('Yeni günlük...'));
    if (profileIcon) profileIcon.addEventListener('click', () => alert('Profil...'));
    if (logoutButton) logoutButton.addEventListener('click', () => alert('Çıkış...'));
    navLinks.forEach(link => link.addEventListener('click', handleNavLinkClick));

    // Renk Seçici Popover Logic (simplified - needs full implementation if complex interaction needed)
    if (bgColorPickerToggle && bgColorPickerPopover) {
        bgColorPickerToggle.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent body click from closing immediately
            bgColorPickerPopover.classList.toggle('visible');
        });
        bgColorPickerPopover.addEventListener('click', (event) => event.stopPropagation()); // Prevent closing when clicking inside
    }
    if (customBgColorInput) customBgColorInput.addEventListener('input', (e) => applyCustomBackgroundColor(e.target.value));
    if (resetBgColorButton) resetBgColorButton.addEventListener('click', () => {
        const currentTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
        resetCustomBackgroundOnly(currentTheme);
        if (bgColorPickerPopover) bgColorPickerPopover.classList.remove('visible'); // Close popover
    });
    // Close popover on click outside
    document.addEventListener('click', (event) => {
        if (bgColorPickerPopover && bgColorPickerPopover.classList.contains('visible')) {
            if (!bgColorPickerToggle.contains(event.target) && !bgColorPickerPopover.contains(event.target)) {
                 bgColorPickerPopover.classList.remove('visible');
            }
        }
    });


    // --- Planlayıcı Event Listener'ları ---
    if (plannerForm) {
        plannerForm.addEventListener('submit', handleAddReminder);
    } else {
        console.warn("Planlayıcı formu bulunamadı.");
    }

    if (reminderList) {
        reminderList.addEventListener('click', handleDeleteReminder);
    } else {
         console.warn("Hatırlatıcı listesi (ul) bulunamadı.");
    }


    // --- Initializations ---
    initializeTheme(); // Must be early for default BG color logic
    setUsername();
    loadCustomBackgroundColor(); // Load custom BG *after* theme is set
    loadAndDisplayReminders();
    startImageSlideshow(); // <<< YENİ: Start the slideshow


}); // End DOMContentLoaded