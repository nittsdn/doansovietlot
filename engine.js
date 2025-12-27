/* * VIETLOTT PRO V4.5 - MASTER ENGINE
 * Logic: Red Zone Filter + 5 Gem Strategies + Smart Input
 */

// --- CẤU HÌNH & BIẾN TOÀN CỤC ---
let db = [], stats = { hot: [], cold: [], gap: [] };
let historyDataStrings = []; // Cache chuỗi lịch sử để check nhanh

const GEMS = {
    RUBY: { id: 'RUBY', name: "Trend", icon: "🔥", desc: "Bắt số Nóng (Top 2-15)", color: "gem-ruby" },
    SAPPHIRE: { id: 'SAPPHIRE', name: "Cold", icon: "❄️", desc: "Săn số Lạnh (Gap 5-12)", color: "gem-sapphire" },
    TOPAZ: { id: 'TOPAZ', name: "Gold", icon: "🏆", desc: "Tỷ lệ Vàng (Tổng & Chẵn/Lẻ)", color: "gem-gold" },
    DIAMOND: { id: 'DIAMOND', name: "Remix", icon: "💎", desc: "Kỳ trước + Power + Bạc nhớ", color: "gem-diamond" },
    EMERALD: { id: 'EMERALD', name: "Safe", icon: "❇️", desc: "Vùng An Toàn (Lọc sạch 100%)", color: "gem-emerald" }
};

// --- PHẦN 1: QUẢN LÝ DỮ LIỆU (DATA HANDLER) ---

async function loadData() {
    updateStatus("Đang tải dữ liệu...", true);
    try {
        // 1. Load CSV từ GitHub
        const response = await fetch('data.csv?v=' + Date.now()); // Thêm timestamp để tránh cache
        if (!response.ok) throw new Error("Lỗi tải data.csv");
        const text = await response.text();
        const lines = text.trim().split(/\r?\n/);
        
        // Parse CSV (Bỏ dòng header)
        db = lines.slice(1).map(line => {
            const p = line.split(',');
            if (p.length < 2) return null;
            return { 
                id: p[0], 
                nums: p[1].trim().split(/\s+/).map(Number).sort((a,b)=>a-b), 
                pwr: Number(p[2]), 
                date: p[3] 
            };
        }).filter(item => item && item.nums.length === 6).reverse(); // Mới nhất lên đầu

        // 2. Load LocalStorage (Dữ liệu nhập tay) - Ưu tiên hiển thị
        const localData = localStorage.getItem('manual_update_v4');
        if (localData) {
            const manualEntry = JSON.parse(localData);
            // Nếu ID nhập tay lớn hơn ID trong CSV thì chèn vào đầu
            if (db.length === 0 || parseInt(manualEntry.id) > parseInt(db[0].id)) {
                db.unshift(manualEntry);
                console.log("Đã chèn dữ liệu nhập tay:", manualEntry);
            } else {
                // Nếu CSV đã cập nhật bằng hoặc hơn thì xóa LocalStorage để dùng data gốc
                localStorage.removeItem('manual_update_v4');
            }
        }

        // 3. Xử lý thống kê
        analyzeData();
        renderHeaderInfo();
        renderMap();
        initSmartPaste(); // Kích hoạt tính năng Paste thông minh
        updateStatus(`Sẵn sàng (Kỳ ${db[0]?.id || '??'})`, false);

    } catch (e) {
        console.error(e);
        updateStatus("Lỗi tải dữ liệu!", false);
    }
}

function analyzeData() {
    if (db.length === 0) return;

    // Reset stats
    let freq = Array(56).fill(0);
    let lastSeen = Array(56).fill(-1);
    historyDataStrings = db.map(d => d.nums.join(',')); 

    // Tính tần suất 50 kỳ gần nhất
    const recent = db.slice(0, 50);
    recent.forEach(draw => {
        draw.nums.forEach(n => freq[n]++);
    });

    // Tính Gap (Số kỳ chưa về)
    // Duyệt ngược từ quá khứ đến hiện tại để tính chính xác
    // Cách đơn giản: Duyệt toàn bộ db, nếu gặp số thì reset gap về 0, ko gặp thì gap++
    // Nhưng cách tối ưu hơn: Duyệt từ kỳ mới nhất về sau
    for (let i = 1; i <= 55; i++) {
        const idx = db.findIndex(d => d.nums.includes(i));
        lastSeen[i] = (idx === -1) ? 999 : idx; // idx chính là số kỳ chưa về (vì db[0] là mới nhất)
    }

    // Phân loại
    let sortedFreq = [];
    for(let i=1; i<=55; i++) {
        sortedFreq.push({ n: i, f: freq[i], gap: lastSeen[i] });
    }
    // Sắp xếp theo tần suất giảm dần
    sortedFreq.sort((a,b) => b.f - a.f);

    stats.hot = sortedFreq.slice(1, 15).map(x => x.n); // Top 2-15 (Bỏ Top 1)
    stats.cold = sortedFreq.filter(x => x.gap >= 5 && x.gap <= 12).map(x => x.n); // Gap 5-12
    stats.gap = lastSeen;
}

