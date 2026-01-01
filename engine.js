const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv";

const TOTAL = 55;
const PICK = 6;
const GEN = 5;

let data = [];
let disabled = new Set();

/* RENDER GRID (NO document.write) */
function renderNumberGrid() {
  const grid = document.getElementById("number-grid");
  for (let i = 1; i <= TOTAL; i++) {
    const d = document.createElement("div");
    d.className = "cell";
    d.dataset.number = i;
    d.textContent = String(i).padStart(2, "0");
    grid.appendChild(d);
  }
}

/* LOAD DATA */
async function loadData() {
  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    const text = await res.text();

    const rows = text.trim().split("\n").map(r => r.split(","));
    data = rows.slice(1).map(r => ({
      numbers: r.slice(1, 7).map(Number),
      power: Number(r[7])
    }));

    renderHeat();
    renderLast();
    setStatus("Sẵn sàng", true);
  } catch (e) {
    console.error(e);
    setStatus("Lỗi tải dữ liệu", false);
  }
}

function setStatus(t, ok) {
  const s = document.getElementById("status-text");
  s.textContent = t;
  s.classList.toggle("ready", ok);
}

/* HEAT MAP */
function renderHeat() {
  const freq = Array(TOTAL + 1).fill(0);
  data.forEach(d => d.numbers.forEach(n => freq[n]++));

  document.querySelectorAll(".cell").forEach(c => {
    const n = +c.dataset.number;
    c.className = "cell";

    if (disabled.has(n)) return c.classList.add("off");
    if (freq[n] === 0
