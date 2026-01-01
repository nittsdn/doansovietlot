/* ===============================
   GLOBAL STATE
================================ */
let db = [];                 // lịch sử từ CSV
let historyDataStrings = []; // set string để check trùng
let stats = {
    hot: [],
    cold: []
};
let disabledNumbers = [];

/* ===============================
   LOAD CSV (AUTO)
================================ */
fetch("data.csv")
    .then(res => res.text())
    .then(text => {
        parseCSV(text);
        calcStats();
        renderHeatMap(); // UI cũ của bạn
    });

function parseCSV(text) {
    const rows = text.trim().split("\n").slice(1);

    db = rows.map(r => {
        const c = r.split(",");
        return {
            nums: [
                +c[1], +c[2], +c[3],
                +c[4], +c[5], +c[6]
            ],
            power: +c[7]
        };
    });

    historyDataStrings = db.map(d =>
        d.nums.slice().sort((a, b) => a - b).join(",")
    );
}

/* ===============================
   STATISTICS (HOT / COLD)
================================ */
function calcStats() {
    const freq = Array(56).fill(0);

    db.forEach(d => d.nums.forEach(n => freq[n]++));

    const sorted = [...freq.entries()]
        .slice(1)
        .sort((a, b) => b[1] - a[1]);

    stats.hot = sorted.slice(0, 10).map(x => x[0]);
    stats.cold = sorted.slice(-10).map(x => x[0]);
}

/* ===============================
   CORE BUTTON
================================ */
function onGenerateClick() {
    generateFinalTickets();
}

/* ===============================
   GENERATE TICKETS (MAP UI)
================================ */
function generateFinalTickets() {
    const results = [];
    let guard = 0;

    while (results.length < 5 && guard < 5000) {
        guard++;

        let nums = [];
        while (nums.length < 6) {
            const r = Math.floor(Math.random() * 55) + 1;
            if (
                !nums.includes(r) &&
                !disabledNumbers.includes(r)
            ) nums.push(r);
        }

        nums.sort((a, b) => a - b);
        const key = nums.join(",");

        if (historyDataStrings.includes(key)) continue;

        results.push(buildTicketObject(nums));
    }

    // 🚨 GIỮ NGUYÊN UI CŨ
    renderSuggestionCards(results);
}

/* ===============================
   BUILD OBJECT FOR UI
================================ */
function buildTicketObject(nums) {
    return {
        tier: calcTier(nums),
        nums: nums,

        hot: nums.filter(n => stats.hot.includes(n)),
        cold: nums.filter(n => stats.cold.includes(n)),
        last: nums.filter(n => db[0]?.nums.includes(n)),
        disabled: nums.filter(n => disabledNumbers.includes(n)),
        power: []
    };
}

/* ===============================
   TIER LOGIC (UI ICON)
================================ */
function calcTier(nums) {
    const hotCount = nums.filter(n => stats.hot.includes(n)).length;
    const coldCount = nums.filter(n => stats.cold.includes(n)).length;

    if (hotCount >= 3) return "DIAMOND";
    if (hotCount === 2) return "GOLD";
    if (coldCount >= 2) return "SAPPHIRE";
    return "RUBY";
}

/* ===============================
   HEAT MAP (UI CŨ)
================================ */
function renderHeatMap() {
    for (let i = 1; i <= 55; i++) {
        const el = document.querySelector(`[data-num="${i}"]`);
        if (!el) continue;

        el.classList.remove("hot", "cold");

        if (stats.hot.includes(i)) el.classList.add("hot");
        else if (stats.cold.includes(i)) el.classList.add("cold");
    }
}

/* ===============================
   TOGGLE NUMBER
================================ */
function toggleNumber(n) {
    if (disabledNumbers.includes(n)) {
        disabledNumbers = disabledNumbers.filter(x => x !== n);
    } else {
        disabledNumbers.push(n);
    }
    renderHeatMap();
}
