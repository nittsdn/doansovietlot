let disabledNumbers = new Set();
let pinnedNumbers = new Set();
let currentTickets = [];

function initMap() {
    const map = document.getElementById('numberMap');
    if (!map) return;
    map.innerHTML = '';

    for (let i = 1; i <= 55; i++) {
        const container = document.createElement('div');
        container.className = `num-btn ${numberStats[i] > 25 ? 'num-hot' : numberStats[i] < 15 ? 'num-cold' : ''}`;
        container.id = `num-${i}`;
        
        // 1. Phần số chính (Dùng để Tắt/Mở số)
        const numLabel = document.createElement('span');
        numLabel.innerText = i.toString().padStart(2, '0');
        numLabel.className = "cursor-pointer w-full h-full flex items-center justify-center";
        numLabel.onclick = () => toggleDisable(i);

        // 2. Icon Ghim (Dùng để Ghim số)
        const pinBtn = document.createElement('span');
        pinBtn.innerHTML = "📌";
        pinBtn.className = "pin-icon cursor-pointer p-1";
        pinBtn.onclick = (e) => {
            e.stopPropagation(); // Ngăn việc kích hoạt Tắt số khi bấm vào Ghim
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
        pinnedNumbers.delete(i); // Nếu tắt số thì bỏ ghim luôn
        el.classList.remove('is-pinned');
        el.classList.add('num-disabled');
    }
}

function togglePin(i) {
    if (disabledNumbers.has(i)) return; // Không ghim số đã tắt
    
    const el = document.getElementById(`num-${i}`);
    if (pinnedNumbers.has(i)) {
        pinnedNumbers.delete(i);
        el.classList.remove('is-pinned');
    } else {
        if (pinnedNumbers.size < 6) {
            pinnedNumbers.add(i);
            el.classList.add('is-pinned');
        } else {
            alert("Chỉ được ghim tối đa 6 số!");
        }
    }
}

// Các hàm generateFinalTickets và copyAll giữ nguyên như cũ...
function generateFinalTickets() {
    const list = document.getElementById('ticketList');
    if (!list) return;
    list.innerHTML = '';
    currentTickets = [];
    document.getElementById('results').classList.remove('hidden');
    let usedInSession = new Set();

    while (currentTickets.length < 5) {
        let s = Array.from(pinnedNumbers);
        let attempts = 0;
        while (s.length < 6 && attempts < 1000) {
            let r = Math.floor(Math.random() * 55) + 1;
            if (!s.includes(r) && !disabledNumbers.has(r)) {
                if (currentTickets.length < 3 || !usedInSession.has(r) || attempts > 500) {
                    s.push(r);
                }
            }
            attempts++;
        }
        s.sort((a, b) => a - b);

        let chan = s.filter(n => n % 2 === 0).length;
        let tong = s.reduce((a, b) => a + b, 0);
        let s_str = s.map(n => n.toString().padStart(2, '0')).join(' ');

        if (chan === 0 || chan === 6) continue;
        if (tong < 110 || tong > 210) continue;
        if (historyData.some(h => (h['6 số trúng'] || '').includes(s_str))) continue;

        currentTickets.push(s);
        s.forEach(n => usedInSession.add(n));

        const item = document.createElement('div');
        item.className = 'bg-gray-700 p-3 rounded-xl flex justify-between items-center border-l-4 border-blue-500 animate-pop';
        item.innerHTML = `
            <div class="font-mono text-lg font-bold tracking-tighter">${s_str}</div>
            <div class="text-[9px] text-gray-400 text-right">TỔNG: ${tong}<br>${chan}C-${6-chan}L</div>
        `;
        list.appendChild(item);
    }
}

function copyAll() {
    const text = currentTickets.map(t => t.map(n => n.toString().padStart(2, '0')).join(' ')).join('\n');
    navigator.clipboard.writeText(text).then(() => alert("Đã copy 5 bộ số!"));
}
