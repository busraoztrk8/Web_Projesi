const API_BASE_URL = '/api';  // Backend API'nizin adresi

// Kullanıcı kaydı
async function registerUser(username, password, email) {
    const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, email }),
    });

     if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Kayıt başarısız.');
    }
    return response.json();
}



// Kullanıcı girişi
async function loginUser(username, password) {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Giriş başarısız');
    }
    return response.json(); //Giriş başarılıysa, token vs. dönebilir.
}



// Günlük girişlerini getir
async function getEntries(token) {
    const response = await fetch(`${API_BASE_URL}/entries`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Token'ı gönder
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Günlükler alınamadı.");
    }
    return response.json();
}

// Yeni günlük girişi ekle
async function addEntry(content, token) {
    const response = await fetch(`${API_BASE_URL}/entries`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
    });
     if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Günlük eklenemedi.');
    }
    return response.json();
}

//Günlük girişini güncelle
async function updateEntry(entryId, content, token){
      const response = await fetch(`${API_BASE_URL}/entries/${entryId}`,{
        method:"PUT",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({content})
      });

      if(!response.ok){
         const errorData = await response.json();
         throw new Error(errorData.message || "Günlük güncellenemedi");
      }
      return response.json();
}


// Günlük girişini sil
async function deleteEntry(entryId, token){
    const response = await fetch(`${API_BASE_URL}/entries/${entryId}`,{
        method:"DELETE",
        headers:{
             'Authorization': `Bearer ${token}`,
        }
    });
    if(!response.ok){
         const errorData = await response.json();
         throw new Error(errorData.message || "Günlük silinemedi.");
    }
    return response.json(); //Silme işlemi başarılıysa bilgi dön.

}

// Ses kaydını backend'e gönder ve metne çevir
async function convertAudioToText(audioBlob, token) {
  const formData = new FormData();
  formData.append('audio', audioBlob);

    const response = await fetch(`${API_BASE_URL}/convert_audio`, { // Yeni endpoint (backend'e eklenecek)
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            // 'Content-Type' belirtmiyoruz, FormData otomatik halleder
        },
         body: formData,
    });
      if(!response.ok){
        const errorData = await response.json();
        throw new Error(errorData.message || "Ses metne çevrilemedi.");
    }

    return response.json();
}

export { registerUser, loginUser, getEntries, addEntry, updateEntry, deleteEntry, convertAudioToText };