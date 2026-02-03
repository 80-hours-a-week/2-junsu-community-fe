// posts.js - API_BASE_URL, formatNumber, formatDate는 common.js에서 제공

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

    // 로컬 스토리지에서 사용자 정보 즉시 로드 (깜박임 방지)
    function loadUserFromStorage() {
        const profileImage = localStorage.getItem('profileImage');
        if (profileImage) {
            updateProfileIcon(profileImage);
        }
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
                // 최신 정보로 업데이트 및 스토리지 갱신
                const user = result.data || result;
                if (user.profileImage) {
                    localStorage.setItem('profileImage', user.profileImage);
                    updateProfileIcon(user.profileImage);
                }
            } else {
                console.warn('Login required or session expired');
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
            // localStorage 정리 (다른 사용자 로그인 시 이전 데이터 방지)
            localStorage.removeItem('profileImage');
            localStorage.removeItem('nickname');
            localStorage.removeItem('email');
            localStorage.removeItem('userId');
            localStorage.removeItem('user');
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
        // 좋아요/댓글 수 포맷팅
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
    loadUserFromStorage(); // 스토리지에서 먼저 로드해서 깜박임 방지
    fetchUserProfile(); // 백엔드에서 최신 정보 확인
    fetchPosts(); // 초기 게시글 로드

    // ==========================================
    // 브라우저 뒤로가기 시 데이터 새로고침 (bfcache 대응)
    // ==========================================
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            // bfcache에서 복원된 경우 - 게시글 목록 다시 로드
            offset = 0;
            isLastPage = false;
            postContainer.innerHTML = '';
            fetchPosts();
        }
    });
});
