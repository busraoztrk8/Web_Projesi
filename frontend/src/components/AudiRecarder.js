function AudioRecorder({ onRecordComplete }) {
    const recorderDiv = document.createElement('div');
    recorderDiv.classList.add('audio-recorder');
  
    const startButton = document.createElement('button');
    startButton.textContent = 'Kaydı Başlat';
    recorderDiv.appendChild(startButton);
  
    const stopButton = document.createElement('button');
    stopButton.textContent = 'Kaydı Durdur';
    stopButton.disabled = true; // Başlangıçta durdur butonu pasif
    recorderDiv.appendChild(stopButton);
  
    let mediaRecorder;
    let audioChunks = [];
  
    startButton.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
  
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
  
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            onRecordComplete(audioBlob); // Callback fonksiyonuna Blob'u gönder
            audioChunks = []; //Temizle.
  
            //(İsteğe bağlı) Kaydedilen sesi önizleme için bir audio elementi oluştur.
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = document.createElement("audio");
            audio.src = audioUrl;
            audio.controls = true;
            recorderDiv.appendChild(audio);
        };
  
  
        mediaRecorder.start();
        startButton.disabled = true;
        stopButton.disabled = false;
      } catch (error) {
        console.error('Mikrofon erişim hatası:', error);
        alert("Mikrofonunuza erişim izni verdiğinizden emin olun.");
      }
    });
  
    stopButton.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        startButton.disabled = false;
        stopButton.disabled = true;
      }
    });
  
    return recorderDiv;
  }
  
  export default AudioRecorder;