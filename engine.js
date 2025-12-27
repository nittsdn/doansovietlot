/* * VIETLOTT PRO V4.7.1 - ENGINE (FIX CRASH)
 * Update: Fix lỗi treo khi tải data, icon SVG nét mảnh
 */

// --- CẤU HÌNH & BIẾN TOÀN CỤC ---
let db = [], stats = { hot: [], cold: [], gap: [] };
let historyDataStrings = []; 

const GEMS = {
    RUBY: { id: 'RUBY', name: "Trend", icon: "🔥", desc: "Bắt số Nóng", color: "gem-ruby" },
    SAPPHIRE: { id: 'SAPPHIRE', name: "Cold", icon: "❄️", desc: "Săn số Lạnh", color: "gem-sapphire" },
    TOPAZ: { id: 'TOPAZ', name: "Gold", icon: "🏆", desc: "Tỷ lệ Vàng", color: "gem-gold" },
    DIAMOND: { id: 'DIAMOND', name: "Remix", icon: "💎", desc: "Kỳ trước + Power", color: "gem-diamond" },
    EMERALD: { id: 'EMERALD', name: "Safe", icon: "❇️", desc: "An Toàn", color: "gem-emerald" }
};

// --- PHẦN 1: QUẢN LÝ DỮ LIỆU (CÓ CƠ CHẾ CHỐNG TREO) ---
async function loadData() {
    updateStatus("Đang tải dữ liệu...", true);
    try {
        // 1. Tải CSV
        const response = await fetch('data.csv?v=' + Date.now()); 
        if (!response.ok) throw new Error("Không tìm thấy file data.csv");
        const text = await response.text();
        const lines = text.trim().split(/\r?\n/);
        
        // 2. Parse CSV
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

        // 3. Xử lý LocalStorage (Dữ liệu nhập tay) - FIX LỖI TREO TẠI ĐÂY
        try {
            const localData = localStorage.getItem('manual_update_v4');
            if (localData) {
                const manualEntry = JSON.parse(localData);
                // Kiểm tra kỹ trước khi dùng để tránh crash
                if (manualEntry && manualEntry.nums && manualEntry.nums.length === 6) {
                    // Nếu DB rỗng hoặc ID nhập tay mới hơn thì dùng
                    const latestDbId = db.length > 0 ? parseInt(db[0].id) : 0;
                    if (parseInt(manualEntry.id) > latestDbId) {
                        db.unshift(manualEntry);
                        console.log("Đã load dữ liệu nhập tay:", manualEntry);
                    } else {
                        // Data cũ rồi, xóa đi
                        localStorage.removeItem('manual_update_v4');
                    }
                }
            }
        } catch (err) {
            console.warn("Dữ liệu nhập tay bị lỗi, đang reset...", err);
            localStorage.removeItem('manual_update_v4'); // Xóa ngay nếu lỗi
        }

        if (db.length === 0) {
            updateStatus("Dữ liệu trống!", false);
            return;
        }

        // 4. Chạy phân tích
        analyzeData();
        renderHeaderInfo();
        renderMap();
        initSmartPaste(); 
        updateStatus(`Sẵn sàng (Kỳ ${db[0].id})`, false);

    } catch (e) {
        console.error(e);
        updateStatus("Lỗi: " + e.message, false);
        // Alert để người dùng biết
        alert("Không tải được dữ liệu. Hãy kiểm tra file data.csv trên GitHub.");
    }
}

