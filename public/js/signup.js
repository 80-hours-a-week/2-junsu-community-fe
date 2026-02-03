// signup.js - showCustomModal, API_BASE_URL는 common.js에서 제공

document.addEventListener('DOMContentLoaded', () => {

    // 1. 요소 가져오기
    const signupForm = document.getElementById('signupForm');
    const signupBtn = document.getElementById('signupBtn');

    // 입력 필드
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('passwordConfirm');
    const nicknameInput = document.getElementById('nickname');
    const profileImageInput = document.getElementById('profileImageInput');
    const profilePreview = document.getElementById('profilePreview');
    const profileImgElement = profilePreview.querySelector('img');

    // 헬퍼 텍스트 요소
    const emailHelper = document.getElementById('emailHelper');
    const passwordHelper = document.getElementById('passwordHelper');
    const passwordConfirmHelper = document.getElementById('passwordConfirmHelper');
    const nicknameHelper = document.getElementById('nicknameHelper');
    const profileError = document.getElementById('profileError');

    // 유효성 검사 플래그
    let isEmailValid = false;
    let isPasswordValid = false;
    let isPasswordConfirmValid = false;
    let isNicknameValid = false;
    let isProfileImageSelected = false;


    // 헬퍼 함수
    function showHelper(element, message) {
        element.textContent = message;
        element.classList.add('show');
    }

    function hideHelper(element) {
        element.textContent = '';
        element.classList.remove('show');
    }

    function checkFormValidity() {
        // 프로필 이미지는 버튼 활성화에 영향을 주지 않지만, 안내 문구는 표시함
        if (isEmailValid && isPasswordValid && isPasswordConfirmValid && isNicknameValid) {
            signupBtn.disabled = false;
            signupBtn.classList.add('active');
        } else {
            signupBtn.disabled = true;
            signupBtn.classList.remove('active');
        }
    }

    // --- 유효성 검사 로직 ---

    // 1. 프로필 이미지
    profilePreview.addEventListener('click', () => {
        profileImageInput.click();
    });

    profileImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // 1. 미리보기 표시
            const reader = new FileReader();
            reader.onload = (e) => {
                profileImgElement.src = e.target.result;
                profilePreview.classList.add('has-image');
                isProfileImageSelected = true;
                hideHelper(profileError); // "프로필 사진을 추가해주세요" 메시지 숨김
                checkFormValidity();
            };
            reader.readAsDataURL(file);
        } else {
            // 취소하거나 파일이 없는 경우
            profileImgElement.src = '';
            profilePreview.classList.remove('has-image');
            isProfileImageSelected = false;
            showHelper(profileError, "* 프로필 사진을 추가해주세요.");
            checkFormValidity();
        }
    });


    // 2. 이메일
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    emailInput.addEventListener('focusout', async () => {
        const value = emailInput.value.trim();
        if (value === '') {
            showHelper(emailHelper, "* 이메일을 입력해주세요.");
            isEmailValid = false;
        } else if (!emailPattern.test(value)) {
            showHelper(emailHelper, "* 올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)");
            isEmailValid = false;
        } else {
            // API 중복 체크
            try {
                const response = await fetch(`http://localhost:8000/v1/auth/emails/availability?email=${encodeURIComponent(value)}`);
                const data = await response.json();

                if (response.ok) {
                    hideHelper(emailHelper);
                    isEmailValid = true;
                } else if (response.status === 409) {
                    showHelper(emailHelper, "* 이미 사용 중인 이메일입니다.");
                    isEmailValid = false;
                } else {
                    showHelper(emailHelper, data.message || "* 이메일 확인 중 오류가 발생했습니다.");
                    isEmailValid = false;
                }
            } catch (error) {
                console.error('Email check error:', error);
                // 네트워크 오류 시 일단 통과 (회원가입 시 다시 검증됨)
                hideHelper(emailHelper);
                isEmailValid = true;
            }
        }
        checkFormValidity();
    });

    // 입력 시 에러 메시지 즉시 제거 및 버튼 상태 업데이트
    emailInput.addEventListener('input', () => {
        const value = emailInput.value.trim();
        if (emailPattern.test(value)) {
            isEmailValid = true;
            hideHelper(emailHelper);
        } else {
            isEmailValid = false;
        }
        checkFormValidity();
    });


    // 3. 비밀번호
    // 규칙: 8-20자, 대문자+소문자+숫자+특수문자 포함
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

    passwordInput.addEventListener('focusout', () => {
        const value = passwordInput.value;
        if (value === '') {
            showHelper(passwordHelper, "* 비밀번호를 입력해주세요.");
            isPasswordValid = false;
        } else if (!passwordPattern.test(value)) {
            showHelper(passwordHelper, "* 비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.");
            isPasswordValid = false;
        } else {
            hideHelper(passwordHelper);
            isPasswordValid = true;
        }
        checkFormValidity();

        // 비밀번호 확인 필드도 같이 체크
        if (passwordConfirmInput.value !== '') {
            triggerPasswordConfirmCheck();
        }
    });

    passwordInput.addEventListener('input', () => {
        const value = passwordInput.value;
        if (passwordPattern.test(value)) {
            isPasswordValid = true;
            hideHelper(passwordHelper);
        } else {
            isPasswordValid = false;
        }
        checkFormValidity();
    });


    // 4. 비밀번호 확인
    function triggerPasswordConfirmCheck() {
        const pwd = passwordInput.value;
        const confirm = passwordConfirmInput.value;

        if (confirm === '') {
            showHelper(passwordConfirmHelper, "* 비밀번호를 한번 더 입력해주세요.");
            isPasswordConfirmValid = false;
        } else if (pwd !== confirm) {
            showHelper(passwordConfirmHelper, "* 비밀번호가 다릅니다.");
            isPasswordConfirmValid = false;
        } else {
            hideHelper(passwordConfirmHelper);
            isPasswordConfirmValid = true;
        }
        checkFormValidity();
    }

    passwordConfirmInput.addEventListener('focusout', triggerPasswordConfirmCheck);

    passwordConfirmInput.addEventListener('input', () => {
        const pwd = passwordInput.value;
        const confirm = passwordConfirmInput.value;
        if (pwd === confirm && confirm !== '') {
            isPasswordConfirmValid = true;
            hideHelper(passwordConfirmHelper);
        } else {
            isPasswordConfirmValid = false;
        }
        checkFormValidity();
    });


    // 5. 닉네임
    // 규칙: 공백 불가, 최대 10자, 특수문자 불가
    const nicknamePattern = /^[a-zA-Z0-9가-힣]{1,10}$/;

    nicknameInput.addEventListener('focusout', async () => {
        const value = nicknameInput.value;
        if (value === '') {
            showHelper(nicknameHelper, "* 닉네임을 입력해주세요.");
            isNicknameValid = false;
        } else if (/\s/.test(value)) {
            showHelper(nicknameHelper, "* 띄어쓰기를 없애주세요.");
            isNicknameValid = false;
        } else if (value.length > 10) {
            showHelper(nicknameHelper, "* 닉네임은 최대 10자까지 작성 가능합니다.");
            isNicknameValid = false;
        } else if (!nicknamePattern.test(value)) {
            showHelper(nicknameHelper, "* 닉네임 형식이 올바르지 않습니다. (공백/특수문자 불가)");
            isNicknameValid = false;
        } else {
            // API 중복 체크
            try {
                const response = await fetch(`http://localhost:8000/v1/auth/nicknames/availability?nickname=${encodeURIComponent(value)}`);
                const data = await response.json();

                if (response.ok) {
                    hideHelper(nicknameHelper);
                    isNicknameValid = true;
                } else if (response.status === 409) {
                    showHelper(nicknameHelper, "* 이미 사용 중인 닉네임입니다.");
                    isNicknameValid = false;
                } else {
                    showHelper(nicknameHelper, data.message || "* 닉네임 확인 중 오류가 발생했습니다.");
                    isNicknameValid = false;
                }
            } catch (error) {
                console.error('Nickname check error:', error);
                hideHelper(nicknameHelper);
                isNicknameValid = true;
            }
        }
        checkFormValidity();
    });

    nicknameInput.addEventListener('input', () => {
        const value = nicknameInput.value;
        if (value.length > 10) {
            showHelper(nicknameHelper, "* 닉네임은 최대 10자까지 작성 가능합니다.");
            isNicknameValid = false;
        } else if (nicknamePattern.test(value)) {
            hideHelper(nicknameHelper);
            isNicknameValid = true;
        } else {
            isNicknameValid = false;
        }
        checkFormValidity();
    });


    // 6. 회원가입 제출

    signupBtn.addEventListener('click', async () => {
        if (signupBtn.disabled) return;

        const email = emailInput.value;
        const password = passwordInput.value;
        const nickname = nicknameInput.value;

        let profileImageUrl = null;
        if (isProfileImageSelected && profileImageInput.files[0]) {
            try {
                const formData = new FormData();
                formData.append('file', profileImageInput.files[0]);
                formData.append('type', 'profile');

                const uploadResponse = await fetch(`${API_BASE_URL}/v1/files/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (!uploadResponse.ok) {
                    const errData = await uploadResponse.json();
                    showCustomModal(errData.message || "이미지 업로드에 실패했습니다.");
                    return;
                }

                const uploadData = await uploadResponse.json();
                profileImageUrl = uploadData.fileUrl; // 업로드된 이미지 URL
            } catch (error) {
                console.error('Image Upload Error:', error);
                showCustomModal("이미지 업로드 중 오류가 발생했습니다.");
                return;
            }
        }

        const payload = {
            email: email,
            password: password,
            nickname: nickname,
            profileImage: profileImageUrl
        };

        try {


            const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.status === 201) {
                showCustomModal("회원가입이 완료되었습니다.\n로그인 화면으로 이동합니다.", () => {
                    window.location.href = 'login.html';
                });
            } else {
                showCustomModal(data.message || "회원가입에 실패했습니다.");
            }

        } catch (error) {
            console.error('Signup error:', error);
            showCustomModal("서버 통신 중 오류가 발생했습니다.");
        }
    });

    // 초기화
    showHelper(profileError, "* 프로필 사진을 추가해주세요.");
    checkFormValidity();
});
