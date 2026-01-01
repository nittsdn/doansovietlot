/* VIETLOTT PRO V5.4 – ENGINE (Worksheet Edition)
 * UI giữ nguyên – chỉ đổi nguồn data
 */

let db = [], stats = { hot: [], cold: [], gap: [] };
let historyDataStrings = [];
let disabledNumbers = [];

const SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv";

/* ================= LOAD DATA ================= */

async function loadData() {
  updateStatus("Đang tải dữ liệu...", true);
  try {
    const res = await fetch(SHEET_CSV + "&v=" + Date.now());
    if (!res.ok) throw new Error("Không tải được worksheet");

    const text = await res.text();
    const rows = text.trim().split(/\r?\n/).slice(1);

    db = rows.map(r => {
      const c = r.split(",");
      if (c.length < 9) return null;

      const nums = [
        Number(c[1]), Number(c[2]), Number(c[3]),
        Number(c[4]), Number(c[5]), Number(c[6])
      ].sort((a,b)=>a-b);

      if (nums.some(isNaN)) return null;

      return {
        id: c[0].trim(),
        nums,
        pwr: Number(c[7]),
        date: c[8]
      };
    }).filter(Boolean).reverse(); // kỳ mới lên trước

    if (!db.length) throw new Error("Worksheet rỗng");

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

/* ================= PHẦN DƯỚI GIỮ NGUYÊN ================= */

function analyzeData() {
  let freq = Array(56).fill(0);
  let lastSeen = Array(56).fill(-1);
  historyDataStrings = db.map(d => d.nums.join(','));

  const recent = db.slice(0, 50);
  recent.forEach(d => d.nums.forEach(n => freq[n]++));

  for (let i = 1; i <= 55; i++) {
    const idx = db.findIndex(d => d.nums.includes(i));
    lastSeen[i] = idx === -1 ? 999 : idx;
  }

  let list = [];
  for (let i = 1; i <= 55; i++) {
    list.push({ n: i, f: freq[i], gap: lastSeen[i] });
  }
  list.sort((a,b)=>b.f-a.f);

  stats.hot = list.slice(1,15).map(x=>x.n);
  stats.cold = list.filter(x=>x.gap>=5 && x.gap<=15).map(x=>x.n);
  stats.gap = lastSeen;
}

function toggleNumber(n) {
  const i = disabledNumbers.indexOf(n);
  if (i > -1) disabledNumbers.splice(i,1);
  else disabledNumbers.push(n);
  renderMap();
}

function renderMap() {
  const grid = document.getElementById("number-grid");
  grid.innerHTML = "";

  const last = db[0];
  for (let i=1;i<=55;i++) {
    const d = document.createElement("div");
    d.className = "num-cell";
    d.innerText = i;

    if (disabledNumbers.includes(i)) d.classList.add("is-disabled");
    else if (i === last.pwr) d.classList.add("is-power-ball");
    else if (last.nums.includes(i)) d.classList.add("is-last-draw");
    else if (stats.hot.includes(i)) d.classList.add("is-hot");
    else if (stats.cold.includes(i)) d.classList.add("is-cold");

    d.onclick = ()=>toggleNumber(i);
    grid.appendChild(d);
  }
}

function renderHeaderInfo() {
  const last = db[0];
  document.getElementById("last-draw-id").innerText = `Kỳ #${last.id}`;
  document.getElementById("last-draw-date").innerText = last.date;

  const box = document.getElementById("last-result-numbers");
  box.innerHTML = "";
  last.nums.forEach(n=>{
    const s = document.createElement("span");
    s.className = "res-ball-mini";
    s.innerText = n;
    box.appendChild(s);
  });
  const p = document.createElement("span");
  p.className = "res-ball-mini is-power";
  p.innerText = last.pwr;
  box.appendChild(p);
}

/* ====== PHẦN GENERATE + COPY + PASTE: GIỮ NGUYÊN FILE CŨ ====== */

document.addEventListener("DOMContentLoaded", loadData);
