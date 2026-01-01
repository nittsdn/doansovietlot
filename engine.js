let db = [];
let stats = { hot: [], cold: [], gap: [] };
let disabledNumbers = [];

const CSV_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv";

/* ================= LOAD CSV ================= */

async function loadData() {
    console.log("⏳ Loading CSV...");

    const res = await fetch(CSV_URL + "&_=" + Date.now());
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);

    db = [];

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (!row || row.length < 10) continue;

        const nums = [
            +row[1], +row[2], +row[3],
            +row[4], +row[5], +row[6]
        ].sort((a, b) => a - b);

        const pwr = +row[7];
        const date = row[8];
        const j1 = Number(row[9].replace(/\D/g, ""));

        if (nums.some(isNaN) || isNaN(pwr)) continue;

        db.push({
            nums,
            pwr,
            date,
            j1
        });
    }

    // ❗ CSV từ cũ → mới, engine dùng db[0] là kỳ mới nhất
    db.reverse();

    console.log("✅ Loaded", db.length, "draws");
    console.log("Latest:", db[0]);

    analyzeData();
    renderHeaderInfo();
    renderMap();
}

/* ================= CSV PARSER ================= */

function parseCSVLine(line) {
    const result = [];
    let current = "";
    let insideQuote = false;

    for (let i = 0; i < line.length; i++) {
        const c = line[i];

        if (c === '"' ) {
            insideQuote = !insideQuote;
        } else if (c === "," && !insideQuote) {
            result.push(current.trim());
            current = "";
        } else {
            current += c;
        }
    }
    result.push(current.trim());
    return result;
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", loadData);
