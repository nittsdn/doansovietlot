/* * VIETLOTT PRO V5.4 - FINAL ENGINE
 * FIXED: Logic activation after Sheets sync
 */

let db = [], stats = { hot: [], cold: [], gap: [] };
let historyDataStrings = []; 
let disabledNumbers = [];

const ICONS = {
    DIAMOND: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-dia" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#e0f7fa"/><stop offset="100%" style="stop-color:#b2ebf2"/></linearGradient></defs><path d="M32 2 L2 24 L32 62 L62 24 L32 2 Z" fill="url(#grad-dia)" stroke="#00bcd4" stroke-width="1.5"/><path d="M2 24 L62 24 M12 24 L32 2 L52 24 M32 62 L12 24 M32 62 L52 24" stroke="#00acc1" stroke-width="1" stroke-opacity="0.6"/><path d="M20 24 L32 36 L44 24" fill="white" fill-opacity="0.4"/></svg>`,
    RUBY: `<svg viewBox="0 0 64 64" fill="none"><defs><radialGradient id="grad-ruby" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:#ff5252"/><stop offset="100%" style="stop-color:#b71c1c"/></radialGradient></defs><path d="M32 4 L10 24 L32 60 L54 24 Z" fill="url(#grad-ruby)"/><path d="M10 24 L54 24 M32 4 L32 60" stroke="#ff8a80" stroke-width="0.5" stroke-opacity="0.5"/></svg>`,
    ICE: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-ice" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#e1f5fe"/><stop offset="100%" style="stop-color:#81d4fa"/></linearGradient></defs><rect x="12" y="12" width="40" height="40" rx="8" fill="#e1f5fe" stroke="#4fc3f7" stroke-width="1.5"/><path d="M20 20 L44 44 M44 20 L20 44" stroke="white" stroke-width="1.5" stroke-opacity="0.4"/></svg>`
};

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv";

async function loadData() {
    updateStatus("Đang đồng bộ dữ liệu...", true);
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
        
        const tempDb = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",");
            if (cols.length < 9) continue;
            tempDb.push({
                id: cols[0].trim(),
                nums: [
                    parseInt(cols[1]), parseInt(cols[2]), parseInt(cols[3]),
                    parseInt(cols[4]), parseInt(cols[5]), parseInt(cols[6])
                ].sort((a, b) => a - b),
                pwr: parseInt(cols[7]),
                date: cols[8].trim(),
                jackpot1: cols[9] ? cols[9].trim() : "0"
            });
        }

        db = tempDb.sort((a, b) => parseInt(b.id) - parseInt(a.id));

        if (db.length > 0) {
            // --- QUAN TRỌNG: KÍCH HOẠT LẠI TOÀN BỘ LOGIC ---
            analyzeData();  // Tính toán Nóng/Lạnh
            renderGrid();   // Vẽ bản đồ số
            updateUI();     // Hiển thị kỳ cuối
            setupManualInputLogic(); // Kích hoạt nút dán số/nhập liệu
            updateStatus(`${db[0].date} | J1: ${db[0].jackpot1}`, false);
        }
    } catch (error) {
        console.error("Lỗi:", error);
        updateStatus("Lỗi kết nối dữ liệu!", false);
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
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 55; i++) {
        const div = document.createElement('div');
        div.className = 'num-cell';
        if (disabledNumbers.includes(i)) div.classList.add('disabled');
        
        let icon = ICONS.DIAMOND;
        if (stats.hot.includes(i)) { div.classList.add('hot'); icon = ICONS.RUBY; }
        else if (stats.gap.includes(i)) { div.classList.add('cold'); icon = ICONS.ICE; }

        div.innerHTML = `<div class="cell-icon">${icon}</div><div class="cell-num">${i.toString().padStart(2, '0')}</div>`;
        div.onclick = () => {
            div.classList.toggle('disabled');
            if (div.classList.contains('disabled')) {
                if(!disabledNumbers.includes(i)) disabledNumbers.push(i);
            } else {
                disabledNumbers = disabledNumbers.filter(x => x !== i);
            }
        };
        grid.appendChild(div);
    }
}

// Hàm sinh số sugest (Gắn vào nút gợi ý trong HTML)
function generateSystem() {
    const pool = [];
    for (let i = 1; i <= 55; i++) {
        if (!disabledNumbers.includes(i)) pool.push(i);
    }
    if (pool.length < 6) { alert("Không đủ số để tạo!"); return; }
    
    const res = [];
    const tempPool = [...pool];
    for (let i = 0; i < 6; i++) {
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

// Kích hoạt logic nhập liệu và Clipboard
function setupManualInputLogic() {
    const pasteBtn = document.getElementById('paste-btn');
    const inputs = document.querySelectorAll('.ios-num-box');
    
    if (pasteBtn) {
        pasteBtn.onclick = async () => {
            try {
                const text = await navigator.clipboard.readText();
                const numbers = text.match(/\d+/g).map(Number).filter(n => n >= 1 && n <= 55);
                if (numbers.length >= 6) {
                    inputs.forEach((input, i) => {
                        if(i < 6) input.value = numbers[i].toString().padStart(2, '0');
                    });
                    if (numbers[6]) document.getElementById('input-pwr').value = numbers[6].toString().padStart(2, '0');
                }
            } catch (e) { console.log("Clipboard error"); }
        };
    }
}

function updateStatus(msg, isLoading) {
    const el = document.getElementById('last-draw-date');
    if (el) el.innerText = msg;
}

// Khởi chạy
window.onload = loadData;
