/* * VIETLOTT PRO V5.0 - DESKTOP EDITION
 * Features: Gold Bar Icon, Emerald Hexagon, Full Legend, PC Responsive
 */

// --- CẤU HÌNH ---
let db = [], stats = { hot: [], cold: [], gap: [] };
let historyDataStrings = []; 
let disabledNumbers = [];

// ĐỊNH NGHĨA ICON SVG (Vẽ bằng code để sắc nét mọi màn hình)
const ICONS = {
    FIRE: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c6.075 0 11-4.925 11-11 0-6.075-4.925-11-11-11S1 5.925 1 12c0 6.075 4.925 11 11 11zm0-20c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z"/><path d="M12 18c1.1 0 2-.9 2-2 0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2z" opacity=".3"/><path d="M10.5 8.5c0 1.5 1.5 2 2.5 3.5 1.25-1.5 2.5-2.5 2.5-4 0-1.5-1.5-3-2.5-3-1 0-2.5 1.5-2.5 3.5z"/></svg>`,
    SNOW: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L12 22M2 12L22 12M4.93 4.93L19.07 19.07M19.07 4.93L4.93 19.07" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    // ICON THỎI VÀNG (GOLD BAR)
    GOLD: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 8h16l-2 9H6L4 8z" opacity="0.8"/><path d="M6 5h12l2 3H4l2-3z"/><path d="M6 17h12l-1 2H7l-1-2z" opacity="0.6"/></svg>`,
    // ICON LỤC GIÁC (EMERALD HEXAGON)
    HEXAGON: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l9 5v10l-9 5-9-5V7z"/></svg>`,
    DIAMOND: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>`
};

const GEMS = {
    RUBY: { id: 'RUBY', name: "RUBY", icon: ICONS.FIRE, color: "gem-ruby" },
    SAPPHIRE: { id: 'SAPPHIRE', name: "SAPPHIRE", icon: ICONS.SNOW, color: "gem-sapphire" },
    // ĐỔI TÊN TOPAZ -> GOLD RATIO
    GOLD: { id: 'GOLD', name: "GOLD", icon: ICONS.GOLD, color: "gem-gold" },
    DIAMOND: { id: 'DIAMOND', name: "DIAMOND", icon: ICONS.DIAMOND, color: "gem-diamond" },
    EMERALD: { id: 'EMERALD', name: "EMERALD", icon: ICONS.HEXAGON, color: "gem-emerald" }
};

// --- PHẦN 1: LOAD DỮ LIỆU ---
async function loadData() {
    updateStatus("Đang tải dữ liệu...", true);
    try {
        const response = await fetch('data.csv?v=' + Date.now()); 
        if (!response.ok) throw new Error("Lỗi kết nối data.csv");
        const text = await response.text();
        const lines = text.trim().split(/\r?\n/);
        
        db = lines.slice(1).map(line => {
            const p = line.split(',');
            if (p.length < 2) return null;
            const nums = p[1].trim().split(/\s+/).map(Number).sort((a,b)=>a-b);
            if (nums.length !== 6 || nums.some(isNaN)) return null;
            return { id: p[0], nums: nums, pwr: Number(p[2]), date: p[3] };
        }).filter(item => item !== null).reverse(); 

        try {
            const localData = localStorage.getItem('manual_update_v4');
            if (localData) {
                const manualEntry = JSON.parse(localData);
                if (manualEntry && manualEntry.nums && manualEntry.nums.length === 6) {
                    const latestDbId = db.length > 0 ? parseInt(db[0].id) : 0;
                    if (parseInt(manualEntry.id) > latestDbId) db.unshift(manualEntry);
                    else localStorage.removeItem('manual_update_v4');
                }
            }
        } catch (err) { localStorage.removeItem('manual_update_v4'); }

        if (db.length === 0) throw new Error("Dữ liệu trống!");

        analyzeData();
        renderHeaderInfo();
        renderMap();
        initSmartPaste(); 
        updateStatus(`Sẵn sàng (Kỳ #${db[0].id})`, false);

    } catch (e) {
        console.error(e);
        updateStatus("Lỗi tải dữ liệu", false);
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
    stats.cold = sortedFreq.filter(x => x.gap >= 5 && x.gap <= 15).map(x => x.n); 
    stats.gap = lastSeen;
}

// --- PHẦN 2: TƯƠNG TÁC MAP ---
function toggleNumber(n) {
    const idx = disabledNumbers.indexOf(n);
    if (idx > -1) disabledNumbers.splice(idx, 1);
    else disabledNumbers.push(n);
    renderMap();
}

function renderMap() {
    const grid = document.getElementById('number-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const latest = db.length ? db[0] : null;
    const lastNums = latest ? latest.nums : [];
    const lastPower = latest ? latest.pwr : -1;
    
    for (let i = 1; i <= 55; i++) {
        const div = document.createElement('div');
        div.className = 'num-cell';
        div.innerText = i;
        
        // Logic màu sắc
        if (disabledNumbers.includes(i)) {
            div.classList.add('is-disabled');
        } else {
            // Check Power trước (Ưu tiên cao nhất)
            if (i === lastPower) {
                div.classList.add('is-power-ball');
                div.innerHTML += `<span class="power-icon">⚡</span>`; // Icon tia sét
            }
            else if (lastNums.includes(i)) div.classList.add('is-last-draw');
            else if (stats.hot.includes(i)) div.classList.add('is-hot');
            else if (stats.cold.includes(i)) div.classList.add('is-cold');
        }

        div.onclick = () => toggleNumber(i);
        grid.appendChild(div);
    }
}

// --- PHẦN 3: GENERATOR (UPDATE GOLD) ---
function isRedZone(ticket) {
    if (!ticket || ticket.length !== 6) return "Lỗi vé";
    const t = ticket.sort((a,b) => a-b);
    
    const sum = t.reduce((a,b) => a+b, 0);
    if (sum < 90 || sum > 240) return "Lỗi Tổng";
    const even = t.filter(n => n % 2 === 0).length;
    if (even === 0 || even === 6) return "Lỗi Chẵn Lẻ";
    if (historyDataStrings.includes(t.join(','))) return "Trùng Lịch Sử";

    let cons = 1, maxCons = 1;
    for(let i=0; i<5; i++) {
        if (t[i+1] === t[i] + 1) cons++; else cons = 1;
        if (cons > maxCons) maxCons = cons;
    }
    if (maxCons >= 4) return "Chuỗi Liên Tiếp";
    return "OK"; 
}

function getPool(strategy) {
    const full = Array.from({length: 55}, (_, i) => i + 1).filter(n => !disabledNumbers.includes(n));
    if (!stats.hot || !stats.cold) return full;
    
    switch(strategy) {
        case 'RUBY': 
            let h = stats.hot.filter(n => !disabledNumbers.includes(n));
            return h.length > 5 ? h : full;
        case 'SAPPHIRE': 
            let c = stats.cold.filter(n => !disabledNumbers.includes(n));
            return c.length > 5 ? c : full;
        default: return full;
    }
}

function generateTicket(gemType) {
    let ticket = [];
    let attempts = 0, MAX = 300;
    
    while (attempts < MAX) {
        attempts++;
        ticket = [];
        let pool = getPool(gemType);
        
        if (gemType === 'DIAMOND' && db.length > 0) {
            const lastDraw = db[0].nums;
            const pwr = db[0].pwr;
            const validLast = lastDraw.filter(n => !disabledNumbers.includes(n));
            if(validLast.length > 0) ticket.push(validLast[Math.floor(Math.random() * validLast.length)]);
            if (pwr <= 55 && !ticket.includes(pwr) && !disabledNumbers.includes(pwr)) ticket.push(pwr);
            pool = Array.from({length: 55}, (_, i) => i + 1).filter(n => !disabledNumbers.includes(n));
        }
        
        while(ticket.length < 6) {
            if (pool.length === 0) pool = Array.from({length: 55}, (_, i) => i + 1).filter(n => !disabledNumbers.includes(n));
            const rand = pool[Math.floor(Math.random() * pool.length)];
            if (!ticket.includes(rand)) ticket.push(rand);
        }

        if (isRedZone(ticket) === "OK") {
            // Check GOLD (Cũ là Topaz)
            if (gemType === 'GOLD') {
                const sum = ticket.reduce((a,b)=>a+b,0);
                if (sum < 130 || sum > 190) continue;
            }
            return ticket.sort((a,b)=>a-b);
        }
    }
    return generateBasicSafeTicket(); 
}

function generateBasicSafeTicket() {
    let t = [];
    const safePool = Array.from({length: 55}, (_, i) => i + 1).filter(n => !disabledNumbers.includes(n));
    if(safePool.length < 6) return [1,2,3,4,5,6]; 

    for(let k=0; k<50; k++) { 
        t = [];
        while(t.length < 6) {
            let r = safePool[Math.floor(Math.random() * safePool.length)];
            if(!t.includes(r)) t.push(r);
        }
        if(isRedZone(t) === "OK") return t.sort((a,b)=>a-b);
    }
    return t.sort((a,b)=>a-b);
}

// --- PHẦN 4: GIAO DIỆN ---
function renderHeaderInfo() {
    if (!db.length) return;
    const latest = db[0];
    document.getElementById('last-draw-id').innerText = `Kỳ #${latest.id}`;
    document.getElementById('last-draw-date').innerText = latest.date;
    
    const container = document.getElementById('last-result-numbers');
    if(container) {
        container.innerHTML = '';
        latest.nums.forEach(n => {
            const sp = document.createElement('span');
            sp.className = 'res-ball-mini'; 
            sp.innerText = n;
            container.appendChild(sp);
        });
        const pwr = document.createElement('span');
        pwr.className = 'res-ball-mini is-power';
        pwr.innerText = latest.pwr;
        container.appendChild(pwr);
    }
}

function generateFinalTickets() {
    if (db.length === 0) { loadData(); return; }
    const list = document.getElementById('ticketList');
    if(!list) return;
    list.innerHTML = '';
    document.getElementById('results').classList.remove('hidden');
    
    // ĐỔI TOPAZ -> GOLD TRONG DANH SÁCH
    const strategies = ['RUBY', 'SAPPHIRE', 'GOLD', 'DIAMOND', 'EMERALD'];
    const lastDrawNums = db.length > 0 ? db[0].nums : [];

    strategies.forEach((stratKey, idx) => {
        setTimeout(() => {
            const ticket = generateTicket(stratKey);
            const gem = GEMS[stratKey];
            const row = document.createElement('div');
            row.className = 'result-row animate-pop';
            
            const label = document.createElement('div');
            label.className = `gem-label ${gem.color}`;
            label.innerHTML = `<div class="gem-icon">${gem.icon}</div><div>${gem.name}</div>`;
            
            const numsDiv = document.createElement('div');
            numsDiv.className = 'nums-display';
            
            ticket.forEach(n => {
                const ball = document.createElement('div');
                let ballClass = 'res-ball';
                if (lastDrawNums.includes(n)) ballClass += ' is-last-draw';
                else if (stats.hot.includes(n)) ballClass += ' is-hot';
                else if (stats.cold.includes(n)) ballClass += ' is-cold';
                ball.className = ballClass;
                ball.innerText = n.toString().padStart(2,'0');
                numsDiv.appendChild(ball);
            });

            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn-copy-line';
            copyBtn.innerHTML = getCopyIconSvg();
            copyBtn.onclick = function() { copyLine(this, ticket.join(' ')); };

            row.appendChild(label);
            row.appendChild(numsDiv);
            row.appendChild(copyBtn);
            list.appendChild(row);
        }, idx * 100);
    });
}

function getCopyIconSvg() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
}

function copyLine(btnElement, text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = btnElement.innerHTML;
            btnElement.classList.add('copied-success');
            // Dấu Tick thành công
            btnElement.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34c759" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => {
                btnElement.classList.remove('copied-success');
                btnElement.innerHTML = originalHTML;
            }, 1500);
        });
    } else { alert("Copy: " + text); }
}

