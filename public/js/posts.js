const API_BASE_URL = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
    const postContainer = document.getElementById('postList');
    const scrollTrigger = document.getElementById('scrollTrigger');
    let offset = 0;
    const LIMIT = 10;
    let isLoading = false;
    let isLastPage = false;

    // Helper functions
    function formatNumber(num) {
        if (!num) return '0';
        if (num >= 100000) return (num / 1000).toFixed(0) + 'k';
        if (num >= 10000) return (num / 1000).toFixed(0) + 'k';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return num.toString();
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        const pad = (n) => n.toString().padStart(2, '0');
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const min = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    }

    // 1. Fetch Posts from Backend
    async function fetchPosts() {
        if (isLoading || isLastPage) return;

        isLoading = true;

        try {
            const response = await fetch(`${API_BASE_URL}/v1/posts?offset=${offset}&limit=${LIMIT}`);
            const result = await response.json();

            if (response.ok) {
                const posts = result.data.posts;
                const totalCount = result.data.totalCount;

                if (posts.length === 0) {
                    isLastPage = true;
                    if (offset === 0) {
                        postContainer.innerHTML = '<div style="text-align:center; padding: 20px;">게시글이 없습니다. 첫 글을 작성해보세요!</div>';
                    }
                    return;
                }

                posts.forEach(post => {
                    const postEl = createPostElement(post);
                    postContainer.appendChild(postEl);
                });

                offset += posts.length;

                // 더 이상 불러올 데이터가 없으면 중단
                if (offset >= totalCount) {
                    isLastPage = true;
                    // remove scroll trigger or just stop observing
                    if (scrollTrigger) scrollTrigger.style.display = 'none';
                }
            } else {
                console.error('Failed to fetch posts:', result.message);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            isLoading = false;
        }
    }

    // 2. Fetch User Profile
    async function fetchUserProfile() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/auth/me`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Send session cookie
            });

            const result = await response.json();

            if (response.ok) {
                updateProfileIcon(result.data.profileimage);
            } else {
                console.warn('Not logged in or session expired');
                // Redirect to login if needed, or just show default icon
                // window.location.href = '/login.html'; 
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    }

    function updateProfileIcon(imageUrl) {
        const profileIcon = document.querySelector('.profile-icon');
        if (profileIcon) {
            if (imageUrl) {
                profileIcon.style.backgroundImage = `url(${imageUrl})`;
            } else {
                profileIcon.style.backgroundColor = '#7F6AEE'; // Default color for logged in user
            }

            // Optional: Click to logout or go to settings
            profileIcon.onclick = () => {
                const confirmLogout = confirm('로그아웃 하시겠습니까?');
                if (confirmLogout) {
                    logout();
                }
            };
        }
    }

    async function logout() {
        try {
            await fetch(`${API_BASE_URL}/v1/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            alert('로그아웃 되었습니다.');
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    // Create HTML Element
    function createPostElement(post) {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.onclick = () => {
            alert(`게시글 상세(ID: ${post.postId})로 이동합니다.`);
            // location.href = `/posts/${post.postId}`; // 상세 페이지 구현 시 주석 해제
        };

        // Backend response mapping
        // Currently backend doesn't return likes/comments count, so mock them as 0 or use random if desired.
        // For now, default to 0 as planned.
        const likesStr = formatNumber(post.likeCount || 0);
        const commentsStr = formatNumber(post.commentCount || 0);
        const viewsStr = formatNumber(post.viewCount || 0);
        const dateStr = formatDate(post.createdAt);
        const authorProfileClass = post.authorProfileImage ? '' : 'default-profile';

        card.innerHTML = `
            <div class="post-card-title">${post.title}</div>
            <div class="post-card-meta">
                <div class="post-stats">
                    <span>좋아요 ${likesStr}</span>
                    <span>댓글 ${commentsStr}</span>
                    <span>조회수 ${viewsStr}</span>
                </div>
                <div class="post-date">${dateStr}</div>
            </div>
            <div class="post-divider"></div>
            <div class="post-author-row">
                <div class="author-profile-img ${authorProfileClass}" 
                     style="${post.authorProfileImage ? `background-image: url(${post.authorProfileImage}); background-size: cover;` : ''}">
                </div>
                <span class="author-name">${post.writer}</span>
            </div>
        `;
        return card;
    }

    // Inline Intersection Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                fetchPosts();
            }
        });
    });

    if (scrollTrigger) {
        observer.observe(scrollTrigger);
    }

    // Initialize
    fetchUserProfile(); // Check login status & Load profile
    fetchPosts(); // Load initial posts
});
