/* * VIETLOTT PRO V4.7 - MASTER ENGINE
 * Update: SVG Icons for Copy Button + Visual Balls
 */

// --- CẤU HÌNH & BIẾN TOÀN CỤC ---
let db = [], stats = { hot: [], cold: [], gap: [] };
let historyDataStrings = []; 

const GEMS = {
    RUBY: { id: 'RUBY', name: "Trend", icon: "🔥", desc: "Bắt số Nóng (Top 2-15)", color: "gem-ruby" },
    SAPPHIRE: { id: 'SAPPHIRE', name: "Cold", icon: "❄️", desc: "Săn số Lạnh (Gap 5-12)", color: "gem-sapphire" },
    TOPAZ: { id: 'TOPAZ', name: "Gold", icon: "🏆", desc: "Tỷ lệ Vàng (Tổng & Chẵn/Lẻ)", color: "gem-gold" },
    DIAMOND: { id: 'DIAMOND', name: "Remix", icon: "💎", desc: "Kỳ trước + Power + Bạc nhớ", color: "gem-diamond" },
    EMERALD: { id: 'EMERALD', name: "Safe", icon: "❇️", desc: "Vùng An Toàn (Lọc sạch 100%)", color: "gem-emerald" }
};

// --- PHẦN 1: QUẢN LÝ DỮ LIỆU ---
async function loadData() {
    updateStatus("Đang tải dữ liệu...", true);
    try {
        const response = await fetch('data.csv?v=' + Date.now()); 
        if (!response.ok) throw new Error("Lỗi tải data.csv");
        const text = await response.text();
        const lines = text.trim().split(/\r?\n/);
        
        db = lines.slice(1).map(line => {
            const p = line.split(',');
            if (p.length < 2) return null;
            return { 
                id: p[0], 
                nums: p[1].trim().split(/\s+/).map(Number).sort((a,b)=>a-b), 
                pwr: Number(p[2]), 
                date: p[3] 
            };
        }).filter(item => item && item.nums.length === 6).reverse(); 

        const localData = localStorage.getItem('manual_update_v4');
        if (localData) {
            const manualEntry = JSON.parse(localData);
            if (db.length === 0 || parseInt(manualEntry.id) > parseInt(db[0].id)) {
                db.unshift(manualEntry);
                console.log("Đã chèn dữ liệu nhập tay:", manualEntry);
            } else {
                localStorage.removeItem('manual_update_v4');
            }
        }

        analyzeData();
        renderHeaderInfo();
        renderMap();
        initSmartPaste(); 
        updateStatus(`Sẵn sàng (Kỳ ${db[0]?.id || '??'})`, false);

    } catch (e) {
        console.error(e);
        updateStatus("Lỗi tải dữ liệu!", false);
    }
}

function analyzeData() {
    if (db.length === 0) return;
    let freq = Array(56).fill(0);
    let lastSeen = Array(56).fill(-1);
    historyDataStrings = db.map(d => d.nums.join(',')); 

    const recent = db.slice(0, 50);
    recent.forEach(draw => {
        draw.nums.forEach(n => freq[n]++);
    });

    for (let i = 1; i <= 55; i++) {
        const idx = db.findIndex(d => d.nums.includes(i));
        lastSeen[i] = (idx === -1) ? 999 : idx; 
    }

    let sortedFreq = [];
    for(let i=1; i<=55; i++) {
        sortedFreq.push({ n: i, f: freq[i], gap: lastSeen[i] });
    }
    sortedFreq.sort((a,b) => b.f - a.f);

    stats.hot = sortedFreq.slice(1, 15).map(x => x.n); 
    stats.cold = sortedFreq.filter(x => x.gap >= 5 && x.gap <= 12).map(x => x.n); 
    stats.gap = lastSeen;
}

// --- PHẦN 2: BỘ LỌC VÙNG ĐỎ ---
function isRedZone(ticket) {
    const t = ticket.sort((a,b) => a-b);
    const sum = t.reduce((a,b) => a+b, 0);
    if (sum < 82 || sum > 250) return "Lỗi Tổng";

    const even = t.filter(n => n % 2 === 0).length;
    if (even === 0 || even === 6) return "Lỗi Chẵn Lẻ";

    const tStr = t.join(',');
    if (historyDataStrings.includes(tStr)) return "Trùng Lịch Sử";

    let cons = 1, maxCons = 1;
    for(let i=0; i<5; i++) {
        if (t[i+1] === t[i] + 1) cons++;
        else cons = 1;
        if (cons > maxCons) maxCons = cons;
    }
    if (maxCons >= 4) return "Chuỗi Liên Tiếp";

    let tails = t.map(n => n % 10);
    let maxTail = 0;
    for(let i=0; i<10; i++) {
        let count = tails.filter(x => x === i).length;
        if (count > maxTail) maxTail = count;
    }
    if (maxTail >= 4) return "Lỗi Chung Đuôi";

    let decades = t.map(n => Math.floor(n/10));
    let maxDecade = 0;
    for(let i=0; i<6; i++) {
        let count = decades.filter(x => x === i).length;
        if (count > maxDecade) maxDecade = count;
    }
    if (maxDecade >= 5) return "Lỗi Hàng Chục";

    let diff = t[1] - t[0];
    let isArith = true;
    for(let i=1; i<5; i++) {
        if (t[i+1] - t[i] !== diff) { isArith = false; break; }
    }
    if (isArith && diff > 0) return "Cấp Số Cộng";

    const primes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53];
    const pCount = t.filter(n => primes.includes(n)).length;
    if (pCount >= 5) return "Quá Nhiều SNT";

    if (t[5] - t[0] < 18) return "Range Quá Nhỏ";

    let maxGap = 0;
    for(let i=0; i<5; i++) if(t[i+1] - t[i] > maxGap) maxGap = t[i+1] - t[i];
    if (maxGap > 35) return "Gap Quá Lớn";

    return "OK"; 
}

// --- PHẦN 3: GENERATORS ---
function getPool(strategy) {
    const full = Array.from({length: 55}, (_, i) => i + 1);
    switch(strategy) {
        case 'RUBY': return stats.hot.length > 5 ? stats.hot : full;
        case 'SAPPHIRE': return stats.cold.length > 5 ? stats.cold : full;
        default: return full;
    }
}

function generateTicket(gemType) {
    let ticket = [];
    let attempts = 0;
    while (attempts < 1000) {
        attempts++;
        ticket = [];
        let pool = getPool(gemType);
        
        if (gemType === 'DIAMOND' && db.length > 0) {
            const lastDraw = db[0].nums;
            const pwr = db[0].pwr;
            ticket.push(lastDraw[Math.floor(Math.random() * lastDraw.length)]);
            if (pwr <= 55 && !ticket.includes(pwr)) ticket.push(pwr);
            pool = Array.from({length: 55}, (_, i) => i + 1);
        } else if (gemType === 'TOPAZ') {
            pool = Array.from({length: 55}, (_, i) => i + 1);
        }
        
        while(ticket.length < 6) {
            if (pool.length === 0) pool = Array.from({length: 55}, (_, i) => i + 1);
            const rand = pool[Math.floor(Math.random() *
