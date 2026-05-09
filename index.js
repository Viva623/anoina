const RS_MODULE = 'reply_suggest';

const RS_DEFAULTS = Object.freeze({
    autoSend: false,
});

function getRsSettings() {
    const ctx = SillyTavern.getContext();
    if (!ctx.extensionSettings[RS_MODULE]) {
        ctx.extensionSettings[RS_MODULE] = structuredClone(RS_DEFAULTS);
    }
    for (const key of Object.keys(RS_DEFAULTS)) {
        if (!Object.hasOwn(ctx.extensionSettings[RS_MODULE], key)) {
            ctx.extensionSettings[RS_MODULE][key] = RS_DEFAULTS[key];
        }
    }
    return ctx.extensionSettings[RS_MODULE];
}

// ===== 프롬프트 빌드 =====
function buildSuggestPrompt() {
    const ctx = SillyTavern.getContext();
    const charName = ctx.name2 || 'char';
    const userName = ctx.name1 || 'user';

    const lastChar = [...ctx.chat].reverse().find(m => !m.is_user);
    const lastUser = [...ctx.chat].reverse().find(m => m.is_user);
    const lastCharMsg = lastChar?.mes || '(없음)';
    const lastUserMsg = lastUser?.mes || '(없음)';

    return `### You are ${userName}'s roleplay reply suggestion assistant.

[ABSOLUTE MODULE OVERRIDE]
This module is active because toggle_답추 is enabled.
You MUST ignore all story continuation, status windows, episode templates, narration formats, and ${charName} response instructions.
Your ONLY task is to generate 3 reply candidates for ${userName}.

Goal:
Read ${charName}'s last reply and the emotional flow of the current scene, and create 3 reply candidates that ${userName} can use immediately.

Current context:
- Last ${charName} reply: ${lastCharMsg}
- Last ${userName} input: ${lastUserMsg}

Rules:
- Must write only from ${userName}'s point of view.
- Do not write ${charName}'s actions, lines, or emotions on their behalf.
- Write each candidate like an actual roleplay reply.
- Candidate 1: Natural and stable reaction.
- Candidate 2: Shows a bit more emotion.
- Candidate 3: Advances the relationship/scene slightly.
- Each candidate MUST be around 150~250 Korean characters, including spaces.
- All three candidates MUST be written in Korean.
- MUST follow this exact structure: [1-2 sentences of detailed action and emotional description] + ["1-2 lines of immersive dialogue"].
- Do not add extra explanation after the third candidate.
- Do not use XML, JSON, markdown bullets, titles, commentary, or extra text.
- Do not use the markers §1, §2, or §3 inside the candidate text except as separators.

Output ONLY in this exact format:

§1 First Korean reply candidate
§2 Second Korean reply candidate
§3 Third Korean reply candidate`;
}

// ===== 응답 파싱 =====
function parseSuggestions(text) {
    const regex = /§1\s*([\s\S]*?)\s*§2\s*([\s\S]*?)\s*§3\s*([\s\S]*)/;
    const match = text.match(regex);
    if (!match) return null;
    return [
        match[1].trim(),
        match[2].trim(),
        match[3].trim(),
    ];
}

