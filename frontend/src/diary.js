// diary.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("diary.js: Initializing Diary with AI Plan Modal...");

    // --- Element Referansları ---
    const diaryTitleInput = document.getElementById('diary-title');
    const diaryContentDiv = document.getElementById('diary-content');
    const saveDiaryButton = document.getElementById('save-diary');
    const diaryEntriesList = document.getElementById('diary-entries');
    const analyzeSentimentButton = document.getElementById('analyze-sentiment-button');

    // --- Modal Elementleri ---
    const analysisModal = document.getElementById('analysis-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const modalLoading = document.getElementById('modal-loading');
    const modalResults = document.getElementById('modal-results');
    const modalSentimentResult = document.getElementById('modal-sentiment-result');
    const modalPlanContent = document.getElementById('modal-plan-content');
    const modalError = document.getElementById('modal-error');

    // --- Öneri Div'ini Bul veya Oluştur ---
    let recommendationDiv = document.getElementById('ai-recommendation');
    if (!recommendationDiv && saveDiaryButton?.parentNode) {
        recommendationDiv = document.createElement('div');
        recommendationDiv.id = 'ai-recommendation';
        recommendationDiv.style.marginTop = '15px';
        recommendationDiv.style.padding = '12px';
        recommendationDiv.style.border = '1px solid #e0e0e0';
        recommendationDiv.style.borderRadius = '6px';
        recommendationDiv.style.backgroundColor = '#fafafa';
        recommendationDiv.style.lineHeight = '1.5';
        recommendationDiv.style.fontSize = '0.9em';
        recommendationDiv.style.color = '#444';
        recommendationDiv.style.display = 'none';
        saveDiaryButton.parentNode.insertBefore(recommendationDiv, saveDiaryButton.nextSibling);
    } else if (!recommendationDiv) {
        console.error("Couldn't find a place to insert the recommendation div.");
    }

    // Toolbar Elementleri
    const fontFamilySelect = document.getElementById('font-family-select');
    const fontSizeSelect = document.getElementById('font-size-select');
    const fontColorPicker = document.getElementById('font-color-picker');
    const pageColorPicker = document.getElementById('page-color-picker');
    const toolbarButtons = document.querySelectorAll('.toolbar-button');

    // Ses Kaydı Elementleri
    const startRecordingButton = document.getElementById('start-recording');
    const stopRecordingButton = document.getElementById('stop-recording');
    const saveAudioButton = document.getElementById('save-audio');
    const cancelRecordingButton = document.getElementById('cancel-recording');
    const audioPlayback = document.getElementById('audio-playback');

    // --- API ve Genel Değişkenler ---
    const API_DIARY_URL = '/api/diary';
    const API_ANALYZE_PLAN_URL = '/api/diary/analyze-and-plan';
    let diaryEntries = [];
    let currentlyEditingId = null;

    // Ses kaydı değişkenleri
    let mediaRecorder; let audioChunks = []; let audioBlob; let audioStream;

    // --- API ve Kullanıcı Kimliği Yardımcıları ---
    const getUserId = () => {
        const userId = localStorage.getItem('user_id');
        if (!userId) { console.error("User ID not found..."); alert("Lütfen tekrar giriş yapınız."); window.location.href = '/login.html'; return null; }
        return userId;
    };

    const apiRequest = async (url, options = {}) => {
        const userId = getUserId();
        if (!userId) return Promise.reject(new Error("Kimlik doğrulama gerekli."));
        const headers = { 'Content-Type': 'application/json', 'X-User-ID': userId, ...(options.headers || {}) };
        try {
            const response = await fetch(url, { ...options, headers });
            if (response.status === 401) { localStorage.removeItem('user_id'); localStorage.removeItem('loggedInUser'); alert("Oturumunuz geçersiz..."); window.location.href = '/login.html'; return Promise.reject(new Error("Unauthorized (401)")); }
            if (response.status === 204 && options.method === 'DELETE') return {};
            const contentType = response.headers.get("content-type");
            const contentLength = response.headers.get("content-length");
            if (!response.ok) { let errorData = { message: `Sunucu hatası: ${response.status}` }; try { if (contentType && contentType.includes("application/json")) errorData = await response.json(); else errorData.message = await response.text(); } catch (e) {} throw new Error(errorData.message || `API hatası: ${response.status}`); }
            if (response.status === 204 || contentLength === '0' || !contentType || !contentType.includes("application/json")) { if (options.method === 'GET' || !options.method) return []; return {}; }
            return await response.json();
        } catch (error) { if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) { console.error(`API Request Failed: ${options.method || 'GET'} ${url}`, error); throw error; } return Promise.reject(error); }
    };

    // --- Zengin Metin Düzenleyici İşlevleri ---
    const formatDoc = (cmd, value = null) => { if (document.activeElement !== diaryContentDiv) diaryContentDiv.focus(); document.execCommand(cmd, false, value); diaryContentDiv.focus(); };
    if(fontFamilySelect) fontFamilySelect.addEventListener('change', () => { formatDoc('fontName', fontFamilySelect.value); if(diaryContentDiv) diaryContentDiv.style.fontFamily = fontFamilySelect.value; });
    if(fontSizeSelect) fontSizeSelect.addEventListener('change', () => formatDoc('fontSize', fontSizeSelect.value));
    if(fontColorPicker) fontColorPicker.addEventListener('input', () => formatDoc('foreColor', fontColorPicker.value));
    if(toolbarButtons) toolbarButtons.forEach(button => button.addEventListener('click', (e) => { e.preventDefault(); formatDoc(button.dataset.command); }));
    if(pageColorPicker) pageColorPicker.addEventListener('input', () => document.body.style.backgroundColor = pageColorPicker.value);
    // --- Zengin Metin Düzenleyici Sonu ---

    // --- Modal Yönetimi ---
    function showModal() {
        if (!analysisModal || !modalLoading || !modalResults || !modalError || !modalSentimentResult || !modalPlanContent) { console.error("Modal elementleri bulunamadı!"); return; }
        modalSentimentResult.innerHTML = ''; modalPlanContent.innerHTML = '';
        modalError.style.display = 'none'; modalResults.style.display = 'none';
        modalLoading.style.display = 'block'; analysisModal.classList.add('visible');
    }
    function hideModal() { if (analysisModal) analysisModal.classList.remove('visible'); }
    if (closeModalButton) closeModalButton.addEventListener('click', hideModal);
    if (analysisModal) analysisModal.addEventListener('click', (event) => { if (event.target === analysisModal) hideModal(); });
    // --- Modal Yönetimi Sonu ---

    // --- Günlük Yönetimi (API Entegrasyonu) ---
    function resetEditorForm() {
        if(diaryTitleInput) diaryTitleInput.value = ""; if(diaryContentDiv) diaryContentDiv.innerHTML = ""; currentlyEditingId = null;
        if(saveDiaryButton) { saveDiaryButton.textContent = 'Günlüğü Kaydet'; saveDiaryButton.disabled = false;}
        hideModal();
        const sentimentDiv = document.getElementById('sentiment-result'); // ID ile bulalım
        const recommendDiv = document.getElementById('ai-recommendation');
        if (sentimentDiv) { sentimentDiv.textContent = ''; sentimentDiv.style.backgroundColor = 'transparent'; sentimentDiv.style.padding='0';}
        if (recommendDiv) { recommendDiv.innerHTML = ''; recommendDiv.style.display = 'none';}
        if(diaryContentDiv) diaryContentDiv.style.fontFamily = ''; if(fontFamilySelect) fontFamilySelect.value = fontFamilySelect.options[0].value; if(fontSizeSelect) fontSizeSelect.value = '3'; if(fontColorPicker) fontColorPicker.value = '#000000';
    }

    const saveOrUpdateDiary = async () => {
        if (!diaryTitleInput || !diaryContentDiv || !saveDiaryButton) return;
        const title = diaryTitleInput.value.trim(); let contentHTML = diaryContentDiv.innerHTML.trim();
        if (contentHTML === '<br>' || contentHTML === '<br/>' || contentHTML === '') { alert("Lütfen içerik alanını doldurun!"); return; }
        if (title === "") { alert("Lütfen başlık alanını doldurun!"); return; }
        saveDiaryButton.disabled = true; saveDiaryButton.textContent = currentlyEditingId ? 'Güncelleniyor...' : 'Kaydediliyor...';
        const diaryData = { baslik: title, dusunce: contentHTML };
        try {
            let successMessage = '';
            if (currentlyEditingId !== null) { await apiRequest(`${API_DIARY_URL}/${currentlyEditingId}`, { method: 'PUT', body: JSON.stringify(diaryData) }); successMessage = 'Günlük başarıyla güncellendi!'; }
            else { await apiRequest(API_DIARY_URL, { method: 'POST', body: JSON.stringify(diaryData) }); successMessage = 'Günlük başarıyla kaydedildi!'; }
            alert(successMessage); resetEditorForm(); await loadDiaryEntries();
        } catch (error) { if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) { console.error("Diary save/update API error:", error); alert(`Günlük kaydedilemedi/güncellenemedi: ${error.message}`); } saveDiaryButton.disabled = false; saveDiaryButton.textContent = currentlyEditingId ? 'Günlüğü Güncelle' : 'Günlüğü Kaydet'; }
    };
    if(saveDiaryButton) saveDiaryButton.addEventListener('click', saveOrUpdateDiary);

    const loadDiaryEntries = async () => {
        if (!diaryEntriesList) return;
        console.log(`Loading diary entries via GET ${API_DIARY_URL}`);
        diaryEntriesList.innerHTML = "<li>Günlükler yükleniyor...</li>";
        try {
            const entriesFromApi = await apiRequest(API_DIARY_URL);
            diaryEntries = Array.isArray(entriesFromApi) ? entriesFromApi : [];
            renderDiaryEntries();
            console.log("Diary entries loaded:", diaryEntries.length);
        } catch (error) { if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) { console.error("Failed to load diary entries:", error); diaryEntriesList.innerHTML = `<li style='color: red;'>Günlükler yüklenemedi: ${error.message}</li>`; } }
    };

    function renderDiaryEntries() {
        if (!diaryEntriesList) return;
        diaryEntriesList.innerHTML = "";
        if (!Array.isArray(diaryEntries) || diaryEntries.length === 0) { diaryEntriesList.innerHTML = "<li>Henüz günlük eklenmedi.</li>"; return; }
        try {
            diaryEntries.forEach((entry) => {
                if (!entry || typeof entry.id === 'undefined') { console.warn("Skipping invalid entry:", entry); return; }
                const listItem = document.createElement("li"); listItem.dataset.entryId = entry.id;
                const actionsContainer = document.createElement("div"); actionsContainer.classList.add("entry-actions");
                const editButton = document.createElement("button"); editButton.innerHTML = '<i class="fas fa-edit"></i>'; editButton.classList.add("entry-action-button", "edit-button"); editButton.title = 'Düzenle'; editButton.addEventListener("click", (e) => { e.stopPropagation(); editDiaryEntry(entry.id); });
                const deleteButton = document.createElement("button"); deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>'; deleteButton.classList.add("entry-action-button", "delete-button"); deleteButton.title = 'Sil'; deleteButton.addEventListener("click", (e) => { e.stopPropagation(); deleteDiaryEntry(entry.id); });
                actionsContainer.appendChild(editButton); actionsContainer.appendChild(deleteButton); listItem.appendChild(actionsContainer);
                const entryTitle = document.createElement("div"); entryTitle.classList.add("entry-title"); entryTitle.textContent = entry.baslik || '(Başlık Yok)';
                if (entry.sentimentLabel && entry.sentimentLabel !== 'bilinmiyor') { const sentimentBadge = document.createElement('span'); sentimentBadge.textContent = entry.sentimentLabel.charAt(0).toUpperCase() + entry.sentimentLabel.slice(1); sentimentBadge.style.display = 'inline-block'; sentimentBadge.style.padding = '3px 8px'; sentimentBadge.style.fontSize = '0.7em'; sentimentBadge.style.marginLeft = '10px'; sentimentBadge.style.borderRadius = '10px'; sentimentBadge.style.color = 'white'; sentimentBadge.style.fontWeight = '500'; sentimentBadge.style.lineHeight = '1'; sentimentBadge.style.verticalAlign = 'middle'; switch (entry.sentimentLabel) { case 'pozitif': sentimentBadge.style.backgroundColor = '#4CAF50'; sentimentBadge.title = 'Pozitif Duygu'; break; case 'negatif': sentimentBadge.style.backgroundColor = '#F44336'; sentimentBadge.title = 'Negatif Duygu'; break; case 'nötr': sentimentBadge.style.backgroundColor = '#FF9800'; sentimentBadge.title = 'Nötr Duygu'; break; default: sentimentBadge.style.backgroundColor = '#757575'; sentimentBadge.title = 'Duygu Belirlenemedi'; sentimentBadge.textContent = '?'; } entryTitle.appendChild(sentimentBadge); }
                listItem.appendChild(entryTitle);
                const entryContent = document.createElement("div"); entryContent.classList.add("entry-content"); entryContent.innerHTML = entry.dusunce || ''; listItem.appendChild(entryContent);
                const entryDate = document.createElement("small"); let createdText = '?'; let modifiedText = ''; try { if (entry.createdAt) createdText = `Oluşturuldu: ${new Date(entry.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}`; if (entry.lastModifiedAt && entry.lastModifiedAt !== entry.createdAt) modifiedText = ` | Düzenlendi: ${new Date(entry.lastModifiedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}`; } catch (e) { console.warn("Date parse error:", e); createdText = `Oluşturuldu: ${entry.createdAt || '?'}`; modifiedText = entry.lastModifiedAt ? ` | Düzenlendi: ${entry.lastModifiedAt}` : ''; } entryDate.textContent = createdText + modifiedText; entryDate.style.display = 'block'; entryDate.style.marginTop = '5px'; entryDate.style.color = '#777'; listItem.appendChild(entryDate);
                diaryEntriesList.appendChild(listItem);
            });
        } catch (renderError) { console.error("Render error:", renderError); diaryEntriesList.innerHTML = `<li style='color: red;'>Liste oluşturulurken hata: ${renderError.message}</li>`; }
    }

    /** Düzenleme modunu başlatır, formu doldurur. */
    function editDiaryEntry(id) {
        const entryToEdit = diaryEntries.find((entry) => entry.id === id);
        if (!entryToEdit || !diaryTitleInput || !diaryContentDiv || !saveDiaryButton) { console.error("Edit entry not found or editor elements missing:", id); alert("Düzenlenecek günlük bulunamadı veya düzenleyici yüklenemedi."); return; }
        diaryTitleInput.value = entryToEdit.baslik || ''; diaryContentDiv.innerHTML = entryToEdit.dusunce || ''; currentlyEditingId = id;
        saveDiaryButton.textContent = 'Günlüğü Güncelle'; saveDiaryButton.disabled = false;
        hideModal(); // Modalı kapat
        const recommendDiv = document.getElementById('ai-recommendation');
        if (recommendDiv) { recommendDiv.innerHTML = ''; recommendDiv.style.display = 'none'; }
        diaryTitleInput.focus(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /** Seçilen günlüğü API üzerinden siler. */
    const deleteDiaryEntry = async (id) => {
        if (!confirm("Bu günlüğü silmek istediğinizden emin misiniz?")) { return; }
        const deleteButton = diaryEntriesList?.querySelector(`li[data-entry-id="${id}"] .delete-button`); if (deleteButton) deleteButton.disabled = true;
        try { await apiRequest(`${API_DIARY_URL}/${id}`, { method: 'DELETE' }); alert("Günlük başarıyla silindi."); if (currentlyEditingId === id) { resetEditorForm(); } await loadDiaryEntries();
        } catch (error) { if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) { console.error("Diary delete API error:", error); alert(`Günlük silinemedi: ${error.message}`); } if (deleteButton) deleteButton.disabled = false; }
    };

    // --- Analiz Et Butonu İşlevi ---
    if (analyzeSentimentButton && analysisModal && modalLoading && modalResults && modalSentimentResult && modalPlanContent && modalError) {
        analyzeSentimentButton.addEventListener('click', async () => {
            console.log("Analiz Et butonuna tıklandı!");
            const currentContentText = diaryContentDiv.innerText.trim();
            if (!currentContentText) { alert("Analiz etmek için lütfen önce bir şeyler yazın."); return; }

            showModal(); // Modal'ı aç
            analyzeSentimentButton.disabled = true;

            try {
                console.log("Sending request to analyze-and-plan...");
                const result = await apiRequest(API_ANALYZE_PLAN_URL, {
                    method: 'POST',
                    body: JSON.stringify({ text: currentContentText })
                });
                console.log("Analysis and Plan result received:", result);

                if (result && result.sentimentLabel && typeof result.plan !== 'undefined') {
                    modalSentimentResult.textContent = `Tespit Edilen Duygu: ${result.sentimentLabel.charAt(0).toUpperCase() + result.sentimentLabel.slice(1)}`;
                    modalSentimentResult.style.padding = '8px'; modalSentimentResult.style.borderRadius = '4px';
                    switch (result.sentimentLabel) { case 'pozitif': modalSentimentResult.style.backgroundColor = '#d4edda'; modalSentimentResult.style.color = '#155724'; break; case 'negatif': modalSentimentResult.style.backgroundColor = '#f8d7da'; modalSentimentResult.style.color = '#721c24'; break; case 'nötr': modalSentimentResult.style.backgroundColor = '#fff3cd'; modalSentimentResult.style.color = '#856404'; break; default: modalSentimentResult.style.backgroundColor = '#e2e3e5'; modalSentimentResult.style.color = '#383d41';}

                    modalPlanContent.innerHTML = result.plan.replace(/\n/g, '<br>') || '<em>Yapay zeka bir plan oluşturamadı.</em>';

                    modalLoading.style.display = 'none'; modalResults.style.display = 'block'; modalError.style.display = 'none';
                } else { throw new Error("API'den geçersiz yanıt formatı."); }
            } catch (error) {
                if (error.message !== "Unauthorized (401)" && !error.message.startsWith("Kimlik doğrulama gerekli")) {
                    console.error("Analyze/Plan API error:", error);
                    modalError.textContent = `Bir hata oluştu: ${error.message}`;
                    modalLoading.style.display = 'none'; modalResults.style.display = 'none'; modalError.style.display = 'block';
                }
            } finally { analyzeSentimentButton.disabled = false; }
        });
    } else { console.error("HATA: Analiz butonu veya gerekli modal elementleri bulunamadı!"); }
    // --- Analiz Butonu Sonu ---

    // --- Ses Kaydı İşlevleri (DEĞİŞİKLİK YOK) ---
    function setAudioButtonStates(isRecording, isStopped, canSave) { if(!startRecordingButton) return; /*...*/ }
    if(startRecordingButton) setAudioButtonStates(false, true, false);
    if(startRecordingButton) startRecordingButton.addEventListener("click", async () => { /* ... */ });
    if(stopRecordingButton) stopRecordingButton.addEventListener("click", () => { /* ... */ });
    if(saveAudioButton) saveAudioButton.addEventListener("click", () => { /* ... */ });
    if(cancelRecordingButton) cancelRecordingButton.addEventListener("click", () => { /* ... */ });
    // --- Ses Kaydı Sonu ---

    // --- Başlangıç ---
    const initialUserId = getUserId();
    if (initialUserId) {
        loadDiaryEntries(); // Sayfa yüklendiğinde günlükleri yükle
    } else {
        console.error("User ID bulunamadığı için günlükler yüklenemiyor.");
        if (diaryEntriesList) diaryEntriesList.innerHTML = "<li>Günlükleri görmek için lütfen giriş yapın.</li>";
    }

}); // DOMContentLoaded Sonu