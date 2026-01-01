let db = [];
let stats = { hot: [], cold: [] };
let historyDataStrings = [];
let disabledNumbers = [];

const CSV_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv";

/* ===== LOAD ===== */
async function loadData() {
    const res = await fetch(CSV_URL + "&_=" + Date.now());
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);

    db = [];
    for (let i = 1; i < lines.length; i++) {
        const c = lines[i].split(",");
        const nums = c.slice(1,7).map(Number).sort((a,b)=>a-b);
        const pwr = +c[7];
        const date = c[8];
        if (nums.some(isNaN)) continue;
        db.push({ nums, pwr, date });
    }
    db.reverse();

    analyzeData();
    renderHeader();
    renderMap();
}

function analyzeData() {
    let freq = Array(56).fill(0);
    historyDataStrings = [];

    db.forEach(d=>{
        historyDataStrings.push(d.nums.join(","));
        d.nums.forEach(n=>freq[n]++);
    });

    stats.hot = [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(1,15).map(x=>x[0]);
    stats.cold = [...freq.entries()].filter(x=>x[1]<=2).map(x=>x[0]);
}

/* ===== UI ===== */
function renderHeader() {
    const last = db[0];
    document.getElementById("last-draw-id").innerText = "Kỳ mới nhất";
    document.getElementById("last-draw-date").innerText = last.date;

    const box = document.getElementById("last-result-numbers");
    box.innerHTML = "";
    last.nums.forEach(n=>{
        const s=document.createElement("span");
        s.textContent=n;
        box.appendChild(s);
    });
}

function renderMap() {
    const grid = document.getElementById("number-grid");
    grid.innerHTML="";
    const last=db[0];
    for(let i=1;i<=55;i++){
        const d=document.createElement("div");
        d.className="num-cell";
        d.textContent=i;
        if(stats.hot.includes(i)) d.classList.add("is-hot");
        if(stats.cold.includes(i)) d.classList.add("is-cold");
        if(last.nums.includes(i)) d.classList.add("is-last-draw");
        d.onclick=()=>toggle(i);
        grid.appendChild(d);
    }
}

function toggle(n){
    disabledNumbers.includes(n)
        ? disabledNumbers.splice(disabledNumbers.indexOf(n),1)
        : disabledNumbers.push(n);
    renderMap();
}

/* ===== GENERATE ===== */
function generateFinalTickets() {
    const tickets=[];
    while(tickets.length<5){
        let t=[];
        while(t.length<6){
            const r=Math.floor(Math.random()*55)+1;
            if(!t.includes(r)&&!disabledNumbers.includes(r)) t.push(r);
        }
        t.sort((a,b)=>a-b);
        if(!historyDataStrings.includes(t.join(","))) tickets.push(t);
    }
    renderTickets(tickets);
}

function renderTickets(tickets){
    const list=document.getElementById("ticketList");
    list.innerHTML="";
    tickets.forEach((nums,i)=>{
        const tier=i===0?"diamond":i<3?"gold":"ruby";
        const card=document.createElement("div");
        card.className="ticket-card "+tier;

        const label=document.createElement("div");
        label.className="ticket-label";
        label.innerText=tier.toUpperCase();
        card.appendChild(label);

        const balls=document.createElement("div");
        balls.className="ticket-balls";

        nums.forEach(n=>{
            const b=document.createElement("span");
            b.className="ball";
            b.innerText=n;
            if(stats.hot.includes(n)) b.classList.add("hot");
            if(stats.cold.includes(n)) b.classList.add("cold");
            if(disabledNumbers.includes(n)) b.classList.add("disabled");
            balls.appendChild(b);
        });

        card.appendChild(balls);
        list.appendChild(card);
    });
    document.getElementById("results").classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", loadData);
