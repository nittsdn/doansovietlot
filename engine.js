let disabledNumbers = new Set();
let pinnedNumbers = new Set();

function initMap() {
    const map = document.getElementById('numberMap');
    for (let i = 1; i <= 55; i++) {
        const btn = document.createElement('button');
        btn.innerText = i.toString().padStart(2, '0');
        btn.className = `num-btn ${numberStats[i] > 25 ? 'num-hot' : numberStats[i] < 15 ? 'num-cold' : ''}`;
        
        btn.onclick = () => toggleDisable(i, btn);
        btn.oncontextmenu = (e) => { e.preventDefault(); togglePin(i, btn); };
        map.appendChild(btn);
    }
}

function toggleDisable(i, btn) {
    if (disabledNumbers.has(i)) {
        disabledNumbers.delete(i);
        btn.classList.remove('num-disabled');
    } else {
        disabledNumbers.add(i);
        btn.classList.add('num-disabled');
    }
}

function togglePin(i, btn) {
    if (pinnedNumbers.has(i)) {
        pinnedNumbers.delete(i);
        btn.classList.remove('ring-white');
    } else {
        if (pinnedNumbers.size < 6) {
            pinnedNumbers.add(i);
            btn.classList.add('ring-white');
        }
    }
}

function generateFinalTickets() {
    // ... Copy toàn bộ logic generateTickets cũ của bạn vào đây ...
    // Logic này sẽ đọc từ pinnedNumbers và historyData đã có sẵn
}