function copyAll() {
    const rows = document.querySelectorAll('.nums-display');
    let text = "";
    rows.forEach(r => text += Array.from(r.children).map(c => c.innerText).join(' ') + "\n");
    navigator.clipboard.writeText(text).then(() => alert("Đã copy tất cả!"));
}

function initSmartPaste() {
    const inputs = document.querySelectorAll('.ios-num-box');
    if(inputs.length === 0) return;
    inputs[0].addEventListener('paste', (e) => {
        e.preventDefault();
        const numbers = (e.clipboardData || window.clipboardData).getData('text').match(/\d+/g);
        if (numbers && numbers.length > 0) {
            for (let i = 0; i < 6 && i < numbers.length; i++) inputs[i].value = numbers[i].toString().padStart(2, '0');
            if (numbers.length >= 7) document.getElementById('input-pwr').value = numbers[6].toString().padStart(2, '0');
            document.getElementById('save-manual-btn').focus();
        }
    });
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

const saveBtn = document.getElementById('save-manual-btn');
if(saveBtn) {
    saveBtn.onclick = () => {
        const inputs = document.querySelectorAll('.ios-num-box');
        const nums = Array.from(inputs).map(i => parseInt(i.value));
        const pwrInput = document.getElementById('input-pwr');
        const pwr = pwrInput ? parseInt(pwrInput.value) : 0;
        if (nums.some(isNaN) || isNaN(pwr)) { alert("Vui lòng nhập đủ số!"); return; }
        let d = new Date(); 
        const entry = { id: (parseInt(db[0].id) + 1).toString(), nums: nums.sort((a,b)=>a-b), pwr: pwr, date: `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}` };
        localStorage.setItem('manual_update_v4', JSON.stringify(entry));
        alert(`Đã lưu Kỳ ${entry.id}!`); location.reload(); 
    };
}

document.addEventListener('DOMContentLoaded', loadData);
