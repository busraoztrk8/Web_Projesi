// Günlükleri saklamak için geçici bir dizi
let diaryEntries = [];

// Günlük kaydetme
document.getElementById("save-diary").addEventListener("click", () => {
    const diaryText = document.getElementById("diary-text").value;
    if (diaryText.trim() === "") {
        alert("Lütfen bir şeyler yazın!");
        return;
    }

    const newEntry = {
        id: Date.now(),
        text: diaryText,
    };

    diaryEntries.push(newEntry);
    document.getElementById("diary-text").value = "";
    renderDiaryEntries();
});

// Günlükleri listeleme
function renderDiaryEntries() {
    const diaryList = document.getElementById("diary-entries");
    diaryList.innerHTML = "";

    if (diaryEntries.length === 0) {
        diaryList.innerHTML = "<li>Henüz günlük eklenmedi.</li>";
        return;
    }

    diaryEntries.forEach((entry) => {
        const listItem = document.createElement("li");
        listItem.textContent = entry.text;

        const editButton = document.createElement("button");
        editButton.textContent = "Düzenle";
        editButton.addEventListener("click", () => editDiaryEntry(entry.id));

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Sil";
        deleteButton.addEventListener("click", () => deleteDiaryEntry(entry.id));

        listItem.appendChild(editButton);
        listItem.appendChild(deleteButton);
        diaryList.appendChild(listItem);
    });
}

// Günlük düzenleme
function editDiaryEntry(id) {
    const entry = diaryEntries.find((entry) => entry.id === id);
    const newText = prompt("Günlüğü düzenleyin:", entry.text);
    if (newText !== null) {
        entry.text = newText;
        renderDiaryEntries();
    }
}

// Günlük silme
function deleteDiaryEntry(id) {
    diaryEntries = diaryEntries.filter((entry) => entry.id !== id);
    renderDiaryEntries();
}

// Ses kaydı için gerekli değişkenler
// Ses kaydı için gerekli değişkenler
let mediaRecorder;
let audioChunks = [];
let audioBlob;

// Ses kaydını başlatma
document.getElementById("start-recording").addEventListener("click", async () => {
    try {
        // Kullanıcıdan mikrofon erişimi izni al
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        // Ses verilerini toplama
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        // Kaydı durdurduktan sonra ses dosyasını oluştur
        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: "audio/wav" });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audioPlayback = document.getElementById("audio-playback");
            audioPlayback.src = audioUrl;
            audioChunks = []; // Yeni kayıt için temizle
        };

        // Kaydı başlat
        mediaRecorder.start();
        document.getElementById("start-recording").disabled = true;
        document.getElementById("stop-recording").disabled = false;
        document.getElementById("save-recording").disabled = true;
    } catch (error) {
        console.error("Mikrofon erişimi reddedildi veya bir hata oluştu:", error);
        alert("Ses kaydı başlatılamadı. Lütfen mikrofon erişimini kontrol edin.");
    }
});

// Ses kaydını durdurma
document.getElementById("stop-recording").addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        document.getElementById("start-recording").disabled = false;
        document.getElementById("stop-recording").disabled = true;
        document.getElementById("save-recording").disabled = false;
    }
});

// Ses kaydını kaydetme
document.getElementById("save-recording").addEventListener("click", () => {
    if (audioBlob) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(audioBlob);
        link.download = "recording.wav";
        link.click();
        alert("Ses kaydı başarıyla kaydedildi!");
    } else {
        alert("Kaydedilecek bir ses bulunamadı!");
    }
});


