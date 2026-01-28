// post_write.js - 게시글 작성 로직

document.addEventListener('DOMContentLoaded', () => {

    // 커스텀 모달 함수 (signup.js에서 재사용)
    function showCustomModal(message, onConfirm) {
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

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            max-width: 300px;
        `;

        const msg = document.createElement('p');
        msg.textContent = message;
        msg.style.cssText = `
            margin: 0 0 20px 0;
            font-size: 16px;
            line-height: 1.5;
            white-space: pre-line;
        `;

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
        confirmBtn.focus();
    }

    // ==========================================
    // 0. 헤더 프로필 설정
    // ==========================================
    const profileIcon = document.getElementById('profileIcon');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    async function fetchUserProfile() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/auth/me`, {
                credentials: 'include'
            });
            if (response.ok) {
                const result = await response.json();
                const user = result.data || result;
                if (user.profileImage) {
                    localStorage.setItem('profileImage', user.profileImage);
                    if (profileIcon) profileIcon.style.backgroundImage = `url(${user.profileImage})`;
                } else if (profileIcon) {
                    profileIcon.style.backgroundColor = '#7F6AEE';
                }
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }

    // 초기 로드 시 캐시된 이미지 먼저 보여주기
    const cachedProfileImage = localStorage.getItem('profileImage');
    if (cachedProfileImage && profileIcon) {
        profileIcon.style.backgroundImage = `url(${cachedProfileImage})`;
    }

    // 드롭다운 이벤트
    if (profileIcon) {
        profileIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!profileDropdown.contains(e.target) && e.target !== profileIcon) {
                profileDropdown.classList.remove('show');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch(`${API_BASE_URL}/v1/auth/logout`, { method: 'POST', credentials: 'include' });
                showCustomModal('로그아웃 되었습니다.', () => { window.location.href = '/login.html'; });
            } catch (e) { console.error(e); }
        });
    }

    fetchUserProfile();

    // ==========================================
    // 1. 요소 가져오기
    // ==========================================
    const postWriteForm = document.getElementById('postWriteForm');
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');
    const helperText = document.getElementById('helperText');
    const imageInput = document.getElementById('imageInput');
    const fileSelectBtn = document.getElementById('fileSelectBtn');
    const fileNameSpan = document.getElementById('fileName');
    const submitBtn = document.getElementById('submitBtn');

    const API_BASE_URL = 'http://localhost:8000';



    // ==========================================
    // 2. 헬퍼 함수
    // ==========================================
    function showHelper(message) {
        helperText.textContent = message;
        helperText.classList.add('show');
    }

    function hideHelper() {
        helperText.textContent = '';
        helperText.classList.remove('show');
    }

    function checkFormValidity() {
        const titleValue = titleInput.value.trim();
        const contentValue = contentInput.value.trim();

        if (titleValue.length > 0 && contentValue.length > 0) {
            submitBtn.disabled = false;
            submitBtn.classList.add('active');
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.remove('active');
        }
    }

    // ==========================================
    // 3. 이벤트 핸들러 (이벤트 처리)
    // ==========================================

    // 제목 입력 - 26자 제한은 HTML maxlength로 처리됨
    titleInput.addEventListener('input', () => {
        hideHelper();
        checkFormValidity();
    });

    // 내용 입력
    contentInput.addEventListener('input', () => {
        hideHelper();
        checkFormValidity();
    });

    // 이미지 파일 선택 버튼 클릭
    fileSelectBtn.addEventListener('click', () => {
        imageInput.click();
    });

    // 이미지 파일 선택 완료
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            fileNameSpan.classList.add('selected');
        } else {
            fileNameSpan.textContent = '파일을 선택해주세요.';
            fileNameSpan.classList.remove('selected');
        }
    });

    // ==========================================
    // 4. 제출 핸들러 (Fetch API)
    // ==========================================
    submitBtn.addEventListener('click', async () => {
        if (submitBtn.disabled) return;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        // 유효성 검사 (이미 버튼 활성화로 체크되지만, 한번 더 확인)
        if (!title || !content) {
            showHelper('* 제목, 내용을 모두 작성해주세요');
            return;
        }

        // 1. 이미지 업로드 (만약 선택된 파일이 있다면)
        let postImage = null;
        if (imageInput.files[0]) {
            try {
                const formData = new FormData();
                formData.append('file', imageInput.files[0]);
                formData.append('type', 'post');

                // 주의: 파일 업로드는 credentials: 'include'가 필요할 수 있음 (로그인 체크가 있다면)
                // 하지만 headers에 'Content-Type'을 설정하면 안됨 (브라우저가 자동으로 Boundary 설정)
                const uploadResponse = await fetch(`${API_BASE_URL}/v1/files/upload`, {
                    method: 'POST',
                    headers: {}, // Content-Type 자동 설정을 위해 빈 객체 또는 생략
                    credentials: 'include',
                    body: formData
                });

                if (!uploadResponse.ok) {
                    const errData = await uploadResponse.json();
                    showHelper(errData.message || "이미지 업로드 실패");
                    return;
                }

                const uploadData = await uploadResponse.json();
                postImage = uploadData.fileUrl;
                console.log("Uploaded Image URL:", postImage);

            } catch (error) {
                console.error('Image upload error:', error);
                showHelper("이미지 업로드 중 오류가 발생했습니다.");
                return;
            }
        }

        const payload = {
            title: title,
            content: content,
            fileUrl: postImage
        };

        try {
            console.log('=== 게시글 작성 요청 ===');
            console.log('Payload:', payload);

            const response = await fetch(`${API_BASE_URL}/v1/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // 세션 쿠키 포함
                body: JSON.stringify(payload)
            });

            console.log('Response Status:', response.status);
            const data = await response.json();
            console.log('Response Data:', data);

            if (response.status === 201) {
                showCustomModal('게시글이 작성되었습니다.', () => {
                    window.location.href = '/posts';
                });
            } else if (response.status === 401) {
                showCustomModal('로그인이 필요합니다.', () => {
                    window.location.href = 'login.html';
                });
            } else {
                showHelper(data.message || '게시글 작성에 실패했습니다.');
            }

        } catch (error) {
            console.error('Post Create Error:', error);
            showHelper('서버 통신 중 오류가 발생했습니다.');
        }
    });

    // 초기화
    checkFormValidity();
});
