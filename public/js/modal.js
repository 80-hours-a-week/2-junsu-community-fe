/**
 * 공용 커스텀 모달 함수
 * 기존 alert()를 대체하여 사용자 경험을 개선합니다.
 */

/**
 * 커스텀 알림 모달을 표시합니다.
 * @param {string} message - 표시할 메시지
 * @param {function} onConfirm - 확인 버튼 클릭 시 실행할 콜백 (선택사항)
 */
function showCustomModal(message, onConfirm) {
    // 오버레이 생성
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

    // 모달 박스 생성
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        max-width: 300px;
    `;

    // 메시지
    const msg = document.createElement('p');
    msg.textContent = message;
    msg.style.cssText = `
        margin: 0 0 20px 0;
        font-size: 16px;
        line-height: 1.5;
        white-space: pre-line;
    `;

    // 확인 버튼
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

    // 버튼에 포커스
    confirmBtn.focus();
}

// 전역으로 사용 가능하도록 window에 할당
window.showCustomModal = showCustomModal;
