// post_detail.js - 게시글 상세 페이지 로직

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:8000';

    // URL에서 게시글 ID 추출
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        alert('잘못된 접근입니다.');
        window.location.href = '/posts';
        return;
    }

    // ==========================================
    // 1. Elements
    // ==========================================
    // Post elements
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

    // Comment elements
    const commentInput = document.getElementById('commentInput');
    const commentSubmitBtn = document.getElementById('commentSubmitBtn');
    const commentList = document.getElementById('commentList');

    // Modal elements
    const deleteModal = document.getElementById('deleteModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');

    // State
    let currentPost = null;
    let currentUser = null;
    let isLiked = false;
    let editingCommentId = null;

    // ==========================================
    // 2. Helper Functions
    // ==========================================
    function formatCount(num) {
        if (num >= 100000) return Math.floor(num / 1000) + 'k';
        if (num >= 10000) return Math.floor(num / 1000) + 'k';
        if (num >= 1000) return Math.floor(num / 1000) + 'k';
        return num.toString();
    }

    function formatDate(dateStr) {
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
    // 3. API Functions
    // ==========================================
    async function fetchCurrentUser() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/auth/me`, {
                credentials: 'include'
            });
            if (response.ok) {
                const result = await response.json();
                currentUser = result.data || result; // data wrapper 지원
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
                alert('게시글을 찾을 수 없습니다.');
                window.location.href = 'index.html';
                return;
            }

            const result = await response.json();
            currentPost = result.data || result; // data wrapper 지원
            console.log('Post data:', currentPost);
            renderPost();
        } catch (error) {
            console.error('Failed to fetch post:', error);
            alert('게시글을 불러오는데 실패했습니다.');
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
                renderComments(data.comments || []);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    }

    async function toggleLike() {
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            window.location.href = 'login.html';
            return;
        }

        try {
            const method = isLiked ? 'DELETE' : 'POST';
            const response = await fetch(`${API_BASE_URL}/v1/posts/${postId}/like`, {
                method: method,
                credentials: 'include'
            });

            if (response.ok) {
                isLiked = !isLiked;
                const currentCount = parseInt(likeCount.textContent) || 0;
                const newCount = isLiked ? currentCount + 1 : currentCount - 1;
                likeCount.textContent = formatCount(Math.max(0, newCount));
                likeBtn.classList.toggle('liked', isLiked);
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
        }
    }

    async function deletePost() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/posts/${postId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                alert('게시글이 삭제되었습니다.');
                window.location.href = '/posts';
            } else {
                alert('삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('Failed to delete post:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    }

    async function submitComment() {
        const content = commentInput.value.trim();
        if (!content) return;

        if (!currentUser) {
            alert('로그인이 필요합니다.');
            window.location.href = 'login.html';
            return;
        }

        try {
            let response;
            if (editingCommentId) {
                // 댓글 수정
                response = await fetch(`${API_BASE_URL}/v1/comments/${editingCommentId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ content })
                });
            } else {
                // 댓글 작성
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
                const currentCount = parseInt(commentCountEl.textContent) || 0;
                if (!editingCommentId) {
                    commentCountEl.textContent = formatCount(currentCount + 1);
                }
            } else {
                alert('댓글 등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('Failed to submit comment:', error);
            alert('댓글 등록 중 오류가 발생했습니다.');
        }
    }

    async function deleteComment(commentId) {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/comments/${commentId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                fetchComments();
                const currentCount = parseInt(commentCountEl.textContent) || 0;
                commentCountEl.textContent = formatCount(Math.max(0, currentCount - 1));
            } else {
                alert('댓글 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('Failed to delete comment:', error);
        }
    }

    // ==========================================
    // 4. Render Functions
    // ==========================================
    function renderPost() {
        if (!currentPost) return;

        // Backend returns: title, content, fileUrl, writer, viewCount, createdAt, writerEmail
        postTitle.textContent = currentPost.title || '';
        postContent.textContent = currentPost.content || '';
        authorName.textContent = currentPost.writer || '익명';
        postDate.textContent = currentPost.createdAt ? formatDate(currentPost.createdAt) : '';

        // 프로필 이미지는 현재 백엔드에서 제공하지 않음
        // authorAvatar는 기본 CSS 배경색으로 표시

        if (currentPost.fileUrl) {
            postImage.src = currentPost.fileUrl;
            postImageContainer.style.display = 'block';
        }

        likeCount.textContent = formatCount(currentPost.likeCount || 0);
        viewCount.textContent = formatCount(currentPost.viewCount || 0);
        commentCountEl.textContent = formatCount(currentPost.commentCount || 0);

        // 본인 글이면 수정/삭제 버튼 표시 (writerEmail로 비교)
        if (currentUser && currentPost.writerEmail === currentUser.email) {
            postActions.style.display = 'flex';
        }

        // 좋아요 상태 확인
        if (currentPost.isLiked) {
            isLiked = true;
            likeBtn.classList.add('liked');
        }
    }

    function renderComments(comments) {
        commentList.innerHTML = '';

        comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment-item';
            commentEl.dataset.id = comment.commentId;

            const isOwner = currentUser && comment.authorId === currentUser.userId;

            commentEl.innerHTML = `
                <div class="comment-header">
                    <div class="comment-author-info">
                        <div class="comment-avatar" ${comment.authorProfileImage ? `style="background-image: url(${comment.authorProfileImage})"` : ''}></div>
                        <span class="comment-author-name">${comment.authorNickname || '익명'}</span>
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

            // 댓글 수정/삭제 이벤트
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
    // 5. Event Listeners
    // ==========================================
    // 좋아요 버튼
    likeBtn.addEventListener('click', toggleLike);

    // 게시글 수정
    editPostBtn.addEventListener('click', () => {
        window.location.href = `post_edit.html?id=${postId}`;
    });

    // 게시글 삭제
    deletePostBtn.addEventListener('click', () => {
        showModal('게시글을 삭제하시겠습니까?', deletePost);
    });

    // 모달 취소
    modalCancelBtn.addEventListener('click', hideModal);

    // 모달 외부 클릭 시 닫기
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            hideModal();
        }
    });

    // 댓글 입력
    commentInput.addEventListener('input', () => {
        const hasContent = commentInput.value.trim().length > 0;
        commentSubmitBtn.disabled = !hasContent;
        commentSubmitBtn.classList.toggle('active', hasContent);
    });

    // 댓글 등록
    commentSubmitBtn.addEventListener('click', submitComment);

    // ==========================================
    // 6. Initialize
    // ==========================================
    async function init() {
        await fetchCurrentUser();
        await fetchPostDetail();
        await fetchComments();
    }

    init();
});
