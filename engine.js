const CSV_URL = "data.csv";

let draws = [];
let freq = Array(56).fill(0);

fetch(CSV_URL)
  .then(res => {
    if (!res.ok) throw new Error("CSV load fail");
    return res.text();
  })
  .then(text => init(parseCSV(text)))
  .catch(err => {
    console.error(err);
    document.getElementById("ky-title").innerText = "Lỗi tải dữ liệu";
  });

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const header = lines.shift().split(",");

  const idx = {
    so1: header.indexOf("Số 1"),
    so2: header.indexOf("Số 2"),
    so3: header.indexOf("Số 3"),
    so4: header.indexOf("Số 4"),
    so5: header.indexOf("Số 5"),
    so6: header.indexOf("Số 6"),
    power: header.indexOf("Số Power"),
    ky: header.indexOf("Kì"),
  };

  return lines.map(l => {
    const c = l.split(",");
    return {
      ky: +c[idx.ky],
      nums: [
        +c[idx.so1],
        +c[idx.so2],
        +c[idx.so3],
        +c[idx.so4],
        +c[idx.so5],
        +c[idx.so6]
      ],
      power: +c[idx.power]
    };
  });
}

function init(data) {
  draws = data;

  draws.forEach(d =>
    d.nums.forEach(n => freq[n]++)
  );

  renderLast(draws[draws.length - 1]);
  renderGrid();
  bindGenerate();
}

function renderLast(d) {
  document.getElementById("ky-title").innerText = `Kỳ #${d.ky}`;
  const box = document.getElementById("last-result");
  box.innerHTML = "";
  d.nums.concat(d.power).forEach(n => {
    const b = document.createElement("div");
    b.className = "ball";
    b.innerText = n;
    box.appendChild(b);
  });
}

function renderGrid() {
  const grid = document.getElementById("number-grid");
  grid.innerHTML = "";

  for (let i = 1; i <= 55; i++) {
    const d = document.createElement("div");
    d.className = "num";
    d.innerText = i;

    if (freq[i] >= 20) d.classList.add("hot");
    else if (freq[i] <= 5) d.classList.add("cold");

    grid.appendChild(d);
  }
}

function bindGenerate() {
  document.getElementById("btn-generate").onclick = () => {
    const res = document.getElementById("result-list");
    res.innerHTML = "";

    for (let i = 0; i < 5; i++) {
      const set = randomSet();
      const row = document.createElement("div");
      row.className = "result-item";
      row.innerHTML = set.map(n => `<div class="ball">${n}</div>`).join("");
      res.appendChild(row);
    }
  };
}

function randomSet() {
  const pool = [...Array(55).keys()].slice(1);
  pool.sort(() => 0.5 - Math.random());
  return pool.slice(0, 6).sort((a, b) => a - b);
}
