document.addEventListener('DOMContentLoaded', () => {
    const postContainer = document.getElementById('postList');
    const scrollTrigger = document.getElementById('scrollTrigger');
    let postCount = 0;
    const POSTS_PER_LOAD = 10;

    // Helper function to format numbers (1k, 10k, 100k)
    function formatNumber(num) {
        if (num >= 100000) {
            return (num / 1000).toFixed(0) + 'k';
        }
        if (num >= 10000) {
            return (num / 1000).toFixed(0) + 'k';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        }
        return num.toString();
    }

    // Helper to format date (yyyy-mm-dd hh:mm:ss)
    function formatDate(date) {
        const d = new Date(date);
        const pad = (n) => n.toString().padStart(2, '0');
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const min = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    }

    // Generate Dummy Data
    function generateDummyPost(id) {
        // Random stats for testing formatting
        const likes = Math.floor(Math.random() * 15000); // 0 ~ 15000
        const comments = Math.floor(Math.random() * 5000);
        const views = Math.floor(Math.random() * 200000); // 0 ~ 200000

        return {
            id: id,
            title: `제목 ${id} - 아무 말 대잔치 게시글 테스트 중입니다. 길이가 길어지면 어떻게 될까요?`,
            likes: likes,
            comments: comments,
            views: views,
            date: new Date().toISOString(), // Use current time
            author: `더미 작성자 ${id}`
        };
    }

    function createPostElement(post) {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.onclick = () => {
            alert(`게시글 ${post.id} 상세 페이지로 이동합니다 (구현 예정)`);
        };

        // Format stats
        const likesStr = formatNumber(post.likes);
        const commentsStr = formatNumber(post.comments);
        const viewsStr = formatNumber(post.views);
        const dateStr = formatDate(post.date);

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
                <div class="author-profile-img"></div>
                <span class="author-name">${post.author}</span>
            </div>
        `;
        return card;
    }

    function loadMorePosts() {
        console.log('Loading more posts...');
        // Simulate network delay
        setTimeout(() => {
            for (let i = 0; i < POSTS_PER_LOAD; i++) {
                postCount++;
                const post = generateDummyPost(postCount);
                const postEl = createPostElement(post);
                postContainer.appendChild(postEl);
            }
        }, 500);
    }

    // Inline Intersection Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadMorePosts();
            }
        });
    });

    if (scrollTrigger) {
        observer.observe(scrollTrigger);
    }

    // Initial load
    loadMorePosts();
});
