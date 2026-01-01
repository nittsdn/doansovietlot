/* * VIETLOTT PRO V5.4 - FINAL ENGINE
 * Update: No logic change, visual tweaks only in CSS
 */

let db = [], stats = { hot: [], cold: [], gap: [] };
let historyDataStrings = []; 
let disabledNumbers = [];

const ICONS = {
    DIAMOND: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-dia" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#e0f7fa"/><stop offset="100%" style="stop-color:#b2ebf2"/></linearGradient></defs><path d="M32 2 L2 24 L32 62 L62 24 L32 2 Z" fill="url(#grad-dia)" stroke="#00bcd4" stroke-width="1.5"/><path d="M2 24 L62 24 M12 24 L32 2 L52 24 M32 62 L12 24 M32 62 L52 24" stroke="#00acc1" stroke-width="1" stroke-opacity="0.6"/><path d="M20 24 L32 36 L44 24" fill="white" fill-opacity="0.4"/></svg>`,
    RUBY: `<svg viewBox="0 0 64 64" fill="none"><defs><radialGradient id="grad-ruby" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:#ff5252"/><stop offset="100%" style="stop-color:#b71c1c"/></radialGradient></defs><path d="M32 4 L10 24 L32 60 L54 24 Z" fill="url(#grad-ruby)"/><path d="M10 24 L54 24 M32 4 L32 60" stroke="#ff8a80" stroke-width="0.5" stroke-opacity="0.5"/></svg>`,
    ICE: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-ice" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#e1f5fe"/><stop offset="100%" style="stop-color:#81d4fa"/></linearGradient></defs><rect x="12" y="12" width="40" height="40" rx="8" fill="url(#grad-ice)" stroke="#4fc3f7" stroke-width="1.5"/><path d="M20 20 L44 44 M44 20 L20 44" stroke="white" stroke-width="1.5" stroke-opacity="0.4"/></svg>`
};

// ĐƯỜNG DẪN DATABASE TỪ GOOGLE SHEETS
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv";

async function loadData() {
    updateStatus("Đang đồng bộ...", true);
    try {
        const response = await fetch(SHEET_URL);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).filter(r => r.trim() !== "");
        
        // Chuyển đổi dữ liệu CSV
        db = rows.slice(1).map(row => {
            const c = row.split(",");
            return {
                id: c[0].trim(),
                nums: [parseInt(c[1]), parseInt(c[2]), parseInt(c[3]), parseInt(c[4]), parseInt(c[5]), parseInt(c[6])].sort((a,b)=>a-b),
                pwr: parseInt(c[7]),
                date: c[8].trim(),
                jackpot1: c[9] ? c[9].trim() : "0"
            };
        });

        // Sắp xếp ID giảm dần (mới nhất lên đầu)
        db.sort((a, b) => parseInt(b.id) - parseInt(a.id));

        if (db.length > 0) {
            // Kích hoạt lại toàn bộ logic gốc sau khi có db
            analyzeData();
            renderGrid();
            updateUI();
            setupEventListeners(); // Kích hoạt các nút bấm
            updateStatus(`${db[0].date} | J1: ${db[0].jackpot1}`, false);
        }
    } catch (e) {
        console.error(e);
        updateStatus("Lỗi kết nối database!", false);
    }
}

function analyzeData() {
    let counts = new Array(56).fill(0);
    let lastSeen = new Array(56).fill(-1);
    
    db.forEach((draw, idx) => {
        draw.nums.forEach(n => {
            counts[n]++;
            if (lastSeen[n] === -1) lastSeen[n] = idx;
        });
    });

    let mapped = [];
    for (let i = 1; i <= 55; i++) {
        mapped.push({ n: i, count: counts[i], gap: lastSeen[i] });
    }

    stats.hot = [...mapped].sort((a, b) => b.count - a.count).slice(0, 6).map(x => x.n);
    stats.cold = [...mapped].sort((a, b) => a.count - b.count).slice(0, 6).map(x => x.n);
    stats.gap = [...mapped].sort((a, b) => b.gap - a.gap).slice(0, 6).map(x => x.n);
}

function updateUI() {
    const last = db[0];
    document.getElementById('last-draw-id').innerText = "Kỳ #" + last.id;
    const container = document.getElementById('last-result-numbers');
    container.innerHTML = '';
    last.nums.forEach(n => {
        const span = document.createElement('span');
        span.className = 'pill-num';
        span.innerText = n.toString().padStart(2, '0');
        container.appendChild(span);
    });
    const pwrSpan = document.createElement('span');
    pwrSpan.className = 'pill-num pwr';
    pwrSpan.innerText = last.pwr.toString().padStart(2, '0');
    container.appendChild(pwrSpan);
}

function renderGrid() {
    const grid = document.getElementById('number-grid');
    grid.innerHTML = '';
    for (let i = 1; i <= 55; i++) {
        const div = document.createElement('div');
        div.className = 'num-cell';
        if (disabledNumbers.includes(i)) div.classList.add('disabled');
        
        let icon = ICONS.DIAMOND;
        if (stats.hot.includes(i)) {
            div.classList.add('hot');
            icon = ICONS.RUBY;
        } else if (stats.gap.includes(i)) {
            div.classList.add('cold');
            icon = ICONS.ICE;
        }

        div.innerHTML = `<div class="cell-icon">${icon}</div><div class="cell-num">${i.toString().padStart(2, '0')}</div>`;
        div.onclick = () => {
            div.classList.toggle('disabled');
            if (div.classList.contains('disabled')) disabledNumbers.push(i);
            else disabledNumbers = disabledNumbers.filter(x => x !== i);
        };
        grid.appendChild(div);
    }
}

function generateSystem() {
    const pool = [];
    for (let i = 1; i <= 55; i++) if (!disabledNumbers.includes(i)) pool.push(i);
    if (pool.length < 6) return;
    const res = [];
    const tempPool = [...pool];
    while (res.length < 6) {
        const idx = Math.floor(Math.random() * tempPool.length);
        res.push(tempPool.splice(idx, 1)[0]);
    }
    showPopup(res.sort((a, b) => a - b));
}

function showPopup(nums) {
    const overlay = document.createElement('div');
    overlay.className = 'ios-overlay';
    overlay.onclick = () => document.body.removeChild(overlay);
    const modal = document.createElement('div');
    modal.className = 'ios-modal';
    modal.onclick = (e) => e.stopPropagation();
    modal.innerHTML = `
        <h3>GỢI Ý KỲ TIẾP THEO</h3>
        <div class="modal-nums">${nums.map(n => `<span class="pill-num">${n.toString().padStart(2, '0')}</span>`).join('')}</div>
        <button class="ios-btn-action" onclick="this.parentElement.parentElement.click()">XÁC NHẬN</button>`;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// KHÔI PHỤC TOÀN BỘ LOGIC EVENT LISTENER GỐC
function setupEventListeners() {
    const pasteBtn = document.getElementById('paste-btn');
    const inputs = document.querySelectorAll('.ios-num-box');
    
    if(pasteBtn) {
        pasteBtn.onclick = async () => {
            const text = await navigator.clipboard.readText();
            const numbers = text.match(/\d+/g).map(Number).filter(n => n >= 1 && n <= 55);
            if (numbers.length >= 6) {
                inputs.forEach((input, i) => {
                    if(i < 6) input.value = numbers[i].toString().padStart(2, '0');
                });
                if (numbers[6]) document.getElementById('input-pwr').value = numbers[6].toString().padStart(2, '0');
                document.getElementById('save-manual-btn').focus();
            }
        };
    }

    inputs.forEach((input, idx) => {
        input.addEventListener('input', () => {
            if (input.value.length >= 2) {
                if (idx < 5) inputs[idx+1].focus();
                else document.getElementById('input-pwr').focus();
            }
        });
    });
}

function updateStatus(msg, isLoading) {
    const el = document.getElementById('last-draw-date');
    if (el) el.innerText = msg;
}

// KHỞI CHẠY
window.onload = loadData;
