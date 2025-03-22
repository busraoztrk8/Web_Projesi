const togglePassword = document.querySelector('#togglePassword');
const password = document.querySelector('#password');

if (togglePassword && password) { // Bu kontrol önemli! Elemanlar yoksa hata vermesin.
    togglePassword.addEventListener('click', function () {
        // toggle the type attribute
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);
        // toggle the eye slash icon
        this.classList.toggle('fa-eye-slash');  // Doğru class isimleri
        this.classList.toggle('fa-eye');       // Doğru class isimleri

    });
}