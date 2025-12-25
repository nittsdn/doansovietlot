let db = [], stats = { hot: [], last: null, bacNho: {} };
let activePool = [];
let currentStrategies = ["RUBY", "SAPPHIRE", "TOPAZ", "DIAMOND", "EMERALD"];
let editingRowIndex = null;

const GEMS = {
    RUBY: { name: "🔥 RUBY", color: "ruby", desc: "Săn số đang Hot" },
    SAPPHIRE: { name: "❄️ SAPPHIRE", color: "sapphire", desc: "Săn số đang Nguội" },
    TOPAZ: { name: "🏆 TOPAZ", color: "topaz", desc: "Tổng & Chẵn lẻ Vàng" },
    DIAMOND: { name: "💎 DIAMOND", color: "diamond", desc: "Remix & Bạc nhớ Pro" },
    EMERALD: { name: "❇️ EMERALD", color: "emerald", desc: "Bộ số An toàn nhất" }
};

// Hàm tải dữ liệu cực mạnh
async function loadData() {
    const statusText = document.getElementById('last-draw-date');
    statusText.innerText = "🔄 Đang kết nối dữ liệu...";
    
    // Thử 2 cách lấy file: đường dẫn tương đối và đường dẫn gốc
    const paths = ['data.csv', './data.csv'];
    let text = "";

    for (let path of paths) {
        try {
            const response = await fetch(`${path}?v=${Date.now()}`); // Chống cache trên iPhone
            if (response.ok) {
                text = await response.text();
                break;
            }
        } catch (e) { console.log("Thử đường dẫn thất bại: " + path); }
    }

    if (!text || text.includes("<!DOCTYPE html>")) {
        statusText.innerText = "❌ Lỗi: Không tìm thấy file data.csv trên GitHub!";
        statusText.style.color = "red";
        return;
    }

    try {
        parseCSV(text);
        analyzeData();
        renderMap();
        renderResults();
        statusText.style.color = "#8e8e93";
    } catch (e) {
        statusText.innerText = "❌ Lỗi: Định dạng file CSV không đúng!";
        console.error(e);
    }
}

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    db = lines.slice(1).map(line => {
        // Xử lý trường hợp CSV dùng dấu phẩy hoặc dấu chấm phẩy
        const p = line.includes(';') ? line.split(';') : line.split(',');
        if (p.length < 3) return null;
        return { 
            id: p[0].trim(), 
            nums: p[1].trim().split(/\s+/).map(Number), 
            pwr: Number(p[2]), 
            date: p[3] ? p[3].trim() : "" 
        };
    }).filter(item => item !== null && !isNaN(item.pwr)).reverse();
}

function analyzeData() {
    if (db.length === 0) return;
    stats.last = db[0];
    const counts = {};
    // Lấy 100 kỳ gần nhất để tính Hot/Cold cho chính xác
    db.slice(0, 100).forEach(d => d.nums.forEach(n => counts[n] = (counts[n] || 0) + 1));
    stats.hot = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 12).map(x => Number(x[0]));
}

function renderMap() {
    const grid = document.getElementById('number-grid');
    if (!grid || !stats.last) return;
    grid.innerHTML = ''; 
    activePool = [];
    
    for (let i = 1; i <= 55; i++) {
        let cell = document.createElement('div');
        cell.className = 'num-cell';
        cell.innerText = i.toString().padStart(2, '0');

        // MẶC ĐỊNH CHỌN HẾT, TRỪ SỐ KỲ TRƯỚC
        if (!stats.last.nums.includes(i)) {
            cell.classList.add('active');
            activePool.push(i);
        }

        if (stats.hot.includes(i)) cell.classList.add('hot');
        if (stats.last.nums.includes(i)) cell.classList.add('repeat');
        if (stats.last.pwr === i) cell.classList.add('power');

        cell.onclick = () => { 
            cell.classList.toggle('active'); 
            updatePool(); 
        };
        grid.appendChild(cell);
    }
    updateHeader();
    updatePool();
}

function updatePool() {
    activePool = Array.from(document.querySelectorAll('.num-cell.active')).map(c => Number(c.innerText));
    const genBtn = document.getElementById('generate-btn');
    const warn = document.getElementById('warning-text');
    if (activePool.length < 12) {
        genBtn.disabled = true;
        warn.style.display = 'block';
    } else {
        genBtn.disabled = false;
        warn.style.display = 'none';
    }
}

function updateHeader() {
    document.getElementById('last-draw-id').innerText = "Kỳ #" + stats.last.id;
    document.getElementById('last-draw-date').innerText = stats.last.date;
    const resDiv = document.getElementById('last-result-numbers');
    resDiv.innerHTML = stats.last.nums.map(n => `<span class="pill">${n}</span>`).join('') + 
                       `<span class="pill pwr">${stats.last.pwr}</span>`;
}

// SINH BỘ SỐ THEO NHÃN
function generateSet(type) {
    let res = [];
    if(type === "DIAMOND" && stats.last) {
        let r = stats.last.nums[Math.floor(Math.random()*6)];
        if(activePool.includes(r)) res.push(r);
    }
    
    let attempts = 0;
    while(res.length < 6 && attempts < 2000) {
        let n = activePool[Math.floor(Math.random()*activePool.length)];
        if(!res.includes(n)) res.push(n);
        attempts++;
    }
    return res.sort((a,b) => a-b);
}

function renderResults() {
    const container = document.getElementById('results-container');
    if (!container) return;
    container.innerHTML = '';
    currentStrategies.forEach((strat, idx) => {
        const set = generateSet(strat);
        const gem = GEMS[strat];
        container.innerHTML += `
            <div class="gem-card">
                <div class="gem-badge ${gem.color}" onclick="openModal(${idx})">${gem.name} ▼</div>
                <div class="res-nums">${set.length === 6 ? set.map(n => n.toString().padStart(2,'0')).join(' ') : 'Đang tính...'}</div>
            </div>`;
    });
}

function openModal(index) {
    editingRowIndex = index;
    const list = document.getElementById('strategy-options');
    list.innerHTML = '';
    Object.keys(GEMS).forEach(key => {
        const li = document.createElement('li');
        li.className = 'strategy-opt';
        li.innerText = GEMS[key].name + " - " + GEMS[key].desc;
        li.onclick = () => selectStrategy(key);
        list.appendChild(li);
    });
    document.getElementById('strategy-modal').style.display = 'block';
}

function selectStrategy(key) {
    currentStrategies[editingRowIndex] = key;
    closeModal();
    renderResults();
}

function closeModal() { document.getElementById('strategy-modal').style.display = 'none'; }

document.getElementById('generate-btn').onclick = renderResults;
document.getElementById('sync-btn').onclick = loadData;

// Khởi chạy
loadData();
