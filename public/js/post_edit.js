// post_edit.js - 게시글 수정 페이지 로직

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:8000';

    // URL에서 게시글 ID 추출
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        alert('잘못된 접근입니다.');
        window.location.href = 'index.html';
        return;
    }

    // ==========================================
    // 1. Elements
    // ==========================================
    const postEditForm = document.getElementById('postEditForm');
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');
    const helperText = document.getElementById('helperText');
    const imageInput = document.getElementById('imageInput');
    const fileSelectBtn = document.getElementById('fileSelectBtn');
    const fileNameSpan = document.getElementById('fileName');
    const submitBtn = document.getElementById('submitBtn');

    // State
    let originalPost = null;
    let currentFileUrl = null;

    // ==========================================
    // 2. Helper Functions
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

    // 커스텀 모달 함수
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
    // 3. Load Existing Post Data
    // ==========================================
    async function loadPostData() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/posts/${postId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                alert('게시글을 찾을 수 없습니다.');
                window.location.href = 'index.html';
                return;
            }

            const result = await response.json();
            originalPost = result.data || result;

            // 폼에 기존 데이터 채우기
            titleInput.value = originalPost.title || '';
            contentInput.value = originalPost.content || '';

            // 기존 이미지 파일명 표시
            if (originalPost.fileUrl) {
                currentFileUrl = originalPost.fileUrl;
                const fileName = originalPost.fileUrl.split('/').pop();
                fileNameSpan.textContent = fileName || '기존 파일';
                fileNameSpan.classList.add('selected');
            } else {
                fileNameSpan.textContent = '파일을 선택해주세요.';
            }

            checkFormValidity();

        } catch (error) {
            console.error('Failed to load post:', error);
            alert('게시글을 불러오는데 실패했습니다.');
        }
    }

    // ==========================================
    // 4. Event Handlers
    // ==========================================
    titleInput.addEventListener('input', () => {
        hideHelper();
        checkFormValidity();
    });

    contentInput.addEventListener('input', () => {
        hideHelper();
        checkFormValidity();
    });

    fileSelectBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            fileNameSpan.classList.add('selected');
            currentFileUrl = null; // 새 파일 선택 시 기존 URL 초기화
        }
    });

    // ==========================================
    // 5. Submit Handler - PATCH API
    // ==========================================
    submitBtn.addEventListener('click', async () => {
        if (submitBtn.disabled) return;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title || !content) {
            showHelper('* 제목, 내용을 모두 작성해주세요');
            return;
        }

        const payload = {
            title: title,
            content: content,
            fileUrl: currentFileUrl // 이미지 업로드 API 미구현으로 기존 URL 유지
        };

        try {
            console.log('=== Post Edit Request ===');
            console.log('Payload:', payload);

            const response = await fetch(`${API_BASE_URL}/v1/posts/${postId}`, {
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
                showCustomModal('게시글이 수정되었습니다.', () => {
                    window.location.href = `post_detail.html?id=${postId}`;
                });
            } else if (response.status === 401) {
                showCustomModal('로그인이 필요합니다.', () => {
                    window.location.href = 'login.html';
                });
            } else if (response.status === 403) {
                showCustomModal('수정 권한이 없습니다.', () => {
                    window.location.href = `post_detail.html?id=${postId}`;
                });
            } else {
                showHelper(data.message || '게시글 수정에 실패했습니다.');
            }

        } catch (error) {
            console.error('Post Edit Error:', error);
            showHelper('서버 통신 중 오류가 발생했습니다.');
        }
    });

    // ==========================================
    // 6. Initialize
    // ==========================================
    loadPostData();
});
