/* ===============================
   VIETLOTT PRO V5.5 – CSV ENGINE
   Compatible with Worksheet v2
================================ */

let db = [];
let stats = { hot: [], cold: [], gap: [] };
let historyDataStrings = [];
let disabledNumbers = [];

/* ===== CSV GOOGLE SHEETS ===== */

const CSV_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv";

/* ================= LOAD DATA ================= */

async function loadData() {
    const res = await fetch(CSV_URL + "&_=" + Date.now());
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);

    db = [];

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSV(lines[i]);
        if (!row || row.length < 10) continue;

        const nums = row.slice(1, 7).map(n => parseInt(n, 10));
        const pwr = parseInt(row[7], 10);
        const date = row[8];
        const j1 = Number(row[9].replace(/\D/g, ""));

        if (nums.some(n => isNaN(n) || n < 1 || n > 55)) continue;
        if (isNaN(pwr) || pwr < 1 || pwr > 55) continue;

        db.push({
            nums: nums.sort((a, b) => a - b),
            pwr,
            date,
            j1
        });
    }

    // CSV từ cũ → mới, đảo lại cho engine (db[0] = kỳ mới nhất)
    db.reverse();

    analyzeData();
    renderHeaderInfo();
    renderMap();
}

/* ================= CSV PARSER ================= */

function parseCSV(line) {
    let res = [], cur = "", q = false;
    for (let c of line) {
        if (c === '"') q = !q;
        else if (c === "," && !q) {
            res.push(cur.trim());
            cur = "";
        } else cur += c;
    }
    res.push(cur.trim());
    return res;
}

/* ================= ANALYZE ================= */

function analyzeData() {
    let freq = Array(56).fill(0);
    let lastSeen = Array(56).fill(-1);

    historyDataStrings = [];

    db.forEach((d, idx) => {
        const key = d.nums.join(",");
        historyDataStrings.push(key);

        d.nums.forEach(n => {
            freq[n]++;
            if (lastSeen[n] === -1) lastSeen[n] = idx;
        });
    });

    let arr = [];
    for (let i = 1; i <= 55; i++) {
        arr.push({
            n: i,
            f: freq[i],
            gap: lastSeen[i] === -1 ? 999 : lastSeen[i]
        });
    }

    arr.sort((a, b) => b.f - a.f);

    stats.hot = arr.slice(0, 14).map(x => x.n);
    stats.cold = arr.filter(x => x.gap >= 10 && x.gap <= 25).map(x => x.n);
    stats.gap = arr.map(x => x.gap);
}

/* ================= MAP ================= */

function toggleNumber(n) {
    disabledNumbers.includes(n)
        ? disabledNumbers.splice(disabledNumbers.indexOf(n), 1)
        : disabledNumbers.push(n);
    renderMap();
}

function renderMap() {
    const grid = document.getElementById("number-grid");
    grid.innerHTML = "";

    const last = db[0];

    for (let i = 1; i <= 55; i++) {
        const d = document.createElement("div");
        d.className = "num-cell";
        d.textContent = i.toString().padStart(2, "0");

        if (disabledNumbers.includes(i)) d.classList.add("is-disabled");
        else if (i === last.pwr) d.classList.add("is-power-ball");
        else if (last.nums.includes(i)) d.classList.add("is-last-draw");
        else if (stats.hot.includes(i)) d.classList.add("is-hot");
        else if (stats.cold.includes(i)) d.classList.add("is-cold");

        d.onclick = () => toggleNumber(i);
        grid.appendChild(d);
    }
}

/* ================= HEADER ================= */

function renderHeaderInfo() {
    const last = db[0];

    document.getElementById("last-draw-id").innerText =
        "Kỳ mới nhất";
    document.getElementById("last-draw-date").innerText =
        `${last.date} | J1: ${last.j1.toLocaleString("vi-VN")}`;

    const box = document.getElementById("last-result-numbers");
    box.innerHTML = "";

    last.nums.forEach(n => {
        const s = document.createElement("span");
        s.className = "res-ball-mini";
        s.textContent = n;
        box.appendChild(s);
    });

    const p = document.createElement("span");
    p.className = "res-ball-mini is-power";
    p.textContent = last.pwr;
    box.appendChild(p);
}

/* ================= GENERATE ================= */

function generateFinalTickets() {
    const results = [];
    let tries = 0;

    while (results.length < 6 && tries < 5000) {
        tries++;

        let pool = [];
        stats.hot.forEach(n => Math.random() < 0.6 && pool.push(n));
        stats.cold.forEach(n => Math.random() < 0.3 && pool.push(n));

        while (pool.length < 6) {
            const r = Math.floor(Math.random() * 55) + 1;
            if (!pool.includes(r) && !disabledNumbers.includes(r))
                pool.push(r);
        }

        const ticket = pool.slice(0, 6).sort((a, b) => a - b);
        const key = ticket.join(",");

        if (!historyDataStrings.includes(key))
            results.push(ticket);
    }

    renderTickets(results);
}

/* ================= TICKETS ================= */

function renderTickets(arr) {
    const box = document.getElementById("results");
    const list = document.getElementById("ticketList");
    list.innerHTML = "";

    arr.forEach(t => {
        const d = document.createElement("div");
        d.className = "ticket-line";
        d.textContent = t.join(" ");
        list.appendChild(d);
    });

    box.classList.remove("hidden");
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", loadData);
