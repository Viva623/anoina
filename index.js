/* ── 프로필 선택 ─────────────────────────────── */
.rs-profile-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.rs-profile-label {
    font-size: 12px;
    font-weight: 700;
    color: #555;
}
.rs-profile-select {
    width: 100%;
    padding: 10px 12px;
    border: 1.5px solid #222;
    background: #fff;
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 13px;
    color: #222;
    cursor: pointer;
    box-shadow: 2px 2px 0px #222;
}

/* ── 생성 버튼 ───────────────────────────────── */
.rs-generate-btn {
    width: 100%;
    padding: 12px;
    background: #e65c41;
    color: #fff;
    border: 2px solid #222;
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 3px 3px 0px #222;
    transition: all 0.1s ease;
}
.rs-generate-btn:active {
    box-shadow: 1px 1px 0px #222;
    transform: translate(2px, 2px);
}

/* ── 다시 시도 / 다시 생성 버튼 ──────────────── */
.rs-retry-btn {
    width: 100%;
    padding: 10px;
    background: #dadada;
    color: #222;
    border: 1px solid #222;
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 2px 2px 0px #222;
    transition: all 0.1s ease;
}
.rs-retry-btn:active {
    box-shadow: 0 0 0 #222;
    transform: translate(1px, 1px);
}

/* ── 하단 행 ─────────────────────────────────── */
.rs-bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}
.rs-bottom-row .rs-retry-btn {
    width: auto;
    flex-shrink: 0;
}
