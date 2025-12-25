let db = [], stats = { hot: [], bad: [], last: null };
let activePool = [];

async function loadData() {
    try {
        // Sử dụng đường dẫn tương đối hoặc tuyệt đối từ GitHub
        const response = await fetch('data.csv?v=' + Date.now());
        if (!response.ok) throw new Error("File not found");
        const text = await response.text();
        
        const lines = text.trim().split('\n');
        if (lines.length < 2) throw new Error("CSV empty");
        
        db = lines.slice(1).map(line => {
            const p = line.split(',');
            return { id: p[0], nums: p[1].split(' ').map(Number), pwr: Number(p[2]), date: p[3] };
        }).reverse();

        analyzeData();
        renderMap();
        renderResults(); // Tự động chạy lần đầu
    } catch (e) {
        document.getElementById('last-draw-id').innerText = "Lỗi!";
        document.getElementById('last-draw-date').innerText = "Vui lòng kiểm tra file data.csv trên GitHub";
    }
}

function analyzeData() {
    stats.last = db[0];
    const counts = {};
    db.slice(0, 50).forEach(d => d.nums.forEach(n => counts[n] = (counts[n] || 0) + 1));
    stats.hot = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 10).map(x => Number(x[0]));
    
    // Thuật toán xác định "Số Xấu" (Bad Numbers)
    // Ví dụ: Bỏ các số vừa ra kỳ trước để tránh trùng lặp quá nhiều
    stats.bad = [...stats.last.nums]; 
}

function renderMap() {
    const grid = document.getElementById('number-grid');
    grid.innerHTML = '';
    activePool = [];

    for (let i = 1; i <= 55; i++) {
        let cell = document.createElement('div');
        cell.className = 'num-cell';
        cell.innerText = i.toString().padStart(2, '0');

        // Mặc định CHỌN HẾT, trừ số Xấu
        if (!stats.bad.includes(i)) {
            cell.classList.add('active');
            activePool.push(i);
        }

        if (stats.hot.includes(i)) cell.classList.add('hot');
        if (stats.last.nums.includes(i)) cell.classList.add('repeat');
        if (stats.last.pwr === i) cell.classList.add('power');

        cell.onclick = () => {
            cell.classList.toggle('active');
            updateActivePool();
        };
        grid.appendChild(cell);
    }
    updateHeader();
}

function updateActivePool() {
    activePool = Array.from(document.querySelectorAll('.num-cell.active')).map(c => Number(c.innerText));
    document.getElementById('generate-btn').disabled = activePool.length < 12;
    document.getElementById('warning-text').style.display = activePool.length < 12 ? 'block' : 'none';
}

function updateHeader() {
    document.getElementById('last-draw-id').innerText = "Kỳ #" + stats.last.id;
    document.getElementById('last-draw-date').innerText = stats.last.date;
    const resDiv = document.getElementById('last-result-numbers');
    resDiv.innerHTML = stats.last.nums.map(n => `<span class="pill">${n}</span>`).join('') + 
                       `<span class="pill pwr">${stats.last.pwr}</span>`;
}

// ... (Các hàm generateSet và renderResults giữ nguyên như bản trước) ...

loadData();
