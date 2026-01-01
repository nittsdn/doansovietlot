/* * VIETLOTT PRO V5.4 - FINAL ENGINE
 * Data source: Google Sheets CSV (public)
 */

let db = [], stats = { hot: [], cold: [], gap: [] };
let historyDataStrings = []; 
let disabledNumbers = [];

/* ================= ICONS & GEMS ================= */

const ICONS = {
    DIAMOND: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-dia" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#e0f7fa"/><stop offset="100%" style="stop-color:#b2ebf2"/></linearGradient></defs><path d="M32 2 L2 24 L32 62 L62 24 L32 2 Z" fill="url(#grad-dia)" stroke="#00bcd4" stroke-width="1.5"/><path d="M2 24 L62 24 M12 24 L32 2 L52 24 M32 62 L12 24 M32 62 L52 24" stroke="#00acc1" stroke-width="1" stroke-opacity="0.6"/></svg>`,
    RUBY: `<svg viewBox="0 0 64 64" fill="none"><defs><radialGradient id="grad-ruby" cx="30%" cy="30%" r="70%"><stop offset="0%" style="stop-color:#ff8a80"/><stop offset="100%" style="stop-color:#c62828"/></radialGradient></defs><path d="M32 6 L58 24 L48 58 H16 L6 24 L32 6 Z" fill="url(#grad-ruby)" stroke="#b71c1c" stroke-width="1"/></svg>`,
    SAPPHIRE: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-sapphire" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#42a5f5"/><stop offset="100%" style="stop-color:#0d47a1"/></linearGradient></defs><rect x="10" y="10" width="44" height="44" rx="12" fill="url(#grad-sapphire)"/></svg>`,
    GOLD: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-gold" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#ffe082"/><stop offset="100%" style="stop-color:#ff6f00"/></linearGradient></defs><path d="M12 20 L4 46 H60 L52 20 Z" fill="url(#grad-gold)"/></svg>`,
    EMERALD: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-em" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#66bb6a"/><stop offset="100%" style="stop-color:#1b5e20"/></linearGradient></defs><rect x="12" y="12" width="40" height="40" rx="6" fill="url(#grad-em)"/></svg>`
};

const GEMS = {
    RUBY: { name: "RUBY", icon: ICONS.RUBY, color: "gem-ruby" },
    SAPPHIRE: { name: "SAPPHIRE", icon: ICONS.SAPPHIRE, color: "gem-sapphire" },
    GOLD: { name: "GOLD", icon: ICONS.GOLD, color: "gem-gold" },
    DIAMOND: { name: "DIAMOND", icon: ICONS.DIAMOND, color: "gem-diamond" },
    EMERALD: { name: "EMERALD", icon: ICONS.EMERALD, color: "gem-emerald" }
};

const STORAGE_KEY = 'vietlott_pro_v5_storage';

/* ================= DATA LOAD ================= */

const CSV_URL =
'https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv';

async function loadData() {
    updateStatus("Đang tải dữ liệu...", true);
    try {
        const res = await fetch(CSV_URL + '&v=' + Date.now());
        if (!res.ok) throw new Error("Fetch CSV lỗi");

        const text = await res.text();
        const lines = text.trim().split(/\r?\n/);

        db = lines.slice(1).map(line => {
            const p = line.split(',');
            if (p.length < 9) return null;

            const id = p[0].trim();
            const nums = [
                Number(p[1]), Number(p[2]), Number(p[3]),
                Number(p[4]), Number(p[5]), Number(p[6])
            ].sort((a,b)=>a-b);

            const pwr = Number(p[7]);
            const date = p[8];

            if (nums.some(isNaN) || isNaN(pwr)) return null;
            return { id, nums, pwr, date };
        }).filter(Boolean).reverse();

        if (!db.length) throw new Error("CSV trống");

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

/* ================= ANALYSIS ================= */

function analyzeData() {
    let freq = Array(56).fill(0);
    let lastSeen = Array(56).fill(-1);

    historyDataStrings = db.map(d => d.nums.join(','));

    db.slice(0, 50).forEach(draw =>
        draw.nums.forEach(n => freq[n]++)
    );

    for (let i = 1; i <= 55; i++) {
        const idx = db.findIndex(d => d.nums.includes(i));
        lastSeen[i] = idx === -1 ? 999 : idx;
    }

    let arr = [];
    for (let i = 1; i <= 55; i++)
        arr.push({ n: i, f: freq[i], gap: lastSeen[i] });

    arr.sort((a,b)=>b.f - a.f);

    stats.hot = arr.slice(0,14).map(x=>x.n);
    stats.cold = arr.filter(x=>x.gap>=5 && x.gap<=15).map(x=>x.n);
    stats.gap = lastSeen;
}

/* ================= MAP & UI ================= */

function toggleNumber(n) {
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
        d.innerText = i;

        if (disabledNumbers.includes(i)) d.classList.add('is-disabled');
        else if (i === last.pwr) d.classList.add('is-power-ball');
        else if (last.nums.includes(i)) d.classList.add('is-last-draw');
        else if (stats.hot.includes(i)) d.classList.add('is-hot');
        else if (stats.cold.includes(i)) d.classList.add('is-cold');

        d.onclick = () => toggleNumber(i);
        grid.appendChild(d);
    }
}

/* ================= TICKET LOGIC ================= */

function isRedZone(ticket) {
    const t = ticket.sort((a,b)=>a-b);
    const sum = t.reduce((a,b)=>a+b,0);
    if (sum < 90 || sum > 240) return false;
    if ([0,6].includes(t.filter(n=>n%2===0).length)) return false;
    if (historyDataStrings.includes(t.join(','))) return false;

    let c=1,m=1;
    for(let i=0;i<5;i++){c=(t[i+1]===t[i]+1)?c+1:1;m=Math.max(m,c);}
    return m<4;
}

function generateTicket() {
    const pool = Array.from({length:55},(_,i)=>i+1)
        .filter(n=>!disabledNumbers.includes(n));

    for(let k=0;k<500;k++){
        let t=[];
        while(t.length<6){
            let r=pool[Math.floor(Math.random()*pool.length)];
            if(!t.includes(r)) t.push(r);
        }
        if(isRedZone(t)) return t.sort((a,b)=>a-b);
    }
    return pool.slice(0,6);
}

/* ================= HEADER ================= */

function renderHeaderInfo() {
    const last = db[0];
    document.getElementById('last-draw-id').innerText = `Kỳ #${last.id}`;
    document.getElementById('last-draw-date').innerText = last.date;

    const box = document.getElementById('last-result-numbers');
    box.innerHTML='';
    last.nums.forEach(n=>{
        const s=document.createElement('span');
        s.className='res-ball-mini'; s.innerText=n;
        box.appendChild(s);
    });
    const p=document.createElement('span');
    p.className='res-ball-mini is-power'; p.innerText=last.pwr;
    box.appendChild(p);
}

/* ================= UTILS ================= */

function initSmartPaste(){}

function updateStatus(msg){
    const el=document.getElementById('last-draw-date');
    if(el) el.innerText=msg;
}

document.addEventListener('DOMContentLoaded', loadData);
