let db = [], stats = { hot: [], last: null }, activePool = [];
let currentStrategies = ["RUBY", "SAPPHIRE", "TOPAZ", "DIAMOND", "EMERALD"];
let editingRowIndex = null;

const GEMS = {
    RUBY: { name: "🔥 RUBY", color: "ruby" },
    SAPPHIRE: { name: "❄️ SAPPHIRE", color: "sapphire" },
    TOPAZ: { name: "🏆 TOPAZ", color: "topaz" },
    DIAMOND: { name: "💎 DIAMOND", color: "diamond" },
    EMERALD: { name: "❇️ EMERALD", color: "emerald" }
};

async function loadData() {
    try {
        const response = await fetch('data.csv?v=' + Date.now());
        const text = await response.text();
        const lines = text.trim().split(/\r?\n/);
        
        db = lines.slice(1).map(line => {
            const p = line.split(',');
            return { id: p[0], nums: p[1].trim().split(/\s+/).map(Number), pwr: Number(p[2]), date: p[3] };
        }).filter(d => d.nums && d.nums.length === 6).reverse();

        const saved = localStorage.getItem('manual_update_v4');
        if (saved) {
            const sObj = JSON.parse(saved);
            if (parseInt(sObj.id) > parseInt(db[0].id)) db.unshift(sObj);
        }

        analyzeData();
        renderMap();
        renderResults();
        setupManualInput();
        initAutoJump();
    } catch (e) { document.getElementById('last-draw-date').innerText = "⚠️ Cần file data.csv"; }
}

function analyzeData() {
    if(!db.length) return;
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

        // Mặc định chọn tất cả, trừ 6 số kỳ trước
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
    document.getElementById('warning-text').style.display = activePool.length < 12 ? 'block' : 'none';
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
    while(res.length < 6) {
        let n = activePool[Math.floor(Math.random()*activePool.length)];
        if(!res.includes(n)) res.push(n);
    }
    return res.sort((a,b) => a-b);
}

function renderResults() {
    const container = document.getElementById('results-container');
    container.innerHTML = '';
    currentStrategies.forEach((strat, idx) => {
        const set = generateSet(strat);
        container.innerHTML += `
            <div class="gem-card">
                <div class="gem-badge ${GEMS[strat].color}" onclick="openModal(${idx})">${GEMS[strat].name} ▼</div>
                <div class="res-nums">${set.map(n => n.toString().padStart(2,'0')).join(' ')}</div>
            </div>`;
    });
}

// LOGIC MANUAL INPUT MỚI
function setupManualInput() {
    if(!stats.last) return;
    const dateSel = document.getElementById('input-date');
    const idInp = document.getElementById('input-id');
    dateSel.innerHTML = '';
    
    let lastParts = stats.last.date.split('/');
    let nextDate = new Date(lastParts[2], lastParts[1]-1, lastParts[0]);
    idInp.value = parseInt(stats.last.id) + 1;

    // Tìm duy nhất 1 ngày tiếp theo (T3, T5, T7)
    let found = false;
    while(!found) {
        nextDate.setDate(nextDate.getDate() + 1);
        if([2,4,6].includes(nextDate.getDay())) {
            let ds = `${String(nextDate.getDate()).padStart(2,'0')}/${String(nextDate.getMonth()+1).padStart(2,'0')}/${nextDate.getFullYear()}`;
            let o = document.createElement('option'); o.value = ds; o.innerText = ds;
            dateSel.appendChild(o);
            found = true;
        }
    }
}

function initAutoJump() {
    const boxes = document.querySelectorAll('.ios-num-box');
    boxes.forEach((box, idx) => {
        box.oninput = () => {
            if(box.value.length >= 2) {
                if(idx < 5) boxes[idx+1].focus();
                else document.getElementById('input-pwr').focus();
            }
        };
    });
}

document.getElementById('save-manual-btn').onclick = () => {
    const boxes = document.querySelectorAll('.ios-num-box');
    const nums = Array.from(boxes).map(b => b.value.trim());
    const pwr = document.getElementById('input-pwr').value.trim();

    if(nums.some(n => !n) || !pwr) return alert("Vui lòng nhập đủ 6 số Jackpot và Power!");
    
    const entry = { 
        id: document.getElementById('input-id').value, 
        nums: nums.map(Number).sort((a,b)=>a-b), 
        pwr: Number(pwr), 
        date: document.getElementById('input-date').value 
    };
    
    localStorage.setItem('manual_update_v4', JSON.stringify(entry));
    db.unshift(entry); analyzeData(); renderMap(); renderResults();
    alert("✅ Đã cập nhật kết quả kỳ mới!");
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
