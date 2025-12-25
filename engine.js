let pool = Array.from({length: 55}, (_, i) => i + 1);
let activePool = [...pool];
let db = [], stats = { hot: [], cold: [], last: null, pairs: {}, bacNho: {} };
let strategies = ["RUBY", "SAPPHIRE", "TOPAZ", "DIAMOND", "EMERALD"];
let currentConfig = ["RUBY", "SAPPHIRE", "TOPAZ", "DIAMOND", "EMERALD"];

async function loadData() {
    try {
        const res = await fetch('data.csv?v=' + Date.now());
        const text = await res.text();
        const lines = text.trim().split('\n').slice(1);
        db = lines.map(line => {
            const parts = line.split(',');
            return { id: parts[0], nums: parts[1].split(' ').map(Number), pwr: Number(parts[2]), date: parts[3] };
        }).reverse();
        analyzeDB();
        renderMap();
        updateUI();
    } catch (e) { alert("Lỗi tải dữ liệu!"); }
}

function analyzeDB() {
    stats.last = db[0];
    const allNums = db.flatMap(d => d.nums);
    const counts = {};
    allNums.forEach(n => counts[n] = (counts[n] || 0) + 1);
    stats.hot = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(1,16).map(x => Number(x[0]));
    
    // Thống kê Bạc Nhớ (Số A kỳ trước -> Số B kỳ sau)
    for(let i=0; i < db.length - 1; i++) {
        db[i+1].nums.forEach(n_prev => {
            if(!stats.bacNho[n_prev]) stats.bacNho[n_prev] = {};
            db[i].nums.forEach(n_curr => {
                stats.bacNho[n_prev][n_curr] = (stats.bacNho[n_prev][n_curr] || 0) + 1;
            });
        });
    }
}

function generateSet(type) {
    let res = [], last = stats.last;
    try {
        if (type === "RUBY") { // HOT
            res = shuffle(stats.hot.filter(n => activePool.includes(n))).slice(0, 3);
        } else if (type === "SAPPHIRE") { // COLD (Ngẫu nhiên từ pool hiện tại)
            res = shuffle(activePool).slice(0, 2);
        } else if (type === "DIAMOND") { // REMIX PRO
            let r = last.nums[Math.floor(Math.random()*6)];
            if(activePool.includes(r)) res.push(r);
            if(activePool.includes(last.pwr) && Math.random() < 0.2) res.push(last.pwr);
        } else if (type === "TOPAZ") { // GOLD RATIO
            // Logic tổng sẽ check ở bước filter
        }

        // Lấp đầy & Lọc Vùng Đỏ
        let attempts = 0;
        while(attempts < 500) {
            let temp = [...res];
            while(temp.length < 6) {
                let n = activePool[Math.floor(Math.random()*activePool.length)];
                if(!temp.includes(n)) temp.push(n);
            }
            temp.sort((a,b) => a-b);
            if(validateRedZone(temp, type)) return temp;
            attempts++;
        }
    } catch(e) { return fallback(type); }
    return activePool.slice(0,6);
}

function validateRedZone(nums, type) {
    const sum = nums.reduce((a,b) => a+b, 0);
    if(sum < 82 || sum > 250) return false;
    if(type === "TOPAZ" && (sum < 130 || sum > 190)) return false;
    let even = nums.filter(n => n%2===0).length;
    if(even === 0 || even === 6) return false;
    return true;
}

function renderResults() {
    const container = document.getElementById('results-container');
    container.innerHTML = '';
    currentConfig.forEach((strat, idx) => {
        const set = generateSet(strat);
        container.innerHTML += `
            <div class="gem-card">
                <div class="gem-badge ${strat.toLowerCase()}" onclick="openModal(${idx})">${strat} ▼</div>
                <div class="res-nums">${set.map(n => n.toString().padStart(2,'0')).join(' ')}</div>
            </div>`;
    });
}

function renderMap() {
    const grid = document.getElementById('number-grid');
    grid.innerHTML = '';
    for(let i=1; i<=55; i++) {
        let cell = document.createElement('div');
        cell.className = `num-cell active ${stats.hot.includes(i)?'hot':''} ${stats.last.nums.includes(i)?'repeat':''} ${stats.last.pwr===i?'power':''}`;
        cell.innerText = i.toString().padStart(2,'0');
        cell.onclick = () => { cell.classList.toggle('active'); updatePool(); };
        grid.appendChild(cell);
    }
}

function updatePool() {
    activePool = Array.from(document.querySelectorAll('.num-cell.active')).map(c => Number(c.innerText));
    const btn = document.getElementById('generate-btn');
    btn.disabled = activePool.length < 12;
    document.getElementById('warning-text').style.display = activePool.length < 12 ? 'block' : 'none';
}

function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }
document.getElementById('generate-btn').onclick = renderResults;
document.getElementById('sync-btn').onclick = loadData;
loadData();
