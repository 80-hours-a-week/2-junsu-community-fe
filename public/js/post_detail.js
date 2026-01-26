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

    // Load User from LocalStorage (Sync) to avoid delay
    function loadUserFromStorage() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            currentUser = JSON.parse(userStr);
        }
        // Also check if individual id exists (robustness)
        if (!currentUser && localStorage.getItem('userId')) {
            currentUser = {
                userId: localStorage.getItem('userId'),
                nickname: localStorage.getItem('nickname'),
                email: localStorage.getItem('email'),
                profileImage: localStorage.getItem('profileImage')
            };
        }
    }

    // ... Helper Functions ...
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

    // ... API Functions ...

    // Fetch latest user info (Async) - updates currentUser if changed
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
                    // Update storage
                    localStorage.setItem('user', JSON.stringify(currentUser));
                    if (currentUser.userId) localStorage.setItem('userId', currentUser.userId);
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
                alert('게시글을 찾을 수 없습니다.');
                window.location.href = '/posts'; // index.html -> /posts
                return;
            }

            const result = await response.json();
            currentPost = result.data || result;
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
                const comments = Array.isArray(data) ? data : (data.comments || []);
                renderComments(comments);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    }

    // Check if current user has already liked this post
    // NOTE: Backend doesn't support GET /likes (returns 405). 
    // Relying on 409 Conflict handling in toggleLike as fallback.
    async function fetchLikeStatus() {
        // Backend doesn't support this endpoint yet - disabled to avoid 405 errors
        // When backend adds support for GET /likes or includes isLiked in post detail,
        // this function can be re-enabled.
        return;

        /*
        if (!currentUser) return;

        try {
            const response = await fetch(`${API_BASE_URL}/v1/posts/${postId}/likes`, {
                method: 'GET',
                credentials: 'include'
            });

            console.log('[Like Status] GET response:', response.status);

            if (response.ok) {
                const result = await response.json();
                const data = result.data || result;

                if (data.isLiked === true || data.liked === true) {
                    isLiked = true;
                    likeBtn.classList.add('liked');
                    console.log('[Like Status] User has liked this post');
                } else if (Array.isArray(data)) {
                    const userLiked = data.some(like =>
                        String(like.userId) === String(currentUser.userId)
                    );
                    if (userLiked) {
                        isLiked = true;
                        likeBtn.classList.add('liked');
                        console.log('[Like Status] Found user in likers list');
                    }
                }
            }
        } catch (error) {
            console.error('[Like Status] Error checking like status:', error);
        }
        */
    }

    async function toggleLike() {
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            window.location.href = '/login.html';
            return;
        }

        console.log('[Like] Toggle Like called. Current isLiked:', isLiked);

        try {
            // Determine method based on current state
            const method = isLiked ? 'DELETE' : 'POST';

            const response = await fetch(`${API_BASE_URL}/v1/posts/${postId}/likes`, {
                method: method,
                credentials: 'include'
            });

            console.log('[Like] Request:', method, 'Status:', response.status);

            // Handle 409 Conflict (ALREADY_LIKED) - just correct our state, don't retry
            if (response.status === 409) {
                console.log('[Like] Got 409 Conflict - already liked. Correcting state.');
                isLiked = true;
                likeBtn.classList.add('liked');
                // Don't change count - backend already has the like counted
                return;
            }

            if (response.ok || response.status === 200 || response.status === 201 || response.status === 204) {
                // Toggle the state
                isLiked = (method === 'POST');
                likeBtn.classList.toggle('liked', isLiked);

                console.log('[Like] Success! isLiked is now:', isLiked);

                // Update count locally
                let count = parseInt(likeCount.textContent.replace(/[^0-9]/g, '')) || 0;
                if (method === 'POST') count++;
                else count--;
                likeCount.textContent = formatCount(Math.max(0, count));

            } else {
                const errorText = await response.text();
                console.error('[Like] Failed:', response.status, errorText);
            }
        } catch (error) {
            console.error('[Like] Error:', error);
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
        }
    }

    async function submitComment() {
        const content = commentInput.value.trim();
        if (!content) return;

        if (!currentUser) {
            alert('로그인이 필요합니다.');
            window.location.href = '/login.html';
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

                // Update comment count
                let count = parseInt(commentCountEl.textContent.replace(/[^0-9]/g, '')) || 0;
                if (!editingCommentId) { // If new comment
                    commentCountEl.textContent = formatCount(count + 1);
                }
            } else {
                alert('댓글 등록에 실패했습니다.');
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

        postTitle.textContent = currentPost.title || '';
        postContent.textContent = currentPost.content || '';
        authorName.textContent = currentPost.writer || '익명';
        postDate.textContent = currentPost.createdAt ? formatDate(currentPost.createdAt) : '';

        // Author Avatar - Mock or Real
        if (currentPost.authorProfileImage) {
            authorAvatar.style.backgroundImage = `url(${currentPost.authorProfileImage})`;
        } else {
            authorAvatar.style.backgroundColor = '#D9D9D9';
        }

        // Image
        if (currentPost.fileUrl) {
            postImage.src = currentPost.fileUrl;
            postImageContainer.style.display = 'block';
        } else {
            postImageContainer.style.display = 'none';
        }

        // Stats
        likeCount.textContent = formatCount(currentPost.likeCount || 0);
        viewCount.textContent = formatCount(currentPost.viewCount || 0);
        commentCountEl.textContent = formatCount(currentPost.commentCount || 0);

        console.log('[Post] Full post data:', currentPost);

        // Ownership Check (Compare userId)
        const currentUserId = currentUser ? String(currentUser.userId) : null;
        // Check multiple possible fields for post author ID
        let postAuthorId = null;
        if (currentPost.author && currentPost.author.userId) {
            postAuthorId = String(currentPost.author.userId);
        } else if (currentPost.authorId) {
            postAuthorId = String(currentPost.authorId);
        } else if (currentPost.userId) {
            postAuthorId = String(currentPost.userId);
        }

        console.log('[Post] currentUserId:', currentUserId, ', postAuthorId:', postAuthorId);

        if (currentUserId && postAuthorId && currentUserId === postAuthorId) {
            postActions.style.display = 'flex';
        } else {
            postActions.style.display = 'none';
        }

        // Like Status - check multiple possible fields
        if (currentPost.isLiked === true || currentPost.liked === true) {
            isLiked = true;
            likeBtn.classList.add('liked');
            console.log('[Post] User has already liked this post');
        } else {
            isLiked = false;
            likeBtn.classList.remove('liked');
        }
    }

    function renderComments(comments) {
        console.log('[Comments] Rendering', comments.length, 'comments');
        console.log('[Comments] Current User:', currentUser);

        commentList.innerHTML = '';

        comments.forEach((comment, index) => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment-item';
            commentEl.dataset.id = comment.commentId;

            // Determine if current user is owner of comment
            // SECURITY: Use authorId first, then email comparison as fallback
            const currentUserId = currentUser ? String(currentUser.userId) : null;
            const currentEmail = currentUser ? currentUser.email : null;

            // Backend should return authorId, userId, or nested author.userId
            let commentAuthorId = null;
            if (comment.authorId) {
                commentAuthorId = String(comment.authorId);
            } else if (comment.userId) {
                commentAuthorId = String(comment.userId);
            } else if (comment.author && comment.author.userId) {
                commentAuthorId = String(comment.author.userId);
            }

            // Get comment author email (writerEmail from backend)
            const commentEmail = comment.writerEmail || comment.authorEmail ||
                (comment.author && comment.author.email);

            // Check ownership by ID first, then by email (secure fallback)
            let isOwner = false;
            if (currentUserId && commentAuthorId) {
                isOwner = currentUserId === commentAuthorId;
            } else if (currentEmail && commentEmail) {
                // Email is unique per user, so this is a secure comparison
                isOwner = currentEmail === commentEmail;
                console.log(`[Comment ${index}] Using email comparison: ${currentEmail} === ${commentEmail}`);
            } else {
                console.warn(`[Comment ${index}] Missing authorId and email - cannot determine ownership.`);
            }

            console.log(`[Comment ${index}] CommentID: ${comment.commentId}, AuthorID: ${commentAuthorId}, Email: ${commentEmail}, CurrentUserID: ${currentUserId}, isOwner: ${isOwner}`);
            console.log(`[Comment ${index}] Full comment object:`, comment);

            // Get author name for display (try multiple fields)
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

            // Bind events for this comment
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
                    // Scroll to input
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

    // ... Event Listeners (unchanged mostly) ...
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


    // Initialize
    async function init() {
        loadUserFromStorage(); // Load instantly from local storage
        await fetchPostDetail();
        await fetchLikeStatus(); // Check if user already liked this post
        fetchComments();
        fetchCurrentUser(); // Background refresh user data
    }

    init();
});