// --- PHẦN 2: BỘ LỌC VÙNG ĐỎ (RED ZONE - DEATH FILTER) ---

function isRedZone(ticket) {
    const t = ticket.sort((a,b) => a-b);
    
    // 1. Tổng (Sum): 82 - 250
    const sum = t.reduce((a,b) => a+b, 0);
    if (sum < 82 || sum > 250) return "Lỗi Tổng";

    // 2. Chẵn/Lẻ: Không được 6:0 hoặc 0:6
    const even = t.filter(n => n % 2 === 0).length;
    if (even === 0 || even === 6) return "Lỗi Chẵn Lẻ";

    // 3. Trùng Lịch Sử (Jackpot History)
    const tStr = t.join(',');
    if (historyDataStrings.includes(tStr)) return "Trùng Lịch Sử";

    // 4. Chuỗi liên tiếp (Consecutive) >= 4 số (VD: 1,2,3,4)
    let cons = 1, maxCons = 1;
    for(let i=0; i<5; i++) {
        if (t[i+1] === t[i] + 1) cons++;
        else cons = 1;
        if (cons > maxCons) maxCons = cons;
    }
    if (maxCons >= 4) return "Chuỗi Liên Tiếp";

    // 5. Chung đuôi (Same Tail) >= 4 số (VD: 05,15,25,35)
    let tails = t.map(n => n % 10);
    let maxTail = 0;
    for(let i=0; i<10; i++) {
        let count = tails.filter(x => x === i).length;
        if (count > maxTail) maxTail = count;
    }
    if (maxTail >= 4) return "Lỗi Chung Đuôi";

    // 6. Cụm đầu số (Same Decade) >= 5 số (VD: 10,11,12,13,15)
    let decades = t.map(n => Math.floor(n/10));
    let maxDecade = 0;
    for(let i=0; i<6; i++) {
        let count = decades.filter(x => x === i).length;
        if (count > maxDecade) maxDecade = count;
    }
    if (maxDecade >= 5) return "Lỗi Hàng Chục";

    // 7. Cấp số cộng (Arithmetic Progression)
    // Kiểm tra nếu cả 6 số tạo thành cấp số cộng
    let diff = t[1] - t[0];
    let isArith = true;
    for(let i=1; i<5; i++) {
        if (t[i+1] - t[i] !== diff) { isArith = false; break; }
    }
    if (isArith && diff > 0) return "Cấp Số Cộng";

    // 8. Số Nguyên Tố >= 5
    const primes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53];
    const pCount = t.filter(n => primes.includes(n)).length;
    if (pCount >= 5) return "Quá Nhiều SNT";

    // 9. Độ rộng (Range) < 18
    if (t[5] - t[0] < 18) return "Range Quá Nhỏ";

    // 10. Bước nhảy (Gap) > 30 (Nới lỏng lên 35 cho an toàn)
    let maxGap = 0;
    for(let i=0; i<5; i++) if(t[i+1] - t[i] > maxGap) maxGap = t[i+1] - t[i];
    if (maxGap > 35) return "Gap Quá Lớn";

    return "OK"; // Vượt qua Vùng Đỏ
}

