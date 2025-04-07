/**
 * Pomodoro Zamanlayıcı Uygulamasını Başlatır.
 * Bu fonksiyon, gerekli DOM elementleri yüklendikten sonra çağrılmalıdır.
 */
function initializePomodoro() {
    console.log("Initializing Pomodoro...");

    // --- DOM Element Seçimi ve Kontrolü ---
    const timeLeftDisplay = document.getElementById('time-left');
    const modeLabel = document.getElementById('mode-label');
    const controlButton = document.getElementById('control-button');
    const buttonIcon = document.getElementById('button-icon'); // Span elementi içindeki ikon/metin
    const cycleInfo = document.getElementById('cycle-info');
    const progressBar = document.querySelector('.progress-ring__circle');
    const progressBarBackground = document.querySelector('.progress-ring__background'); // Arka plan için
    const resetButton = document.getElementById('reset-button'); // Sıfırlama butonu

    // Ayarlar Elementleri
    const focusDurationInput = document.getElementById('focus-duration');
    const shortBreakDurationInput = document.getElementById('short-break-duration');
    const longBreakDurationInput = document.getElementById('long-break-duration');
    const saveSettingsButton = document.getElementById('save-settings-btn');

    // Elementlerin varlığını kontrol et
    if (!timeLeftDisplay || !modeLabel || !controlButton || !buttonIcon || !cycleInfo || !progressBar || !progressBarBackground || !resetButton || !focusDurationInput || !shortBreakDurationInput || !longBreakDurationInput || !saveSettingsButton) {
        console.error("Pomodoro için gerekli DOM elementlerinden biri veya birkaçı bulunamadı!");
        return null; // Başlatılamadığını belirtmek için null döndür
    }

    // --- Progress Bar Hesaplamaları ---
    let radius = 0;
    let circumference = 0;
    if (progressBar.r?.baseVal?.value) {
         radius = progressBar.r.baseVal.value;
         circumference = 2 * Math.PI * radius;
         progressBar.style.strokeDasharray = `${circumference} ${circumference}`;
         progressBar.style.strokeDashoffset = circumference;
     } else {
         console.warn("Progress bar circle (SVG circle 'r' attribute) not found or invalid for calculations.");
     }

    // --- Zamanlayıcı Durum Değişkenleri ---
    let timerId = null;
    let timeLeft = 0;
    let totalTime = 0;
    let isRunning = false;
    let currentMode = 'focus'; // 'focus', 'shortBreak', 'longBreak'
    let currentCycle = 1;
    const pomodorosBeforeLongBreak = 4;

    // --- Ayarlar ---
    const defaultSettings = {
        focus: 25,
        shortBreak: 5,
        longBreak: 15,
    };

    // Ayarları Yükle
    function loadSettings() {
        const savedSettings = localStorage.getItem('pomodoroSettings');
        let settings;
        if (savedSettings) {
            try {
                settings = JSON.parse(savedSettings);
                if (typeof settings.focus !== 'number' || typeof settings.shortBreak !== 'number' || typeof settings.longBreak !== 'number' ||
                    settings.focus <= 0 || settings.shortBreak <= 0 || settings.longBreak <= 0) {
                   throw new Error("Invalid settings format or values");
                }
            } catch (e) {
                console.error("Failed to parse settings or invalid values found, using defaults.", e);
                settings = { ...defaultSettings };
                localStorage.removeItem('pomodoroSettings');
            }
        } else {
            settings = { ...defaultSettings };
        }
        focusDurationInput.value = settings.focus;
        shortBreakDurationInput.value = settings.shortBreak;
        longBreakDurationInput.value = settings.longBreak;
        console.log("Pomodoro settings loaded:", settings);
        return settings;
    }

    // Ayarları Kaydet
    function saveSettings() {
        const focusVal = parseInt(focusDurationInput.value, 10);
        const shortBreakVal = parseInt(shortBreakDurationInput.value, 10);
        const longBreakVal = parseInt(longBreakDurationInput.value, 10);

        const newSettings = {
            focus: focusVal > 0 ? focusVal : defaultSettings.focus,
            shortBreak: shortBreakVal > 0 ? shortBreakVal : defaultSettings.shortBreak,
            longBreak: longBreakVal > 0 ? longBreakVal : defaultSettings.longBreak,
        };

        focusDurationInput.value = newSettings.focus;
        shortBreakDurationInput.value = newSettings.shortBreak;
        longBreakDurationInput.value = newSettings.longBreak;

        localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
        settings = newSettings;
        console.log("Pomodoro settings saved:", settings);
        resetTimerToCurrentMode(true); // Ayarlar değiştiği için zamanlayıcıyı sıfırla
    }

    let settings = loadSettings();

    // Moda göre süreyi saniye cinsinden al
    function getTimeForMode(mode) {
        switch (mode) {
            case 'focus':       return settings.focus * 60;
            case 'shortBreak':  return settings.shortBreak * 60;
            case 'longBreak':   return settings.longBreak * 60;
            default:            return settings.focus * 60;
        }
    }

    // Ekranı Güncelle
    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeLeftDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (circumference > 0 && totalTime > 0) {
            const progress = (totalTime - timeLeft) / totalTime;
            const offset = circumference * (1 - progress);
            progressBar.style.strokeDashoffset = Math.max(0, offset);
        } else {
             progressBar.style.strokeDashoffset = circumference;
        }

        progressBar.classList.remove('focus', 'shortBreak', 'longBreak');
        switch(currentMode) {
            case 'focus':
                modeLabel.textContent = 'ODAKLANMA';
                progressBar.classList.add('focus');
                break;
            case 'shortBreak':
                modeLabel.textContent = 'KISA MOLA';
                 progressBar.classList.add('shortBreak');
                break;
            case 'longBreak':
                modeLabel.textContent = 'UZUN MOLA';
                 progressBar.classList.add('longBreak');
                break;
        }

        buttonIcon.textContent = isRunning ? '❚❚' : '▶';
        controlButton.setAttribute('aria-label', isRunning ? 'Duraklat' : 'Başlat');
        cycleInfo.textContent = `${currentCycle}/${pomodorosBeforeLongBreak}`;
        document.title = `${timeLeftDisplay.textContent} - ${modeLabel.textContent}`;
    }

    // Zamanlayıcıyı Başlat
    function startTimer() {
        if (isRunning) return;
        if (totalTime <= 0 || timeLeft <= 0) {
             totalTime = getTimeForMode(currentMode);
             timeLeft = totalTime;
        }
        isRunning = true;
        if (timerId) clearInterval(timerId);
        timerId = setInterval(() => {
            timeLeft--;
            if (timeLeft < 0) {
                clearInterval(timerId);
                timerId = null;
                isRunning = false;
                console.log(`${modeLabel.textContent} bitti!`);
                switchMode();
            } else {
                updateDisplay();
            }
        }, 1000);
        updateDisplay();
        console.log("Pomodoro timer started. Mode:", currentMode, "Duration:", totalTime);
    }

    // Zamanlayıcıyı Duraklat
    function pauseTimer() {
        if (!isRunning) return;
        isRunning = false;
        clearInterval(timerId);
        timerId = null;
        updateDisplay();
        console.log("Pomodoro timer paused.");
    }

    // Zamanlayıcıyı Başlat/Duraklat
    function toggleTimer() {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

     // Zamanlayıcıyı mevcut moda göre sıfırla
     function resetTimerToCurrentMode(settingsJustChanged = false) {
        pauseTimer();
        timeLeft = getTimeForMode(currentMode);
        totalTime = timeLeft;
        timerId = null;
        isRunning = false;
        console.log("Pomodoro timer reset to mode:", currentMode, "Duration:", totalTime);
        updateDisplay();
    }

    // Zamanlayıcıyı ve döngüyü tamamen başa al
    function resetFullCycle() {
        pauseTimer();
        currentMode = 'focus';
        currentCycle = 1;
        settings = loadSettings(); // En son kaydedilen ayarları yükle
        resetTimerToCurrentMode();
        console.log("Pomodoro full cycle reset.");
    }

    // Mod Değiştir
    function switchMode() {
        const previousMode = currentMode;
        let playNotification = true;

        if (currentMode === 'focus') {
            if (currentCycle >= pomodorosBeforeLongBreak) {
                currentMode = 'longBreak';
                 console.log("Switching to Long Break");
            } else {
                currentMode = 'shortBreak';
                 console.log("Switching to Short Break");
            }
        } else {
            currentMode = 'focus';
             if (previousMode === 'shortBreak') {
                 currentCycle++;
                 console.log("Switching to Focus, Cycle:", currentCycle);
             } else if (previousMode === 'longBreak') {
                 currentCycle = 1;
                  console.log("Switching to Focus after Long Break, Cycle:", currentCycle);
             }
             playNotification = false; // Focus başlayınca bildirim çalma
             resetTimerToCurrentMode(); // Zamanı sıfırla ama otomatik başlatma
        }

        // Mola başladığında otomatik başlat
        if (currentMode !== 'focus') {
            resetTimerToCurrentMode();
             startTimer(); // Molaları otomatik başlat
        }

        if (playNotification) {
             try {
                console.log("Playing end-of-period notification (simulated)");
                // new Audio('path/to/notification.mp3').play();
             } catch (e) { console.warn("Could not play notification sound.", e); }
        }
         // Yeni mod için ekranı hemen güncelle (resetTimerToCurrentMode içinde zaten yapılıyor)
         // updateDisplay();
    }

    // --- Event Listeners ---
    controlButton.addEventListener('click', toggleTimer);
    saveSettingsButton.addEventListener('click', saveSettings);
    resetButton.addEventListener('click', resetFullCycle);

    // --- Initial Setup ---
    resetTimerToCurrentMode(); // Başlangıç durumunu ayarla

    console.log("Pomodoro Initialized Successfully.");

     return { // Dışarıya açılacak metodlar (gerekirse)
         pause: pauseTimer,
         start: startTimer,
         reset: resetFullCycle
     };

} // initializePomodoro fonksiyonunun sonu