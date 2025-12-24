let disabledNumbers = new Set();
let pinnedNumbers = new Set();
let currentTickets = [];

function initMap() {
    const map = document.getElementById('numberMap');
    map.innerHTML = '';
    for (let i = 1; i <= 55; i++) {
        const btn = document.createElement('button');
        btn.innerText = i.toString().padStart(2, '0');
        btn.className = 'num-btn';
        
        // Nhãn Hot/Cold
        if (numberStats[i] > 25) btn.classList.add('num-hot');
        else if (numberStats[i] < 15) btn.classList.add('num-cold');

        btn.onclick = () => {
            if (disabledNumbers.has(i)) {
                disabledNumbers.delete(i);
                btn.classList.remove('num-disabled');
            } else {
                disabledNumbers.add(i);
                pinnedNumbers.delete(i);
                btn.classList.remove('ring-pinned');
                btn.classList.add('num-disabled');
            }
        };

        btn.oncontextmenu = (e) => {
            e.preventDefault();
            if (disabledNumbers.has(i)) return;
            if (pinnedNumbers.has(i)) {
                pinnedNumbers.delete(i);
                btn.classList.remove('ring-pinned');
            } else if (pinnedNumbers.size < 6) {
                pinnedNumbers.add(i);
                btn.classList.add('ring-pinned');
            }
        };
        map.appendChild(btn);
    }
}

function generateFinalTickets() {
    const list = document.getElementById('ticketList');
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
                // Logic Độ phủ
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

        // PHỄU LỌC 3 CẤP
        if (chan === 0 || chan === 6) continue; // Vùng đỏ chẵn lẻ
        if (tong < 110 || tong > 210) continue; // Golden Sum
        if (historyData.some(h => (h['6 số trúng'] || '').includes(s_str))) continue; // Trùng lịch sử

        currentTickets.push(s);
        s.forEach(n => usedInSession.add(n));

        const item = document.createElement('div');
        item.className = 'bg-gray-700 p-3 rounded-xl flex justify-between items-center border-l-4 border-blue-500 animate-pop';
        item.innerHTML = `
            <div class="font-mono text-lg font-bold tracking-tighter text-blue-100">${s_str}</div>
            <div class="text-[9px] text-gray-400 leading-tight text-right">TỔNG: ${tong}<br>${chan}C-${6-chan}L</div>
        `;
        list.appendChild(item);
    }
}

function copyAll() {
    const text = currentTickets.map(t => t.map(n => n.toString().padStart(2, '0')).join(' ')).join('\n');
    navigator.clipboard.writeText(text).then(() => alert("Đã copy 5 bộ số!"));
}
