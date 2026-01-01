let db = [], stats = { hot: [], cold: [], gap: [] };
let historyDataStrings = [];
let disabledNumbers = [];

const CSV_URL =
'https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv';

/* ================= LOAD DATA ================= */

async function loadData() {
    try {
        const res = await fetch(CSV_URL + '&v=' + Date.now());
        const text = await res.text();
        const lines = text.trim().split(/\r?\n/);

        db = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');

            if (cols.length < 9) continue;

            const nums = cols.slice(1, 7).map(n => parseInt(n, 10));
            const pwr  = parseInt(cols[7], 10);

            if (nums.length !== 6) continue;
            if (nums.some(n => isNaN(n) || n < 1 || n > 55)) continue;
            if (isNaN(pwr) || pwr < 1 || pwr > 55) continue;

            db.push({
                id: cols[0],
                nums: nums.sort((a,b)=>a-b),
                pwr,
                date: cols[8]
            });
        }

        db.reverse();

        if (db.length < 10) throw new Error("DB quá ít dữ liệu");

        analyzeData();
        renderHeaderInfo();
        renderMap();

    } catch (e) {
        console.error("LOAD ERROR:", e);
    }
}

/* ================= ANALYZE ================= */

function analyzeData() {
    let freq = Array(56).fill(0);
    let lastSeen = Array(56).fill(999);

    historyDataStrings = [];

    db.forEach((d, idx) => {
        if (!Array.isArray(d.nums) || d.nums.length !== 6) return;

        historyDataStrings.push(d.nums.join(','));

        d.nums.forEach(n => freq[n]++);
    });

    let arr = [];
    for (let i = 1; i <= 55; i++) {
        arr.push({
            n: i,
            f: freq[i],
            gap: db.findIndex(d => d.nums.includes(i))
        });
    }

    arr.sort((a,b)=>b.f - a.f);

    stats.hot = arr.slice(0, 14).map(x=>x.n);
    stats.cold = arr.filter(x=>x.gap >= 10 && x.gap <= 25).map(x=>x.n);
    stats.gap = arr.map(x=>x.gap);
}

/* ================= MAP ================= */

function toggleNumber(n){
    disabledNumbers.includes(n)
        ? disabledNumbers.splice(disabledNumbers.indexOf(n),1)
        : disabledNumbers.push(n);
    renderMap();
}

function renderMap() {
    const grid = document.getElementById('number-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const last = db[0];

    for (let i = 1; i <= 55; i++) {
        const d = document.createElement('div');
        d.className = 'num-cell';
        d.innerText = i.toString().padStart(2,'0');

        if (disabledNumbers.includes(i)) d.classList.add('is-disabled');
        else if (i === last.pwr) d.classList.add('is-power-ball');
        else if (last.nums.includes(i)) d.classList.add('is-last-draw');
        else if (stats.hot.includes(i)) d.classList.add('is-hot');
        else if (stats.cold.includes(i)) d.classList.add('is-cold');

        d.onclick = () => toggleNumber(i);
        grid.appendChild(d);
    }
}

/* ================= HEADER ================= */

function renderHeaderInfo(){
    const last = db[0];
    document.getElementById('last-draw-id').innerText = `Kỳ #${last.id}`;
    document.getElementById('last-draw-date').innerText = last.date;

    const box = document.getElementById('last-result-numbers');
    box.innerHTML = '';

    last.nums.forEach(n=>{
        const s = document.createElement('span');
        s.className = 'res-ball-mini';
        s.innerText = n;
        box.appendChild(s);
    });

    const p = document.createElement('span');
    p.className = 'res-ball-mini is-power';
    p.innerText = last.pwr;
    box.appendChild(p);
}

/* ================= INIT ================= */

document.addEventListener('DOMContentLoaded', loadData);
