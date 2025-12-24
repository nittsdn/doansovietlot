let disabledNumbers = new Set();
let pinnedNumbers = new Set();
let currentTickets = [];

function initMap() {
    const map = document.getElementById('numberMap');
    if (!map) return;
    map.innerHTML = '';

    for (let i = 1; i <= 55; i++) {
        const container = document.createElement('div');
        // LOGIC HOT/COLD: Dựa trên stats 200 kỳ
        const isHot = numberStats[i] > 25;
        const isCold = numberStats[i] < 15;
        
        container.className = `num-btn ${isHot ? 'num-hot' : isCold ? 'num-cold' : ''}`;
        container.id = `num-${i}`;
        
        // Hiển thị số
        const numLabel = document.createElement('span');
        numLabel.innerText = i.toString().padStart(2, '0');
        numLabel.className = "cursor-pointer w-full h-full flex items-center justify-center";
        numLabel.onclick = () => toggleDisable(i);

        // Nút Ghim trực quan (📌)
        const pinBtn = document.createElement('span');
        pinBtn.innerHTML = "📌";
        pinBtn.className = "pin-icon cursor-pointer p-1";
        pinBtn.onclick = (e) => {
            e.stopPropagation();
            togglePin(i);
        };

        container.appendChild(numLabel);
        container.appendChild(pinBtn);
        map.appendChild(container);
    }
}

function toggleDisable(i) {
    const el = document.getElementById(`num-${i}`);
    if (disabledNumbers.has(i)) {
        disabledNumbers.delete(i);
        el.classList.remove('num-disabled');
    } else {
        disabledNumbers.add(i);
        pinnedNumbers.delete(i);
        el.classList.remove('is-pinned');
        el.classList.add('num-disabled');
    }
}

function togglePin(i) {
    if (disabledNumbers.has(i)) return;
    const el = document.getElementById(`num-${i}`);
    if (pinnedNumbers.has(i)) {
        pinnedNumbers.delete(i);
        el.classList.remove('is-pinned');
    } else if (pinnedNumbers.size < 6) {
        pinnedNumbers.add(i);
        el.classList.add('is-pinned');
    }
}

// LOGIC SINH SỐ CHIẾN THUẬT (FULL SPECTRUM + PHỄU LỌC 3 CẤP)
function generateFinalTickets() {
    const list = document.getElementById('ticketList');
    list.innerHTML = '';
    currentTickets = [];
    document.getElementById('results').classList.remove('hidden');
    
    // Logic "Độ phủ" (Full Spectrum)
    let usedNumbersInSession = new Set(); 

    while (currentTickets.length < 5) {
        let s = Array.from(pinnedNumbers);
        let attempts = 0;
        
        while (s.length < 6 && attempts < 2000) {
            let r = Math.floor(Math.random() * 55) + 1;
            
            if (!s.includes(r) && !disabledNumbers.has(r)) {
                // Ưu tiên số chưa dùng trong phiên để tăng độ phủ
                if (currentTickets.length < 3 || !usedNumbersInSession.has(r) || attempts > 1000) {
                    s.push(r);
                }
            }
            attempts++;
        }
        s.sort((a, b) => a - b);

        // PHỄU LỌC 3 CẤP (QUAN TRỌNG NHẤT)
        let chan = s.filter(n => n % 2 === 0).length;
        let tong = s.reduce((a, b) => a + b, 0);
        let s_str = s.map(n => n.toString().padStart(2, '0')).join(' ');

        // 1. Lọc Vùng Đỏ (Chẵn lẻ 0-6 hoặc 6-0)
        if (chan === 0 || chan === 6) continue;
        
        // 2. Lọc Tổng Golden (110 - 210)
        if (tong < 110 || tong > 210) continue;
        
        // 3. Đối soát lịch sử Jackpot (Né các kỳ cũ như 12, 13, 28, 33...)
        const isDuplicateJackpot = historyData.some(h => {
            const historyStr = h['6 số trúng'] || Object.values(h)[1] || '';
            return historyStr.includes(s_str);
        });
        if (isDuplicateJackpot) continue;

        currentTickets.push(s);
        s.forEach(n => usedNumbersInSession.add(n));

        // Hiển thị kết quả mượt mà
        const item = document.createElement('div');
        item.className = 'bg-gray-700 p-3 rounded-xl flex justify-between items-center border-l-4 border-blue-500 animate-pop';
        item.innerHTML = `
            <div class="font-mono text-lg font-bold tracking-tighter">${s_str}</div>
            <div class="text-[9px] text-gray-400 text-right uppercase">
                Tổng: ${tong} | ${chan}C-${6-chan}L
            </div>
        `;
        list.appendChild(item);
    }
}

function copyAll() {
    const text = currentTickets.map(t => t.map(n => n.toString().padStart(2, '0')).join(' ')).join('\n');
    navigator.clipboard.writeText(text).then(() => alert("Đã copy 5 bộ số!"));
}