// --- PHẦN 3: CÁC CHIẾN THUẬT (GENERATORS) ---

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
        
        // LOGIC RIÊNG TỪNG LOẠI
        if (gemType === 'DIAMOND' && db.length > 0) {
            // Remix: 1 số kỳ trước + Power kỳ trước (nếu valid) + Random
            const lastDraw = db[0].nums;
            const pwr = db[0].pwr;
            
            // 1. Lấy 1 số ngẫu nhiên từ kỳ trước
            ticket.push(lastDraw[Math.floor(Math.random() * lastDraw.length)]);
            
            // 2. Lấy số Power nếu nó nằm trong khoảng 1-55 và chưa trùng
            if (pwr <= 55 && !ticket.includes(pwr)) {
                ticket.push(pwr);
            }
            
            // Reset pool về full để điền nốt
            pool = Array.from({length: 55}, (_, i) => i + 1);
        } else if (gemType === 'TOPAZ') {
            // Tỷ lệ vàng: Ưu tiên tổng 130-190 ngay từ đầu thì khó, nên cứ random rồi lọc sau
            pool = Array.from({length: 55}, (_, i) => i + 1);
        }
        
        // Điền đầy vé
        while(ticket.length < 6) {
            // Nếu pool rỗng (do filter quá đà), reset về full
            if (pool.length === 0) pool = Array.from({length: 55}, (_, i) => i + 1);
            
            const rand = pool[Math.floor(Math.random() * pool.length)];
            if (!ticket.includes(rand)) {
                ticket.push(rand);
                // Loại số vừa chọn khỏi pool để tránh lặp vô hạn trong while này
                // (Thực ra check includes là đủ, nhưng logic pool giúp clean hơn)
            }
        }

        // KIỂM TRA RED ZONE
        if (isRedZone(ticket) === "OK") {
            // Kiểm tra thêm điều kiện phụ cho TOPAZ (Gold Ratio)
            if (gemType === 'TOPAZ') {
                const sum = ticket.reduce((a,b)=>a+b,0);
                if (sum < 130 || sum > 190) continue;
                
                const even = ticket.filter(n => n%2===0).length;
                // Chấp nhận 3:3, 2:4, 4:2
                if (![2,3,4].includes(even)) continue;
            }
            
            return ticket.sort((a,b)=>a-b);
        }
    }
    
    // Fallback: Nếu không tìm được vé đẹp, trả về vé Random nhưng sạch Vùng Đỏ (Emerald)
    // Để tránh đệ quy vô hạn, ta gọi hàm sinh cơ bản
    return generateBasicSafeTicket(); 
}

function generateBasicSafeTicket() {
    let t = [];
    let safeAttempts = 0;
    while(safeAttempts < 500) {
        t = [];
        while(t.length < 6) {
            let r = Math.floor(Math.random()*55)+1;
            if(!t.includes(r)) t.push(r);
        }
        if(isRedZone(t) === "OK") return t.sort((a,b)=>a-b);
        safeAttempts++;
    }
    return t.sort((a,b)=>a-b); // Bần cùng bất đắc dĩ mới trả về vé chưa sạch
}

// --- PHẦN 4: GIAO DIỆN & TƯƠNG TÁC (UI/UX) ---

function renderHeaderInfo() {
    if (!db.length) return;
    const latest = db[0];
    document.getElementById('last-draw-id').innerText = `Kỳ #${latest.id}`;
    document.getElementById('last-draw-date').innerText = latest.date;
    
    // Render 6 số + Power header
    const container = document.getElementById('last-result-numbers');
    if(container) {
        container.innerHTML = '';
        latest.nums.forEach(n => {
            const sp = document.createElement('span');
            sp.className = 'res-ball-mini'; 
            sp.innerText = n;
            container.appendChild(sp);
        });
        // Power
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
        
        // Logic màu sắc
        if (lastNums.includes(i)) div.classList.add('is-last-draw');
        else if (stats.hot.includes(i)) div.classList.add('is-hot');
        else if (stats.cold.includes(i)) div.classList.add('is-cold');
        
        // Thêm sự kiện click (nếu muốn toggle bật tắt số - v4.5 tạm ẩn)
        // div.onclick = () => toggleNumber(i);
        
        grid.appendChild(div);
    }
}

