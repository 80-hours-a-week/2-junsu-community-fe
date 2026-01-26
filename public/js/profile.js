// profile.js - 회원정보수정 페이지 로직

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:8000';

    // ==========================================
    // 1. 요소 가져오기
    // ==========================================
    const profileIcon = document.getElementById('profileIcon');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    const emailDisplay = document.getElementById('emailDisplay');
    const nicknameInput = document.getElementById('nickname');
    const nicknameHelper = document.getElementById('nicknameHelper');
    const imageInput = document.getElementById('imageInput');
    const fileSelectBtn = document.getElementById('fileSelectBtn');
    const fileNameSpan = document.getElementById('fileName');
    const submitBtn = document.getElementById('submitBtn');

    const withdrawBtn = document.getElementById('withdrawBtn');
    const withdrawModal = document.getElementById('withdrawModal');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');

    const toast = document.getElementById('toast');

    // 상태 변수
    let currentUser = null;

    // ==========================================
    // 2. 헬퍼 함수
    // ==========================================
    function showHelper(message) {
        nicknameHelper.textContent = message;
        nicknameHelper.classList.add('show');
    }

    function hideHelper() {
        nicknameHelper.textContent = '';
        nicknameHelper.classList.remove('show');
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    function validateNickname(nickname) {
        if (!nickname || nickname.trim().length === 0) {
            return { valid: false, message: '*닉네임을 입력해주세요.' };
        }
        if (nickname.length > 10) {
            return { valid: false, message: '*닉네임은 최대 10자 까지 작성 가능합니다.' };
        }
        return { valid: true };
    }

    // ==========================================
    // 3. 드롭다운 메뉴
    // ==========================================
    profileIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
    });

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', (e) => {
        if (!profileDropdown.contains(e.target) && e.target !== profileIcon) {
            profileDropdown.classList.remove('show');
        }
    });

    // 로그아웃
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

    // ==========================================
    // 4. 사용자 데이터 로드
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

            // 폼에 데이터 채우기
            emailDisplay.textContent = currentUser.email || '';
            nicknameInput.value = currentUser.nickname || '';

            if (currentUser.profileImage) {
                const fileName = currentUser.profileImage.split('/').pop();
                fileNameSpan.textContent = fileName || '기존 파일';
                fileNameSpan.classList.add('selected');
            }

            // 프로필 아이콘 이미지 설정
            if (currentUser.profileImage) {
                profileIcon.style.backgroundImage = `url(${currentUser.profileImage})`;
            }

        } catch (error) {
            console.error('Failed to load user:', error);
            showCustomModal('사용자 정보를 불러오는데 실패했습니다.');
        }
    }

    // ==========================================
    // 5. 이벤트 핸들러
    // ==========================================
    nicknameInput.addEventListener('input', () => {
        hideHelper();
    });

    fileSelectBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            fileNameSpan.classList.add('selected');
        }
    });

    // ==========================================
    // 6. 폼 제출 - 프로필 수정
    // ==========================================
    submitBtn.addEventListener('click', async () => {
        const nickname = nicknameInput.value.trim();

        // 닉네임 유효성 검사
        const validation = validateNickname(nickname);
        if (!validation.valid) {
            showHelper(validation.message);
            return;
        }

        const payload = {
            nickname: nickname
            // 이미지 업로드 API 미구현으로 profileImage는 제외
        };

        try {
            console.log('=== 프로필 수정 요청 ===');
            console.log('Payload:', payload);

            const response = await fetch(`${API_BASE_URL}/v1/users/${currentUser.userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            console.log('Response Status:', response.status);
            const data = await response.json();
            console.log('Response Data:', data);

            if (response.ok) {
                showToast('수정 완료');
            } else if (response.status === 409) {
                showHelper('*중복된 닉네임 입니다.');
            } else {
                showHelper(data.message || '프로필 수정에 실패했습니다.');
            }

        } catch (error) {
            console.error('Profile Update Error:', error);
            showHelper('서버 통신 중 오류가 발생했습니다.');
        }
    });

    // ==========================================
    // 7. 회원 탈퇴 모달
    // ==========================================
    withdrawBtn.addEventListener('click', (e) => {
        e.preventDefault();
        withdrawModal.style.display = 'flex';
    });

    modalCancelBtn.addEventListener('click', () => {
        withdrawModal.style.display = 'none';
    });

    withdrawModal.addEventListener('click', (e) => {
        if (e.target === withdrawModal) {
            withdrawModal.style.display = 'none';
        }
    });

    modalConfirmBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/users/me`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                showCustomModal('회원 탈퇴가 완료되었습니다.', () => {
                    window.location.href = 'login.html';
                });
            } else {
                showCustomModal('회원 탈퇴에 실패했습니다.');
            }
        } catch (error) {
            console.error('Withdrawal Error:', error);
            showCustomModal('회원 탈퇴 중 오류가 발생했습니다.');
        }
    });

    // ==========================================
    // 8. 초기화
    // ==========================================
    loadUserData();
});