// ===== 팝업 UI =====
function showSuggestPopup() {
    // 기존 팝업 제거
    document.querySelector('.rs-overlay')?.remove();

    const settings = getRsSettings();

    const overlay = document.createElement('div');
    overlay.className = 'rs-overlay';

    const popup = document.createElement('div');
    popup.className = 'rs-popup';

    // 헤더
    const header = document.createElement('div');
    header.className = 'rs-header';
    header.innerHTML = `<span class="rs-header-title">💬 답변 추천</span>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'rs-close-btn';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);

    // 컨텐츠
    const content = document.createElement('div');
    content.className = 'rs-content';

    popup.appendChild(header);
    popup.appendChild(content);
    overlay.appendChild(popup);

    // 바깥 클릭으로 닫기
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // ESC로 닫기
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);

    // 로딩 표시
    content.innerHTML = `
        <div class="rs-loading">
            <div class="rs-spinner"></div>
            <span>답변 추천 생성 중...</span>
        </div>`;

    // API 호출
    generateSuggestions(content, settings, overlay);
}

// ===== API 호출 & 결과 렌더 =====
async function generateSuggestions(content, settings, overlay) {
    const ctx = SillyTavern.getContext();
    const prompt = buildSuggestPrompt();

    try {
        const result = await ctx.generateQuietPrompt({
            quietPrompt: prompt,
            skipWIAN: true,
            removeReasoning: true,
        });

        if (!result || !result.trim()) {
            content.innerHTML = '<div class="rs-error">응답이 비어있습니다. 다시 시도해주세요.</div>';
            return;
        }

        const suggestions = parseSuggestions(result);
        if (!suggestions) {
            console.log('[Reply Suggest] Raw response:', result);
            content.innerHTML = `<div class="rs-error">파싱 실패. 응답 형식이 맞지 않습니다.<br><br><small style="color:#888;word-break:break-all;">${result.substring(0, 200)}</small></div>`;
            return;
        }

        renderCards(content, suggestions, settings, overlay);
    } catch (err) {
        console.error('[Reply Suggest] Error:', err);
        content.innerHTML = `<div class="rs-error">에러 발생: ${err.message || '알 수 없는 오류'}</div>`;
    }
}

// ===== 카드 렌더 =====
function renderCards(content, suggestions, settings, overlay) {
    const labels = ['안정적', '감정적', '진전'];

    let html = '';
    suggestions.forEach((text, i) => {
        html += `
            <div class="rs-card">
                <div class="rs-card-header">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div class="rs-card-number">${i + 1}</div>
                        <span style="font-size:11px;color:#888;font-weight:700;">${labels[i]}</span>
                    </div>
                    <button class="rs-pick-btn" data-rs-index="${i}">선택</button>
                </div>
                <div class="rs-card-text">${escapeHtml(text)}</div>
            </div>`;
    });

    // 설정 토글
    html += `
        <div class="rs-setting-row" style="padding:4px 0;">
            <span style="font-size:12px;color:#666;font-weight:700;">선택 시 바로 전송</span>
            <label style="cursor:pointer;">
                <input type="checkbox" id="rs-auto-send" ${settings.autoSend ? 'checked' : ''} style="width:16px;height:16px;accent-color:#e65c41;cursor:pointer;" />
            </label>
        </div>`;

    content.innerHTML = html;

    // 자동전송 토글
    content.querySelector('#rs-auto-send')?.addEventListener('change', function () {
        settings.autoSend = this.checked;
        SillyTavern.getContext().saveSettingsDebounced();
    });

    // 선택 버튼
    content.querySelectorAll('.rs-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.rsIndex, 10);
            const text = suggestions[idx];
            pickSuggestion(text, settings, overlay);
        });
    });
}

// ===== 선택 처리 =====
function pickSuggestion(text, settings, overlay) {
    const textarea = document.getElementById('send_textarea');
    if (!textarea) return;

    // 입력창에 텍스트 넣기
    textarea.value = text;
    // SillyTavern이 변경을 감지하도록 이벤트 발생
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    // 팝업 닫기
    overlay.remove();

    if (settings.autoSend) {
        // 바로 전송
        setTimeout(() => {
            const sendBtn = document.getElementById('send_but');
            if (sendBtn) sendBtn.click();
        }, 100);
    } else {
        // 입력창 포커스
        textarea.focus();
    }
}

// ===== HTML 이스케이프 =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== 설정 UI =====
function loadRsSettingsUI() {
    const settings = getRsSettings();

    const html = `
    <div id="reply-suggest-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>💬 Reply Suggest</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="cb-setting-row">
                    <label for="rs_auto_send">선택 시 바로 전송</label>
                    <input id="rs_auto_send" type="checkbox" ${settings.autoSend ? 'checked' : ''} />
                </div>
                <small style="color:#888;display:block;margin-top:6px;">
                    OFF: 선택하면 입력창에만 넣음 (수정 가능)<br>
                    ON: 선택하면 바로 전송
                </small>
            </div>
        </div>
    </div>`;

    $('#extensions_settings2').append(html);

    $('#rs_auto_send').on('change', function () {
        settings.autoSend = !!$(this).prop('checked');
        SillyTavern.getContext().saveSettingsDebounced();
    });
}

// ===== 메인 버튼 =====
function addRsButton() {
    document.getElementById('reply-suggest-btn')?.remove();

    const btn = document.createElement('div');
    btn.id = 'reply-suggest-btn';
    btn.textContent = '💬';
    btn.title = '답변 추천';
    btn.style.cssText = 'cursor:pointer;font-size:1.2em;padding:3px 5px;border-radius:5px;transition:background 0.2s;z-index:9999;';
    btn.addEventListener('click', () => {
        const ctx = SillyTavern.getContext();
        if (!ctx.chat || ctx.chat.length === 0) {
            toastr.warning('채팅이 없습니다. 먼저 대화를 시작해주세요!');
            return;
        }
        showSuggestPopup();
    });

    // cb-btn-wrapper가 있으면 거기에, 없으면 새로 만들기
    const wrapper = document.getElementById('cb-btn-wrapper');
    if (wrapper) {
        wrapper.appendChild(btn);
        console.log('[Reply Suggest] Button added to wrapper');
    } else {
        const newWrapper = document.createElement('div');
        newWrapper.id = 'cb-btn-wrapper';
        newWrapper.style.cssText = 'display:flex;flex-direction:row;gap:4px;align-self:flex-start;';
        newWrapper.appendChild(btn);
        const sendForm = document.getElementById('send_form');
        if (sendForm && sendForm.firstChild) {
            sendForm.insertBefore(newWrapper, sendForm.firstChild);
        } else if (sendForm) {
            sendForm.appendChild(newWrapper);
        }
        console.log('[Reply Suggest] Created new wrapper');
    }
}

// ===== Init =====
(function init() {
    loadRsSettingsUI();
    setTimeout(addRsButton, 1500);
    console.log('[Reply Suggest] Extension loaded!');
})();
