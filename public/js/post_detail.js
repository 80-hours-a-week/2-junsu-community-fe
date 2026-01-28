// post_detail.js - 게시글 상세 페이지 로직

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:8000';

    // URL에서 게시글 ID 추출
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        showCustomModal('잘못된 접근입니다.', () => {
            window.location.href = '/posts';
        });
        return;
    }

    // ==========================================
    // 1. DOM 요소
    // ==========================================
    // 게시글 요소
    const postTitle = document.getElementById('postTitle');
    const authorAvatar = document.getElementById('authorAvatar');
    const authorName = document.getElementById('authorName');
    const postDate = document.getElementById('postDate');
    const postActions = document.getElementById('postActions');
    const editPostBtn = document.getElementById('editPostBtn');
    const deletePostBtn = document.getElementById('deletePostBtn');
    const postImageContainer = document.getElementById('postImageContainer');
    const postImage = document.getElementById('postImage');
    const postContent = document.getElementById('postContent');
    const likeBtn = document.getElementById('likeBtn');
    const likeCount = document.getElementById('likeCount');
    const viewCount = document.getElementById('viewCount');
    const commentCountEl = document.getElementById('commentCount');

    // 댓글 요소
    const commentInput = document.getElementById('commentInput');
    const commentSubmitBtn = document.getElementById('commentSubmitBtn');
    const commentList = document.getElementById('commentList');

    // 모달 요소
    const deleteModal = document.getElementById('deleteModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');

    // 프로필 드롭다운 요소
    const profileIcon = document.getElementById('profileIcon');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    // 상태 변수
    let currentPost = null;
    let currentUser = null;
    let isLiked = false;
    let editingCommentId = null;

    // 로컬스토리지에서 사용자 정보 로드 (동기 처리 - 딜레이 방지)
    function loadUserFromStorage() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            currentUser = JSON.parse(userStr);
        }
        // 개별 ID가 존재하는 경우도 확인 (안정성)
        if (!currentUser && localStorage.getItem('userId')) {
            currentUser = {
                userId: localStorage.getItem('userId'),
                nickname: localStorage.getItem('nickname'),
                email: localStorage.getItem('email'),
                profileImage: localStorage.getItem('profileImage')
            };
        }

        // 헤더 프로필 즉시 적용
        const cachedProfileImage = localStorage.getItem('profileImage') || (currentUser && currentUser.profileImage);
        if (cachedProfileImage && profileIcon) {
            profileIcon.style.backgroundImage = `url(${cachedProfileImage})`;
        }
    }

    // ==========================================
    // 유틸리티 함수
    // ==========================================
    function formatCount(num) {
        if (num >= 100000) return Math.floor(num / 1000) + 'k';
        if (num >= 10000) return Math.floor(num / 1000) + 'k';
        if (num >= 1000) return Math.floor(num / 1000) + 'k';
        return num.toString();
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const mins = String(date.getMinutes()).padStart(2, '0');
        const secs = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
    }

    function showModal(title, onConfirm) {
        modalTitle.textContent = title;
        deleteModal.style.display = 'flex';

        const handleConfirm = () => {
            deleteModal.style.display = 'none';
            modalConfirmBtn.removeEventListener('click', handleConfirm);
            onConfirm();
        };

        modalConfirmBtn.addEventListener('click', handleConfirm);
    }

    function hideModal() {
        deleteModal.style.display = 'none';
    }

    // ==========================================
    // API 함수
    // ==========================================

    // 현재 사용자 정보 조회 (비동기) - 변경사항 있으면 업데이트
    async function fetchCurrentUser() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/auth/me`, {
                credentials: 'include'
            });
            if (response.ok) {
                const result = await response.json();
                const remoteUser = result.data || result;
                if (remoteUser) {
                    currentUser = remoteUser;
                    // 스토리지 업데이트
                    localStorage.setItem('user', JSON.stringify(currentUser));
                    if (currentUser.userId) localStorage.setItem('userId', currentUser.userId);
                    if (currentUser.profileImage) localStorage.setItem('profileImage', currentUser.profileImage);

                    // 헤더 프로필 아이콘 업데이트
                    if (profileIcon && currentUser.profileImage) {
                        profileIcon.style.backgroundImage = `url(${currentUser.profileImage})`;
                    } else if (profileIcon) {
                        profileIcon.style.backgroundColor = '#7F6AEE';
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
        }
    }

    async function fetchPostDetail() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/posts/${postId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                showCustomModal('게시글을 찾을 수 없습니다.', () => {
                    window.location.href = '/posts';
                });
                return;
            }

            const result = await response.json();
            currentPost = result.data || result;
            renderPost();
        } catch (error) {
            console.error('Failed to fetch post:', error);
            showCustomModal('게시글을 불러오는데 실패했습니다.');
        }
    }

    async function fetchComments() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/posts/${postId}/comments`, {
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                const data = result.data || result;
                const comments = Array.isArray(data) ? data : (data.comments || []);
                renderComments(comments);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    }

    // 현재 사용자가 이미 좋아요한 게시글인지 확인
    // 참고: 백엔드가 GET /likes를 지원하지 않음 (405 반환)
    // toggleLike에서 409 Conflict 처리로 대체
    async function fetchLikeStatus() {
        // 백엔드가 아직 이 엔드포인트를 지원하지 않음 - 405 오류 방지를 위해 비활성화
        // 백엔드에서 GET /likes 지원 또는 게시글 상세에 isLiked 포함 시 재활성화 가능
        return;
    }

    async function toggleLike() {
        if (!currentUser) {
            showCustomModal('로그인이 필요합니다.', () => {
                window.location.href = '/login.html';
            });
            return;
        }

        console.log('[좋아요] 토글 요청. 현재 상태:', isLiked);

        try {
            // 현재 상태에 따라 메서드 결정
            const method = isLiked ? 'DELETE' : 'POST';

            const response = await fetch(`${API_BASE_URL}/v1/posts/${postId}/likes`, {
                method: method,
                credentials: 'include'
            });

            console.log('[좋아요] 요청:', method, '상태 코드:', response.status);

            // 409 Conflict (ALREADY_LIKED) 처리 - 상태만 교정하고 재시도 안함
            if (response.status === 409) {
                console.log('[좋아요] 409 Conflict 발생 - 이미 좋아요 상태임. UI 상태 교정.');
                isLiked = true;
                likeBtn.classList.add('liked');
                // 카운트 변경 안함 - 백엔드에 이미 좋아요 카운트됨
                return;
            }

            if (response.ok || response.status === 200 || response.status === 201 || response.status === 204) {
                // 상태 토글
                isLiked = (method === 'POST');
                likeBtn.classList.toggle('liked', isLiked);

                console.log('[좋아요] 성공! 변경된 상태:', isLiked);

                // 로컬 카운트 업데이트
                let count = parseInt(likeCount.textContent.replace(/[^0-9]/g, '')) || 0;
                if (method === 'POST') count++;
                else count--;
                likeCount.textContent = formatCount(Math.max(0, count));

            } else {
                const errorText = await response.text();
                console.error('[좋아요] 실패:', response.status, errorText);
            }
        } catch (error) {
            console.error('[좋아요] 에러:', error);
        }
    }

    async function deletePost() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/posts/${postId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                showCustomModal('게시글이 삭제되었습니다.', () => {
                    window.location.href = '/posts';
                });
            } else {
                showCustomModal('삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('Failed to delete post:', error);
        }
    }

    async function submitComment() {
        const content = commentInput.value.trim();
        if (!content) return;

        if (!currentUser) {
            showCustomModal('로그인이 필요합니다.', () => {
                window.location.href = '/login.html';
            });
            return;
        }

        try {
            let response;
            if (editingCommentId) {
                response = await fetch(`${API_BASE_URL}/v1/posts/${postId}/comments/${editingCommentId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ content })
                });
            } else {
                response = await fetch(`${API_BASE_URL}/v1/posts/${postId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ content })
                });
            }

            if (response.ok) {
                commentInput.value = '';
                commentSubmitBtn.textContent = '댓글 등록';
                commentSubmitBtn.disabled = true;
                commentSubmitBtn.classList.remove('active');
                editingCommentId = null;
                fetchComments();

                // 댓글 수 업데이트
                let count = parseInt(commentCountEl.textContent.replace(/[^0-9]/g, '')) || 0;
                if (!editingCommentId) { // 새 댓글인 경우
                    commentCountEl.textContent = formatCount(count + 1);
                }
            } else {
                showCustomModal('댓글 등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error submitting comment:', error);
        }
    }

    async function deleteComment(commentId) {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/posts/${postId}/comments/${commentId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                fetchComments();
                let count = parseInt(commentCountEl.textContent.replace(/[^0-9]/g, '')) || 0;
                commentCountEl.textContent = formatCount(Math.max(0, count - 1));
            } else {
                showCustomModal('댓글 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('Failed to delete comment:', error);
        }
    }

    // ==========================================
    // 4. 렌더링 함수
    // ==========================================
    function renderPost() {
        if (!currentPost) return;

        postTitle.textContent = currentPost.title || '';
        postContent.textContent = currentPost.content || '';
        authorName.textContent = currentPost.writer || '익명';
        postDate.textContent = currentPost.createdAt ? formatDate(currentPost.createdAt) : '';

        // 작성자 프로필 이미지
        if (currentPost.authorProfileImage) {
            authorAvatar.style.backgroundImage = `url(${currentPost.authorProfileImage})`;
        } else {
            authorAvatar.style.backgroundColor = '#D9D9D9';
        }

        // 이미지
        if (currentPost.fileUrl) {
            postImage.src = currentPost.fileUrl;
            postImageContainer.style.display = 'block';
        } else {
            postImageContainer.style.display = 'none';
        }

        // 통계
        likeCount.textContent = formatCount(currentPost.likeCount || 0);
        viewCount.textContent = formatCount(currentPost.viewCount || 0);
        commentCountEl.textContent = formatCount(currentPost.commentCount || 0);

        console.log('[게시글] 전체 데이터:', currentPost);

        // 소유권 확인 (userId 비교)
        const currentUserId = currentUser ? String(currentUser.userId) : null;
        // 게시글 작성자 ID를 다양한 필드에서 확인
        let postAuthorId = null;
        if (currentPost.author && currentPost.author.userId) {
            postAuthorId = String(currentPost.author.userId);
        } else if (currentPost.authorId) {
            postAuthorId = String(currentPost.authorId);
        } else if (currentPost.userId) {
            postAuthorId = String(currentPost.userId);
        }

        console.log('[게시글] currentUserId:', currentUserId, ', postAuthorId:', postAuthorId);

        if (currentUserId && postAuthorId && currentUserId === postAuthorId) {
            postActions.style.display = 'flex';
        } else {
            postActions.style.display = 'none';
        }

        // 좋아요 상태 - 다양한 필드 확인
        if (currentPost.isLiked === true || currentPost.liked === true) {
            isLiked = true;
            likeBtn.classList.add('liked');
            console.log('[게시글] 사용자가 이미 좋아요를 누름 (boolean flag)');
        } else if (currentPost.likes && Array.isArray(currentPost.likes) && currentUser) {
            // likes 배열이 있고 사용자 정보가 있다면 확인
            const userLiked = currentPost.likes.some(like =>
                String(like.userId) === String(currentUser.userId)
            );
            if (userLiked) {
                isLiked = true;
                likeBtn.classList.add('liked');
                console.log('[게시글] 사용자가 이미 좋아요를 누름 (배열 확인)');
            } else {
                isLiked = false;
                likeBtn.classList.remove('liked');
            }
        } else {
            isLiked = false;
            likeBtn.classList.remove('liked');
        }
    }

    function renderComments(comments) {
        console.log('[댓글] 렌더링 개수:', comments.length);
        console.log('[댓글] 현재 사용자:', currentUser);

        commentList.innerHTML = '';

        comments.forEach((comment, index) => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment-item';
            commentEl.dataset.id = comment.commentId;

            // 현재 사용자가 댓글 작성자인지 확인
            // 보안: authorId를 우선 확인, 없으면 이메일 비교로 대체
            const currentUserId = currentUser ? String(currentUser.userId) : null;
            const currentEmail = currentUser ? currentUser.email : null;

            // 백엔드가 authorId, userId, 또는 중첩된 author.userId를 반환해야 함
            let commentAuthorId = null;
            if (comment.authorId) {
                commentAuthorId = String(comment.authorId);
            } else if (comment.userId) {
                commentAuthorId = String(comment.userId);
            } else if (comment.author && comment.author.userId) {
                commentAuthorId = String(comment.author.userId);
            }

            // 댓글 작성자 이메일 가져오기 (백엔드에서 writerEmail)
            const commentEmail = comment.writerEmail || comment.authorEmail ||
                (comment.author && comment.author.email);

            // ID로 소유권 확인, 없으면 이메일로 확인 (안전한 대체 방법)
            let isOwner = false;
            if (currentUserId && commentAuthorId) {
                isOwner = currentUserId === commentAuthorId;
            } else if (currentEmail && commentEmail) {
                // 이메일은 사용자보다 고유하므로 안전한 비교 가능
                isOwner = currentEmail === commentEmail;
                console.log(`[댓글 ${index}] 이메일 비교 사용: ${currentEmail} === ${commentEmail}`);
            } else {
                console.warn(`[댓글 ${index}] authorId와 email 누락 - 소유권 확인 불가.`);
            }

            console.log(`[댓글 ${index}] CommentID: ${comment.commentId}, AuthorID: ${commentAuthorId}, Email: ${commentEmail}, CurrentUserID: ${currentUserId}, isOwner: ${isOwner}`);
            console.log(`[댓글 ${index}] 전체 댓글 객체:`, comment);

            // 표시할 작성자 이름 가져오기 (다양한 필드 시도)
            const authorDisplayName = comment.authorNickname || comment.nickname || comment.writer || '익명';

            commentEl.innerHTML = `
                <div class="comment-header">
                    <div class="comment-author-info">
                        <div class="comment-avatar" ${comment.authorProfileImage ? `style="background-image: url(${comment.authorProfileImage})"` : ''}></div>
                        <span class="comment-author-name">${authorDisplayName}</span>
                        <span class="comment-date">${formatDate(comment.createdAt)}</span>
                    </div>
                    ${isOwner ? `
                        <div class="comment-actions">
                            <button class="comment-action-btn edit-comment-btn">수정</button>
                            <button class="comment-action-btn delete-comment-btn">삭제</button>
                        </div>
                    ` : ''}
                </div>
                <div class="comment-content">${comment.content}</div>
            `;

            // 이 댓글에 이벤트 바인딩
            if (isOwner) {
                const editBtn = commentEl.querySelector('.edit-comment-btn');
                const deleteBtn = commentEl.querySelector('.delete-comment-btn');

                editBtn.addEventListener('click', () => {
                    editingCommentId = comment.commentId;
                    commentInput.value = comment.content;
                    commentInput.focus();
                    commentSubmitBtn.textContent = '댓글 수정';
                    commentSubmitBtn.disabled = false;
                    commentSubmitBtn.classList.add('active');
                    // 입력창으로 스크롤
                    commentInput.scrollIntoView({ behavior: 'smooth' });
                });

                deleteBtn.addEventListener('click', () => {
                    showModal('댓글을 삭제하시겠습니까?', () => {
                        deleteComment(comment.commentId);
                    });
                });
            }

            commentList.appendChild(commentEl);
        });
    }

    // ==========================================
    // 이벤트 리스너
    // ==========================================
    likeBtn.addEventListener('click', toggleLike);
    editPostBtn.addEventListener('click', () => {
        window.location.href = `post_edit.html?id=${postId}`;
    });
    deletePostBtn.addEventListener('click', () => {
        showModal('게시글을 삭제하시겠습니까?', deletePost);
    });
    modalCancelBtn.addEventListener('click', hideModal);
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) hideModal();
    });
    commentInput.addEventListener('input', () => {
        const hasContent = commentInput.value.trim().length > 0;
        commentSubmitBtn.disabled = !hasContent;
        commentSubmitBtn.classList.toggle('active', hasContent);
    });
    commentSubmitBtn.addEventListener('click', submitComment);

    // 프로필 드롭다운 이벤트
    if (profileIcon) {
        profileIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
    }

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', (e) => {
        if (profileDropdown && !profileDropdown.contains(e.target) && e.target !== profileIcon) {
            profileDropdown.classList.remove('show');
        }
    });

    // 로그아웃
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch(`${API_BASE_URL}/v1/auth/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
                showCustomModal('로그아웃 되었습니다.', () => {
                    window.location.href = '/login.html';
                });
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    }


    // 초기화
    async function init() {
        loadUserFromStorage(); // 로컬스토리지에서 즉시 로드
        await fetchPostDetail();
        await fetchLikeStatus(); // 사용자가 이미 좋아요한 게시글인지 확인
        fetchComments();
        fetchCurrentUser(); // 백그라운드에서 사용자 데이터 새로고침
    }

    init();
});