// --- HÀM XỬ LÝ NHẬP TAY THÔNG MINH (SMART PASTE) ---
function initSmartPaste() {
    const inputs = document.querySelectorAll('.ios-num-box');
    if(inputs.length === 0) return;

    // Lắng nghe sự kiện paste ở ô đầu tiên
    inputs[0].addEventListener('paste', (e) => {
        e.preventDefault();
        // Lấy dữ liệu clipboard
        const pasteData = (e.clipboardData || window.clipboardData).getData('text');
        // Tìm tất cả các con số
        const numbers = pasteData.match(/\d+/g);

        if (numbers && numbers.length > 0) {
            // Điền vào 6 ô chính
            for (let i = 0; i < 6 && i < numbers.length; i++) {
                inputs[i].value = numbers[i].toString().padStart(2, '0');
            }
            // Nếu có số thứ 7 (Power), điền vào ô Power
            if (numbers.length >= 7) {
                const pwrInput = document.getElementById('input-pwr');
                if(pwrInput) pwrInput.value = numbers[6].toString().padStart(2, '0');
            }
            
            // Focus vào nút Lưu
            document.getElementById('save-manual-btn').focus();
        }
    });

    // Auto-jump: Nhảy sang ô tiếp theo khi nhập đủ 2 số
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

// --- HÀM CHÍNH: SINH SỐ & HIỂN THỊ ---
function generateFinalTickets() {
    if (db.length === 0) {
        alert("Chưa có dữ liệu! Vui lòng đợi tải hoặc nhập tay.");
        return;
    }

    const list = document.getElementById('ticketList');
    if(!list) return;
    
    list.innerHTML = '';
    document.getElementById('results').classList.remove('hidden');

    const strategies = ['RUBY', 'SAPPHIRE', 'TOPAZ', 'DIAMOND', 'EMERALD'];
    
    strategies.forEach((stratKey, idx) => {
        // Tạo hiệu ứng delay nhỏ cho từng dòng hiện ra (optional)
        setTimeout(() => {
            const ticket = generateTicket(stratKey);
            const gem = GEMS[stratKey];
            
            // Tạo HTML cho dòng kết quả
            const row = document.createElement('div');
            row.className = 'result-row animate-pop';
            
            // Nhãn Đá Quý
            const label = document.createElement('div');
            label.className = `gem-label ${gem.color}`;
            label.innerHTML = `<div class="gem-icon">${gem.icon}</div><div>${gem.name}</div>`;
            
            // Bộ số (Balls)
            const numsDiv = document.createElement('div');
            numsDiv.className = 'nums-display';
            ticket.forEach(n => {
                const ball = document.createElement('div');
                ball.className = 'res-ball';
                ball.innerText = n.toString().padStart(2,'0');
                numsDiv.appendChild(ball);
            });

            // Nút Copy
            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn-copy-line';
            copyBtn.innerHTML = '📋'; // Hoặc icon SVG
            copyBtn.onclick = () => copyLine(ticket.join(' '));

            row.appendChild(label);
            row.appendChild(numsDiv);
            row.appendChild(copyBtn);
            list.appendChild(row);
        }, idx * 100);
    });
}

// --- UTILS ---
function updateStatus(msg, isLoading) {
    const el = document.getElementById('last-draw-date'); // Tận dụng chỗ hiển thị ngày để báo status
    if (el && isLoading) el.innerText = msg;
}

function copyLine(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            // Hiệu ứng Toast đơn giản hoặc alert
            // alert("Đã copy: " + text); 
            // Có thể làm nút đổi màu để báo success
        });
    } else {
        // Fallback cho trình duyệt cũ
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

// --- XỬ LÝ LƯU THỦ CÔNG ---
const saveBtn = document.getElementById('save-manual-btn');
if(saveBtn) {
    saveBtn.onclick = () => {
        // 1. Lấy dữ liệu từ input
        const inputs = document.querySelectorAll('.ios-num-box');
        const nums = Array.from(inputs).map(i => parseInt(i.value));
        const pwrInput = document.getElementById('input-pwr');
        const pwr = pwrInput ? parseInt(pwrInput.value) : 0;
        
        // Validate
        if (nums.some(isNaN) || isNaN(pwr)) {
            alert("Vui lòng nhập đủ số!");
            return;
        }

        // 2. Tính ngày tiếp theo (Thứ 3, 5, 7)
        let d = new Date(); 
        const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;

        // 3. Tạo object
        const latestId = db.length > 0 ? parseInt(db[0].id) : 0;
        const newId = (latestId + 1).toString();
        
        const entry = {
            id: newId,
            nums: nums.sort((a,b)=>a-b),
            pwr: pwr,
            date: dateStr
        };

        // 4. Lưu LocalStorage
        localStorage.setItem('manual_update_v4', JSON.stringify(entry));
        
        // 5. Reload
        alert(`Đã lưu Kỳ ${newId} vào bộ nhớ máy!`);
        location.reload(); 
    };
}

// KHỞI CHẠY
document.addEventListener('DOMContentLoaded', loadData);
