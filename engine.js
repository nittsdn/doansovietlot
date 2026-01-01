/* * VIETLOTT PRO V5.5 - DATABASE SYNC EDITION
 * Kết nối dữ liệu trực tiếp từ Google Sheets
 */

let db = [], stats = { hot: [], cold: [], gap: [] };
let historyDataStrings = []; 
let disabledNumbers = [];

// Cấu hình nguồn dữ liệu (Dễ dàng mở rộng sau này)
const DATA_SOURCES = {
    P655: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv",
    // LOTTO: "Link_CSV_Lotto_Sau_Nay"
};

const ICONS = {
    DIAMOND: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-dia" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#e0f7fa"/><stop offset="100%" style="stop-color:#b2ebf2"/></linearGradient></defs><path d="M32 2 L2 24 L32 62 L62 24 L32 2 Z" fill="url(#grad-dia)" stroke="#00bcd4" stroke-width="1.5"/><path d="M2 24 L62 24 M12 24 L32 2 L52 24 M32 62 L12 24 M32 62 L52 24" stroke="#00acc1" stroke-width="1" stroke-opacity="0.6"/><path d="M20 24 L32 36 L44 24" fill="white" fill-opacity="0.4"/></svg>`,
    RUBY: `<svg viewBox="0 0 64 64" fill="none"><defs><radialGradient id="grad-ruby" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:#ff5252"/><stop offset="100%" style="stop-color:#b71c1c"/></radialGradient></defs><path d="M32 4 L10 24 L32 60 L54 24 Z" fill="url(#grad-ruby)"/><path d="M10 24 L54 24 M32 4 L32 60" stroke="#ff8a80" stroke-width="0.5" stroke-opacity="0.5"/></svg>`,
    ICE: `<svg viewBox="0 0 64 64" fill="none"><rect x="12" y="12" width="40" height="40" rx="8" fill="#e1f5fe" stroke="#81d4fa" stroke-width="2"/><path d="M20 20 L44 44 M44 20 L20 44" stroke="#b3e5fc" stroke-width="1"/></svg>`
};

// --- HÀM TẢI DỮ LIỆU TỪ GOOGLE SHEETS ---
async function loadDataFromSheets() {
    updateStatus("Đang đồng bộ...", true);
    try {
        const response = await fetch(DATA_SOURCES.P655);
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(','));

        // Chuyển đổi CSV sang Object (Bỏ dòng tiêu đề)
        db = rows.slice(1).filter(row => row.length >= 9).map(row => {
            return {
                id: row[0].trim(),
                nums: [
                    parseInt(row[1]), parseInt(row[2]), parseInt(row[3]), 
                    parseInt(row[4]), parseInt(row[5]), parseInt(row[6])
                ].sort((a, b) => a - b),
                pwr: parseInt(row[7]),
                date: row[8].trim(),
                jackpot1: row[9] ? row[9].trim() : "0"
            };
        });

        // Sắp xếp ID mới nhất lên đầu
        db.sort((a, b) => parseInt(b.id) - parseInt(a.id));

        if (db.length > 0) {
            initLogic();
            updateStatus(`${db[0].date} | J1: ${db[0].jackpot1}`, false);
        }
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        updateStatus("Lỗi kết nối database!", false);
    }
}

function updateStatus(msg, isLoading) {
    const el = document.getElementById('last-draw-date');
    if (el) el.innerText = msg;
}

function initLogic() {
    analyzeData();
    renderGrid();
    updateUI();
    setupManualInput();
}

// Các hàm xử lý giao diện (giữ nguyên logic của bạn nhưng dùng db mới)
function updateUI() {
    if (db.length === 0) return;
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

function analyzeData() {
    let counts = new Array(56).fill(0);
    let lastSeen = new Array(56).fill(0);
    
    db.forEach((draw, idx) => {
        draw.nums.forEach(n => {
            counts[n]++;
            if (lastSeen[n] === 0) lastSeen[n] = idx;
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

function renderGrid() {
    const grid = document.getElementById('number-grid');
    grid.innerHTML = '';
    for (let i = 1; i <= 55; i++) {
        const div = document.createElement('div');
        div.className = 'num-cell';
        if (disabledNumbers.includes(i)) div.classList.add('disabled');
        
        let icon = '';
        if (stats.hot.includes(i)) icon = `<div class="cell-icon">${ICONS.RUBY}</div>`;
        else if (stats.gap.includes(i)) icon = `<div class="cell-icon">${ICONS.ICE}</div>`;
        else icon = `<div class="cell-icon">${ICONS.DIAMOND}</div>`;

        div.innerHTML = `${icon}<div class="cell-num">${i.toString().padStart(2, '0')}</div>`;
        div.onclick = () => {
            div.classList.toggle('disabled');
            if (div.classList.contains('disabled')) disabledNumbers.push(i);
            else disabledNumbers = disabledNumbers.filter(x => x !== i);
        };
        grid.appendChild(div);
    }
}

function setupManualInput() {
    // Giữ nguyên logic nhập liệu thủ công của bạn nếu cần
}

// KHỞI CHẠY
window.onload = loadDataFromSheets;
