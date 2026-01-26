// password.js - 비밀번호 수정 페이지 로직

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:8000';

    // ==========================================
    // 1. Elements
    // ==========================================
    // Header & Dropdown
    const profileIcon = document.getElementById('profileIcon');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    // Form Elements
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Helper Texts
    const currentPasswordHelper = document.getElementById('currentPasswordHelper');
    const newPasswordHelper = document.getElementById('newPasswordHelper');
    const confirmPasswordHelper = document.getElementById('confirmPasswordHelper');

    const submitBtn = document.getElementById('submitBtn');
    const toast = document.getElementById('toast');

    // State
    let currentUser = null;

    // ==========================================
    // 2. Helper Functions
    // ==========================================
    function showHelper(element, message) {
        element.textContent = message;
        element.classList.add('show');
    }

    function hideHelper(element) {
        element.textContent = '';
        element.classList.remove('show');
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    // 비밀번호 유효성 검사 (8~20자, 대/소/숫/특 포함)
    function validatePassword(password) {
        // const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
        // 백엔드 utils.validate_password 참고:
        // 단순히 길이와 문자 종류 확인인 경우가 많음, 여기서는 상세 규칙 적용

        if (!password) return { valid: false, message: '*비밀번호를 입력해주세요.' };

        if (password.length < 8 || password.length > 20) {
            return { valid: false, message: '*비밀번호는 8자 이상, 20자 이하이어야 합니다.' };
        }

        // 대문자, 소문자, 숫자, 특수문자 각각 최소 1개
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!(hasUpper && hasLower && hasNumber && hasSpecial)) {
            return { valid: false, message: '*비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.' };
        }

        return { valid: true };
    }

    function checkFormValidity() {
        const currentPw = currentPasswordInput.value;
        const newPw = newPasswordInput.value;
        const confirmPw = confirmPasswordInput.value;

        // 1. 현재 비밀번호 입력 여부
        if (!currentPw) {
            submitBtn.disabled = true;
            submitBtn.classList.remove('active');
            return;
        }

        // 2. 새 비밀번호 유효성
        const newPwValidation = validatePassword(newPw);
        if (!newPwValidation.valid) {
            submitBtn.disabled = true;
            submitBtn.classList.remove('active');
            return;
        }

        // 3. 비밀번호 확인 일치 여부
        if (newPw !== confirmPw) {
            submitBtn.disabled = true;
            submitBtn.classList.remove('active');
            return;
        }

        // 모두 통과
        submitBtn.disabled = false;
        submitBtn.classList.add('active');
    }

    // ==========================================
    // 3. API & Data Loading
    // ==========================================
    async function loadUserData() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/auth/me`, {
                credentials: 'include'
            });

            if (!response.ok) {
                showCustomModal('로그인이 필요합니다.', () => {
                    window.location.href = 'login.html';
                });
                return;
            }

            const result = await response.json();
            currentUser = result.data || result;

            if (currentUser.profileImage) {
                profileIcon.style.backgroundImage = `url(${currentUser.profileImage})`;
            }
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    }

    // ==========================================
    // 4. Event Handlers
    // ==========================================
    // Dropdown
    profileIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!profileDropdown.contains(e.target) && e.target !== profileIcon) {
            profileDropdown.classList.remove('show');
        }
    });

    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_BASE_URL}/v1/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            showCustomModal('로그아웃 되었습니다.', () => {
                window.location.href = 'login.html';
            });
        } catch (error) {
            console.error('Logout failed:', error);
        }
    });

    // Inputs
    currentPasswordInput.addEventListener('input', () => {
        if (!currentPasswordInput.value) {
            showHelper(currentPasswordHelper, '*비밀번호를 입력해주세요');
        } else {
            hideHelper(currentPasswordHelper);
        }
        checkFormValidity();
    });

    newPasswordInput.addEventListener('input', () => {
        const val = validatePassword(newPasswordInput.value);
        if (!val.valid) {
            showHelper(newPasswordHelper, val.message);
        } else {
            hideHelper(newPasswordHelper);
        }
        // 확인 필드랑 일치 여부도 다시 체크 필요할 수 있음
        checkFormValidity();
    });

    confirmPasswordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value !== newPasswordInput.value) {
            showHelper(confirmPasswordHelper, '*비밀번호가 일치하지 않습니다');
        } else {
            hideHelper(confirmPasswordHelper);
        }
        checkFormValidity();
    });

    // Submit
    submitBtn.addEventListener('click', async () => {
        if (submitBtn.disabled) return;

        const payload = {
            currentPassword: currentPasswordInput.value,
            newPassword: newPasswordInput.value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/v1/users/${currentUser.userId}/password`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                showToast('수정 완료');
                // 입력 필드 초기화
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
                submitBtn.disabled = true;
                submitBtn.classList.remove('active');
            } else {
                // 에러 처리
                if (data.code === 'INVALID_CURRENT_PASSWORD') {
                    showHelper(currentPasswordHelper, '*현재 비밀번호가 일치하지 않습니다.');
                } else {
                    showCustomModal(data.message || '비밀번호 변경에 실패했습니다.');
                }
            }
        } catch (error) {
            console.error('Password change error:', error);
            showCustomModal('서버 통신 중 오류가 발생했습니다.');
        }
    });

    // ==========================================
    // 5. Initialize
    // ==========================================
    loadUserData();
});
