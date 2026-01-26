const API_BASE_URL = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
    const postContainer = document.getElementById('postList');
    const scrollTrigger = document.getElementById('scrollTrigger');
    const profileIcon = document.getElementById('profileIcon');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    let offset = 0;
    const LIMIT = 10;
    let isLoading = false;
    let isLastPage = false;

    // 유틸리티 함수
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

    // 1. 백엔드에서 게시글 목록 가져오기
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

                if (posts.length > 0) {
                    console.log('[Posts] First post data:', posts[0]);
                }

                posts.forEach(post => {
                    const postEl = createPostElement(post);
                    postContainer.appendChild(postEl);
                });

                offset += posts.length;

                // 더 이상 불러올 데이터가 없으면 중단
                if (offset >= totalCount) {
                    isLastPage = true;
                    // 스크롤 트리거 숨김 또는 감시 중지
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

    // 2. 사용자 프로필 가져오기
    async function fetchUserProfile() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/auth/me`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // 세션 쿠키 포함
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
        if (profileIcon) {
            if (imageUrl) {
                profileIcon.style.backgroundImage = `url(${imageUrl})`;
            } else {
                profileIcon.style.backgroundColor = '#7F6AEE'; // 로그인한 사용자 기본 색상
            }
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

    // HTML 요소 생성
    function createPostElement(post) {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.onclick = () => {
            window.location.href = `post_detail.html?id=${post.postId}`;
        };

        // 백엔드 응답 매핑
        // 현재 백엔드가 좋아요/댓글 수를 반환하지 않아 0으로 기본 설정
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

    // 3. 이벤트 리스너
    // 드롭다운 토글
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
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // 인터섹션 옵저버 (무한 스크롤)
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

    // 초기화
    fetchUserProfile(); // 로그인 상태 확인 및 프로필 로드
    fetchPosts(); // 초기 게시글 로드
});
