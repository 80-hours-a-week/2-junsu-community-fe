// signup.js - 회원가입 로직 (Event Processing First)

document.addEventListener('DOMContentLoaded', () => {

    // 커스텀 모달 함수 (Live Reload 영향을 받지 않음)
    function showCustomModal(message, onConfirm) {
        // 오버레이 생성
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;

        // 모달 박스 생성
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            max-width: 300px;
        `;

        // 메시지
        const msg = document.createElement('p');
        msg.textContent = message;
        msg.style.cssText = `
            margin: 0 0 20px 0;
            font-size: 16px;
            line-height: 1.5;
            white-space: pre-line;
        `;

        // 확인 버튼
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '확인';
        confirmBtn.style.cssText = `
            background: #7F6AEE;
            color: white;
            border: none;
            padding: 10px 30px;
            border-radius: 5px;
            font-size: 14px;
            cursor: pointer;
        `;
        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            if (onConfirm) onConfirm();
        });

        modal.appendChild(msg);
        modal.appendChild(confirmBtn);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 버튼에 포커스
        confirmBtn.focus();
    }

    // 1. Elements
    const signupForm = document.getElementById('signupForm');
    const signupBtn = document.getElementById('signupBtn');

    // Inputs
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('passwordConfirm');
    const nicknameInput = document.getElementById('nickname');
    const profileImageInput = document.getElementById('profileImageInput');
    const profilePreview = document.getElementById('profilePreview');
    const profileImgElement = profilePreview.querySelector('img');

    // Helpers
    const emailHelper = document.getElementById('emailHelper');
    const passwordHelper = document.getElementById('passwordHelper');
    const passwordConfirmHelper = document.getElementById('passwordConfirmHelper');
    const nicknameHelper = document.getElementById('nicknameHelper');
    const profileError = document.getElementById('profileError');

    // Validation Flags
    let isEmailValid = false;
    let isPasswordValid = false;
    let isPasswordConfirmValid = false;
    let isNicknameValid = false;
    // Profile image is optional in Spec text says "프로필 사진 업로드 안했을 시 ... 추가해주세요" but typically image is optional in CSV. 
    // However, the spec image has criteria: "프로필 사진 업로드 안했을 시 : *프로필 사진을 추가해주세요".
    // Wait, strictly reading the spec image text: "프로필 사진 업로드 안했을 시 : *프로필 사진을 추가해주세요" implies it might be required or at least needs a helper.
    // BUT the CSV said "선택: profileimage".
    // I will follow the CSV for backend logic (optional), but if the USER SPEC IMAGE says "Upload if not uploaded", maybe they want it required?
    // Let's look at the "Button Activation" rule in spec image: "1번에 입력한 내용이 모두 작성되고 유효성 검사를 통과한 경우, 버튼이 활성화 된다."
    // Does "profile image" count as "1번에 입력한 내용"?
    // The spec layout lists Profile Photo at the top.
    // And it has a helper text condition.
    // I will assume it is REQUIRED for the UI validation based on the explicit helper text instruction. 
    // Or maybe the helper text is just a warning?
    // Let's implement it as REQUIRED for now to be safe with the "Strict Spec" instruction. 
    // If the user didn't want it required, they wouldn't ask for a red error message telling to add it.
    let isProfileImageSelected = false;


    // Helper Functions
    function showHelper(element, message) {
        element.textContent = message;
        element.classList.add('show');
    }

    function hideHelper(element) {
        element.textContent = '';
        element.classList.remove('show');
    }

    function checkFormValidity() {
        // Log consistency check
        // console.log({isEmailValid, isPasswordValid, isPasswordConfirmValid, isNicknameValid, isProfileImageSelected});

        // Wait, does 'isProfileImageSelected' block the button?
        // CSV says optional. Spec helper text exists. I will make it NOT block the button for now, but show helper text if missing.
        // Actually, let's treat it as OPTIONAL for the button, but show the helper text as requested.
        // Re-reading spec: "helper text (밀리지 않는다. 지정된 위치에서 보여짐)... 프로필 사진 업로드 안했을 시 : *프로필 사진을 추가해주세요"
        // This sounds like a persistent hint.
        // But usually "Red Text" means error. 
        // Let's assume it's NOT blocking for now because CSV > Spec for data requirements usually, but...
        // The user emphasized "Mockup Identity".
        // Use your judgement: If I require it, I block potentially valid signups. If I don't, I might miss a requirement.
        // I will make it OPTIONAL (Button active even if false), but showing the text.

        if (isEmailValid && isPasswordValid && isPasswordConfirmValid && isNicknameValid) {
            signupBtn.disabled = false;
            signupBtn.classList.add('active');
        } else {
            signupBtn.disabled = true;
            signupBtn.classList.remove('active');
        }
    }

    // --- Validation Logic ---

    // 1. Profile Image
    profilePreview.addEventListener('click', () => {
        // If has image, this acts as delete? Spec: "다시 프로필 이미지 버튼을 클릭 후 업로드 하지 않게 되면 -> 프로필 이미지 삭제"
        // Also "프로필 이미지를 업로드 했을 때 ... 다시 프로필 이미지 버튼을 클릭"
        // It implies clicking opens the file dialog.
        profileImageInput.click();
    });

    profileImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profileImgElement.src = e.target.result;
                profilePreview.classList.add('has-image');
                isProfileImageSelected = true;
                hideHelper(profileError); // Hide "Select Image" text
                checkFormValidity();
            };
            reader.readAsDataURL(file);
        } else {
            // Cancelled or removed
            // Spec says "다시... 클릭 후 업로드 하지 않게 되면 ... 삭제".
            // This is tricky with standard file input. If you cancel, it usually keeps old file or clears it depending on browser.
            // But if user wants to delete, usually we need a clear UX.
            // For now, if input clear, we clear.
            profileImgElement.src = '';
            profilePreview.classList.remove('has-image');
            isProfileImageSelected = false;
            showHelper(profileError, "* 프로필 사진을 추가해주세요.");
            checkFormValidity();
        }
    });


    // 2. Email
    // Rules: Cannot be empty. Valid format. Duplicate check (mock for now? or skip).
    // Spec: "이메일이 비어 있는 경우: *이메일을 입력해주세요"
    // "올바른 이메일 주소... (예: example@example.com)"
    // "중복된 이메일... (API check needed)"
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    emailInput.addEventListener('focusout', () => {
        const value = emailInput.value.trim();
        if (value === '') {
            showHelper(emailHelper, "* 이메일을 입력해주세요.");
            isEmailValid = false;
        } else if (!emailPattern.test(value)) {
            showHelper(emailHelper, "* 올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)");
            isEmailValid = false;
        } else {
            // TODO: API Duplicate Check
            hideHelper(emailHelper);
            isEmailValid = true;
        }
        checkFormValidity();
    });

    // Clear error on input
    emailInput.addEventListener('input', () => {
        // Optional: Hide error immediately on type? Spec says "focusout".
        // But usually we want to re-validate on input if it was invalid?
        // Sticking to "focusout" trigger for error showing. 
        // But button state needs real-time update? 
        // Spec: "1번에 입력한 내용이 모두 작성되고... 버튼이 활성화".
        // If I fix a typo, button should light up immediately, not wait for blur.
        // So I will update `isEmailValid` on input BUT show error on focusout?
        // Implementing 'input' to clear error and re-check validity logic is safer for UX.
        // But stricter compliance to spec "focusout" for SHOWING error.

        const value = emailInput.value.trim();
        if (emailPattern.test(value)) {
            // Potentially valid, let's update flag but NOT hide error yet if we act strictly? 
            // Usually masking error on input is better.
            // hideHelper(emailHelper); // Let's hide error on input if user types
            // isEmailValid = true;
        }
        // Let's stick to simple logic: Validate on focusout. Update button on focusout?
        // Or update button on input?
        // Let's do: Check validity on input for button state, show helper only on focusout.

        if (emailPattern.test(value)) {
            isEmailValid = true;
            hideHelper(emailHelper); // Better UX
        } else {
            isEmailValid = false;
        }
        checkFormValidity();
    });


    // 3. Password
    // Rules: 8-20 chars, Upper+Lower+Num+Special.
    // Spec: "비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다."
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

        // Trigger confirm check if confirming exists
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


    // 4. Password Confirm
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


    // 5. Nickname
    // Rules: No space, max 10 chars.
    // Spec: "띄어쓰기불가, 10글자 이내"
    // "띄어쓰기가 있을 시 : *띄어쓰기를 없애주세요"
    // "중복 시 : *중복된 닉네임 입니다"
    // "최대 10자까지만 작성 가능" -> Input maxLength attribute can handle this too?

    // Regex: No spaces. Max 10. No special chars?
    // CSV says: "공백이나 특수문자를 포함할 수 없습니다."
    const nicknamePattern = /^[a-zA-Z0-9가-힣]{1,10}$/; // Basic alphanumeric + Korean, no space, no special.
    // If user types space, regex fails.

    nicknameInput.addEventListener('focusout', () => {
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
            // Catch all other special chars
            showHelper(nicknameHelper, "* 닉네임 형식이 올바르지 않습니다. (공백/특수문자 불가)");
            isNicknameValid = false;
        } else {
            hideHelper(nicknameHelper);
            isNicknameValid = true;
        }
        checkFormValidity();
    });

    nicknameInput.addEventListener('input', () => {
        const value = nicknameInput.value;
        // Special handling for length to be instant
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


    // 6. Submit (Prevent default for Step 1)
    const API_BASE_URL = 'http://localhost:8000';

    // 6. Submit (Fetch API Integration)
    // Changed to 'click' listener on button (type="button") to strictly prevent form submission reload
    signupBtn.addEventListener('click', async () => {
        if (signupBtn.disabled) return;

        const email = emailInput.value;
        const password = passwordInput.value;
        const nickname = nicknameInput.value;

        // Backend currently expects a String for profileimage, but no file upload endpoint exists.
        // We will send null or a placeholder if an image is selected visually, 
        // to comply with the backend schema.
        // If we had an uploader, we would upload first -> get URL -> send URL.
        const profileimage = isProfileImageSelected ? null : null;

        const payload = {
            email: email,
            password: password,
            nickname: nickname,
            profileimage: profileimage
        };

        try {
            console.log('=== Signup Request Starting ===');
            console.log('Payload:', payload);

            const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('Response Status:', response.status);
            const data = await response.json();
            console.log('Response Data:', data);

            if (response.status === 201) {
                console.log('=== SUCCESS PATH ===');
                // 커스텀 모달 사용 - 네이티브 alert 대신
                showCustomModal("회원가입이 완료되었습니다.\n로그인 화면으로 이동합니다.", () => {
                    window.location.href = 'login.html';
                });
            } else {
                console.log('=== ERROR PATH ===');
                console.log('Error message:', data.message);
                alert(data.message || "회원가입에 실패했습니다.");
                console.log('Alert should have displayed. No redirect happening.');
            }

        } catch (error) {
            console.error('=== CATCH PATH ===');
            console.error('Error details:', error);
            alert("서버 통신 중 오류가 발생했습니다.");
            console.log('Catch alert displayed. No redirect happening.');
        }
    });

    // Initialize
    showHelper(profileError, "* 프로필 사진을 추가해주세요."); // Init state
    checkFormValidity();
});