function analyzeData() {
    if (db.length === 0) return;
    
    // Reset
    let freq = Array(56).fill(0);
    let lastSeen = Array(56).fill(-1);
    historyDataStrings = db.map(d => d.nums.join(',')); 

    // Tần suất 50 kỳ
    const recent = db.slice(0, 50);
    recent.forEach(draw => {
        draw.nums.forEach(n => freq[n]++);
    });

    // Tính Gap
    for (let i = 1; i <= 55; i++) {
        const idx = db.findIndex(d => d.nums.includes(i));
        lastSeen[i] = (idx === -1) ? 999 : idx; 
    }

    // Phân loại
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
    // Basic checks
    if (!ticket || ticket.length !== 6) return "Lỗi vé";
    const t = ticket.sort((a,b) => a-b);
    
    // Tổng
    const sum = t.reduce((a,b) => a+b, 0);
    if (sum < 82 || sum > 250) return "Lỗi Tổng";

    // Chẵn lẻ
    const even = t.filter(n => n % 2 === 0).length;
    if (even === 0 || even === 6) return "Lỗi Chẵn Lẻ";

    // Trùng lịch sử
    const tStr = t.join(',');
    if (historyDataStrings.includes(tStr)) return "Trùng Lịch Sử";

    // Các bộ lọc phức tạp khác (được tối giản để tránh loop quá lâu trên máy yếu)
    let cons = 1, maxCons = 1;
    for(let i=0; i<5; i++) {
        if (t[i+1] === t[i] + 1) cons++; else cons = 1;
        if (cons > maxCons) maxCons = cons;
    }
    if (maxCons >= 4) return "Chuỗi Liên Tiếp";

    // Nếu qua hết
    return "OK"; 
}

// --- PHẦN 3: GENERATORS ---
function getPool(strategy) {
    const full = Array.from({length: 55}, (_, i) => i + 1);
    // Nếu chưa có stats, return full để tránh crash
    if (!stats.hot || !stats.cold) return full;
    
    switch(strategy) {
        case 'RUBY': return stats.hot.length > 5 ? stats.hot : full;
        case 'SAPPHIRE': return stats.cold.length > 5 ? stats.cold : full;
        default: return full;
    }
}

function generateTicket(gemType) {
    let ticket = [];
    let attempts = 0;
    // Giới hạn attempt thấp hơn để tránh treo máy
    const MAX_ATTEMPTS = 500; 
    
    while (attempts < MAX_ATTEMPTS) {
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
            const rand = pool[Math.floor(Math.random() * pool.length)];
            if (!ticket.includes(rand)) ticket.push(rand);
        }

        if (isRedZone(ticket) === "OK") {
            if (gemType === 'TOPAZ') {
                const sum = ticket.reduce((a,b)=>a+b,0);
                if (sum < 130 || sum > 190) continue;
                const even = ticket.filter(n => n%2===0).length;
                if (![2,3,4].includes(even)) continue;
            }
            return ticket.sort((a,b)=>a-b);
        }
    }
    // Nếu không tìm được vé đẹp, trả về vé random cơ bản (Safe Fallback)
    return generateBasicSafeTicket(); 
}

function generateBasicSafeTicket() {
    let t = [];
    // Chỉ thử 50 lần thôi
    for(let k=0; k<50; k++) {
        t = [];
        while(t.length < 6) {
            let r = Math.floor(Math.random()*55)+1;
            if(!t.includes(r)) t.push(r);
        }
        if(isRedZone(t) === "OK") return t.sort((a,b)=>a-b);
    }
    return t.sort((a,b)=>a-b); // Bần cùng quá thì trả về vé random đại
}

