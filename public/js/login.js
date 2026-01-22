document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');

    // 백엔드 API 주소 (FastAPI 서버)
    const API_BASE_URL = 'http://localhost:8000';

    // Regex patterns
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

    function validateInput() {
        const email = emailInput.value;
        const password = passwordInput.value;

        let isEmailValid = false;
        let isPasswordValid = false;

        // Email Validation
        if (!email) {
            emailError.textContent = "이메일을 입력해주세요.";
            emailError.classList.add('show');
        } else if (!emailRegex.test(email)) {
            emailError.textContent = "올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)";
            emailError.classList.add('show');
        } else {
            emailError.textContent = "";
            emailError.classList.remove('show');
            isEmailValid = true;
        }

        // Password Validation
        if (!password) {
            passwordError.textContent = "비밀번호를 입력해주세요.";
            passwordError.classList.add('show');
        } else if (!passwordRegex.test(password)) {
            passwordError.textContent = "비밀번호는 8~20자, 대/소문자/숫자/특수문자를 포함해야 합니다.";
            passwordError.classList.add('show');
        } else {
            passwordError.textContent = "";
            passwordError.classList.remove('show');
            isPasswordValid = true;
        }

        // Button State
        if (isEmailValid && isPasswordValid) {
            loginBtn.disabled = false;
            loginBtn.classList.add('active');
        } else {
            loginBtn.disabled = true;
            loginBtn.classList.remove('active');
        }
    }

    // Event Listeners (2-1. Event 처리)
    emailInput.addEventListener('input', validateInput);
    passwordInput.addEventListener('input', validateInput);

    // Initial check
    validateInput();

    // Form submission with Fetch API (2-2. Fetch 적용)
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (loginBtn.disabled) {
            return;
        }

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            // 로딩 상태 표시
            loginBtn.textContent = '로그인 중...';
            loginBtn.disabled = true;

            // Fetch API 호출
            const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // 쿠키 포함 (세션 유지)
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const result = await response.json();

            if (response.ok) {
                // 로그인 성공
                alert(`로그인 성공! ${result.message}`);
                window.location.href = '/posts';
            } else {
                // 로그인 실패 (서버에서 보낸 에러 메시지 표시)
                alert(`로그인 실패: ${result.message}`);
                loginBtn.textContent = '로그인';
                loginBtn.disabled = false;
                loginBtn.classList.add('active');
            }
        } catch (error) {
            // 네트워크 에러 등
            console.error('Login error:', error);
            alert('서버 연결에 실패했습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
            loginBtn.textContent = '로그인';
            loginBtn.disabled = false;
            loginBtn.classList.add('active');
        }
    });
});
