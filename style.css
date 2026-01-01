const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv";

const TOTAL = 55;
const PICK = 6;
const GEN = 5;

let data = [];
let disabled = new Set();

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
  } catch {
    setStatus("Lỗi tải dữ liệu", false);
  }
}

function setStatus(t, ok) {
  const s = document.getElementById("status-text");
  s.textContent = t;
  s.classList.toggle("ready", ok);
}

function renderHeat() {
  const freq = Array(TOTAL + 1).fill(0);
  data.forEach(d => d.numbers.forEach(n => freq[n]++));

  document.querySelectorAll(".cell").forEach(c => {
    const n = +c.dataset.number;
    c.className = "cell";

    if (disabled.has(n)) return c.classList.add("off");
    if (freq[n] === 0) c.classList.add("cold");
    if (freq[n] > 10) c.classList.add("hot");
  });

  const last = data.at(-1);
  last.numbers.forEach(n =>
    document.querySelector(`[data-number="${n}"]`)?.classList.add("last")
  );
  document.querySelector(`[data-number="${last.power}"]`)?.classList.add("power");
}

function renderLast() {
  document.getElementById("last-draw").innerHTML =
    data.at(-1).numbers.map(n =>
      `<span class="ball">${String(n).padStart(2, "0")}</span>`
    ).join("");
}

function generate() {
  const pool = [];
  for (let i = 1; i <= TOTAL; i++) if (!disabled.has(i)) pool.push(i);
  return pool.sort(() => 0.5 - Math.random()).slice(0, PICK).sort((a, b) => a - b);
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();

  document.querySelectorAll(".cell").forEach(c =>
    c.onclick = () => {
      const n = +c.dataset.number;
      disabled.has(n) ? disabled.delete(n) : disabled.add(n);
      renderHeat();
    }
  );

  document.getElementById("analyze-btn").onclick = () => {
    const box = document.getElementById("result-list");
    box.innerHTML = "";
    for (let i = 0; i < GEN; i++) {
      const r = document.createElement("div");
      r.className = "result-row";
      r.innerHTML = generate().map(n =>
        `<span class="ball">${String(n).padStart(2, "0")}</span>`
      ).join("");
      box.appendChild(r);
    }
  };
});
