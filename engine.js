let db = [], stats = { hot: [], last: null, bacNho: {} }, activePool = [];
let currentStrategies = ["RUBY", "SAPPHIRE", "TOPAZ", "DIAMOND", "EMERALD"];
let editingRowIndex = null;

const GEMS = {
    RUBY: { name: "🔥 RUBY", color: "ruby", desc: "Săn số Hot" },
    SAPPHIRE: { name: "❄️ SAPPHIRE", color: "sapphire", desc: "Săn số Nguội" },
    TOPAZ: { name: "🏆 TOPAZ", color: "topaz", desc: "Tỷ lệ Vàng" },
    DIAMOND: { name: "💎 DIAMOND", color: "diamond", desc: "Remix/Bạc nhớ" },
    EMERALD: { name: "❇️ EMERALD", color: "emerald", desc: "An toàn" }
};

async function loadData() {
    const statusText = document.getElementById('last-draw-date');
    statusText.innerText = "🔄 Đang tải dữ liệu...";
    try {
        const response = await fetch('data.csv?v=' + Date.now());
        if (!response.ok) throw new Error();
        const text = await response.text();
        const lines = text.trim().split(/\r?\n/);
        
        db = lines.slice(1).map(line => {
            const p = line.split(',');
            return { id: p[0], nums: p[1].trim().split(/\s+/).map(Number), pwr: Number(p[2]), date: p[3] };
        }).filter(d => d.nums.length === 6).reverse();

        // Kiểm tra LocalStorage (Số nhập tay)
        const saved = localStorage.getItem('manual_update');
        if (saved) {
            const sObj = JSON.parse(saved);
            if (parseInt(sObj.id) > parseInt(db[0].id)) db.unshift(sObj);
        }

        analyzeData();
        renderMap();
        renderResults();
        setupManualInput();
    } catch (e) {
        statusText.innerText = "❌ Lỗi: Không thể load data.csv";
    }
}

function analyzeData() {
    stats.last = db[0];
    const counts = {};
    db.slice(0, 50).forEach(d => d.nums.forEach(n => counts[n] = (counts[n] || 0) + 1));
    stats.hot = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 12).map(x => Number(x[0]));
}

function renderMap() {
    const grid = document.getElementById('number-grid');
    grid.innerHTML = ''; activePool = [];
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

        cell.onclick = () => { cell.classList.toggle('active'); updatePool(); };
        grid.appendChild(cell);
    }
    updateHeader(); updatePool();
}

function updatePool() {
    activePool = Array.from(document.querySelectorAll('.num-cell.active')).map(c => Number(c.innerText));
    document.getElementById('generate-btn').disabled = activePool.length < 12;
}

function updateHeader() {
    document.getElementById('last-draw-id').innerText = "Kỳ #" + stats.last.id;
    document.getElementById('last-draw-date').innerText = stats.last.date;
    const resDiv = document.getElementById('last-result-numbers');
    resDiv.innerHTML = stats.last.nums.map(n => `<span class="pill">${n}</span>`).join('') + `<span class="pill pwr">${stats.last.pwr}</span>`;
}

function generateSet(type) {
    let res = [];
    if(type === "DIAMOND") {
        let r = stats.last.nums[Math.floor(Math.random()*6)];
        if(activePool.includes(r)) res.push(r);
    }
    let attempts = 0;
    while(res.length < 6 && attempts < 1000) {
        let n = activePool[Math.floor(Math.random()*activePool.length)];
        if(!res.includes(n)) res.push(n);
        attempts++;
    }
    return res.sort((a,b) => a-b);
}

function renderResults() {
    const container = document.getElementById('results-container');
    container.innerHTML = '';
    currentStrategies.forEach((strat, idx) => {
        const set = generateSet(strat);
        const gem = GEMS[strat];
        container.innerHTML += `
            <div class="gem-card">
                <div class="gem-badge ${gem.color}" onclick="openModal(${idx})">${gem.name} ▼</div>
                <div class="res-nums">${set.map(n => n.toString().padStart(2,'0')).join(' ')}</div>
            </div>`;
    });
}

function setupManualInput() {
    const dateSel = document.getElementById('input-date');
    const idInp = document.getElementById('input-id');
    dateSel.innerHTML = '';
    let lastD = stats.last.date.split('/');
    let curD = new Date(lastD[2], lastD[1]-1, lastD[0]);
    idInp.value = parseInt(stats.last.id) + 1;
    let f = 0;
    while(f < 3) {
        curD.setDate(curD.getDate()+1);
        if([2,4,6].includes(curD.getDay())) {
            let ds = `${String(curD.getDate()).padStart(2,'0')}/${String(curD.getMonth()+1).padStart(2,'0')}/${curD.getFullYear()}`;
            let o = document.createElement('option'); o.value = ds; o.innerText = ds;
            dateSel.appendChild(o); f++;
        }
    }
}

document.getElementById('save-manual-btn').onclick = () => {
    const nums = document.getElementById('input-nums').value.trim();
    const pwr = document.getElementById('input-pwr').value;
    if(!nums || !pwr || nums.split(' ').length !== 6) return alert("Nhập đủ 6 số và Power!");
    const entry = { id: document.getElementById('input-id').value, nums: nums.split(' ').map(Number).sort((a,b)=>a-b), pwr: Number(pwr), date: document.getElementById('input-date').value };
    localStorage.setItem('manual_update', JSON.stringify(entry));
    db.unshift(entry); analyzeData(); renderMap(); renderResults();
    alert("Đã cập nhật!");
};

function openModal(i) {
    editingRowIndex = i;
    const list = document.getElementById('strategy-options'); list.innerHTML = '';
    Object.keys(GEMS).forEach(k => {
        const li = document.createElement('li'); li.className='strategy-opt';
        li.innerText = GEMS[k].name; li.onclick = () => { currentStrategies[editingRowIndex]=k; closeModal(); renderResults(); };
        list.appendChild(li);
    });
    document.getElementById('strategy-modal').style.display='block';
}
function closeModal() { document.getElementById('strategy-modal').style.display='none'; }
document.getElementById('generate-btn').onclick = renderResults;
document.getElementById('sync-btn').onclick = loadData;
loadData();