// --- PHẦN 4: GIAO DIỆN ---
function renderHeaderInfo() {
    if (!db.length) return;
    const latest = db[0];
    const elId = document.getElementById('last-draw-id');
    const elDate = document.getElementById('last-draw-date');
    if(elId) elId.innerText = `Kỳ #${latest.id}`;
    if(elDate) elDate.innerText = latest.date;
    
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

function renderMap() {
    const grid = document.getElementById('number-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const lastNums = db.length ? db[0].nums : [];
    
    for (let i = 1; i <= 55; i++) {
        const div = document.createElement('div');
        div.className = 'num-cell';
        div.innerText = i;
        if (lastNums.includes(i)) div.classList.add('is-last-draw');
        else if (stats.hot.includes(i)) div.classList.add('is-hot');
        else if (stats.cold.includes(i)) div.classList.add('is-cold');
        grid.appendChild(div);
    }
}

function initSmartPaste() {
    const inputs = document.querySelectorAll('.ios-num-box');
    if(inputs.length === 0) return;

    inputs[0].addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = (e.clipboardData || window.clipboardData).getData('text');
        const numbers = pasteData.match(/\d+/g);
        if (numbers && numbers.length > 0) {
            for (let i = 0; i < 6 && i < numbers.length; i++) {
                inputs[i].value = numbers[i].toString().padStart(2, '0');
            }
            if (numbers.length >= 7) {
                const pwrInput = document.getElementById('input-pwr');
                if(pwrInput) pwrInput.value = numbers[6].toString().padStart(2, '0');
            }
            document.getElementById('save-manual-btn').focus();
        }
    });

    inputs.forEach((input, idx) => {
        input.addEventListener('input', () => {
            if (input.value.length >= 2) {
                if (idx < 5) inputs[idx+1].focus();
                else {
                    const pwrInput = document.getElementById('input-pwr');
                    if(pwrInput) pwrInput.focus();
                }
            }
        });
    });
}

function generateFinalTickets() {
    if (db.length === 0) {
        alert("Đang tải dữ liệu... Vui lòng thử lại sau 2 giây.");
        loadData(); // Thử load lại
        return;
    }

    const list = document.getElementById('ticketList');
    if(!list) return;
    
    list.innerHTML = '';
    document.getElementById('results').classList.remove('hidden');

    const strategies = ['RUBY', 'SAPPHIRE', 'TOPAZ', 'DIAMOND', 'EMERALD'];
    const lastDrawNums = db.length > 0 ? db[0].nums : [];

    strategies.forEach((stratKey, idx) => {
        setTimeout(() => {
            const ticket = generateTicket(stratKey);
            const gem = GEMS[stratKey];
            
            const row = document.createElement('div');
            row.className = 'result-row animate-pop';
            
            // Nhãn
            const label = document.createElement('div');
            label.className = `gem-label ${gem.color}`;
            label.innerHTML = `<div class="gem-icon">${gem.icon}</div><div>${gem.name}</div>`;
            
            // Bộ số
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

            // Nút Copy SVG
            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn-copy-line';
            copyBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            `;
            copyBtn.onclick = () => copyLine(ticket.join(' '));

            row.appendChild(label);
            row.appendChild(numsDiv);
            row.appendChild(copyBtn);
            list.appendChild(row);
        }, idx * 100);
    });
}

function updateStatus(msg, isLoading) {
    const el = document.getElementById('last-draw-date');
    if (el) el.innerText = msg;
}

function copyLine(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
    } else {
        alert("Copy: " + text);
    }
}

function copyAll() {
    const rows = document.querySelectorAll('.nums-display');
    let text = "";
    rows.forEach(r => {
        text += Array.from(r.children).map(c => c.innerText).join(' ') + "\n";
    });
    navigator.clipboard.writeText(text).then(() => alert("Đã copy tất cả!"));
}

const saveBtn = document.getElementById('save-manual-btn');
if(saveBtn) {
    saveBtn.onclick = () => {
        const inputs = document.querySelectorAll('.ios-num-box');
        const nums = Array.from(inputs).map(i => parseInt(i.value));
        const pwrInput = document.getElementById('input-pwr');
        const pwr = pwrInput ? parseInt(pwrInput.value) : 0;
        
        if (nums.some(isNaN) || isNaN(pwr)) {
            alert("Vui lòng nhập đủ số!");
            return;
        }

        let d = new Date(); 
        const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
        const latestId = db.length > 0 ? parseInt(db[0].id) : 0;
        const newId = (latestId + 1).toString();
        
        const entry = {
            id: newId, nums: nums.sort((a,b)=>a-b), pwr: pwr, date: dateStr
        };

        localStorage.setItem('manual_update_v4', JSON.stringify(entry));
        alert(`Đã lưu Kỳ ${newId}!`);
        location.reload(); 
    };
}

// Khởi chạy
document.addEventListener('DOMContentLoaded', loadData);
