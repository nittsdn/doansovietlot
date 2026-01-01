/***********************
 * CONFIG
 ***********************/
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv";

const TOTAL_NUMBERS = 55;
const PICK_COUNT = 6;
const GENERATE_COUNT = 5;

/***********************
 * GLOBAL STATE
 ***********************/
let rawWorksheet = [];
let data = [];              // normalized data (engine cũ dùng)
let disabledNumbers = new Set();

/***********************
 * LOAD CSV
 ***********************/
async function loadData() {
  try {
    setStatus("Đang tải...", false);

    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Fetch failed");

    const text = await res.text();
    rawWorksheet = parseCSV(text);

    data = normalizeWorksheet(rawWorksheet);

    if (!data.length) throw new Error("No valid rows");

    renderHeatMap();
    renderLastDraw();
    setStatus("Sẵn sàng", true);
  } catch (e) {
    console.error(e);
    setStatus("Lỗi tải dữ liệu", false);
  }
}

/***********************
 * CSV PARSER
 ***********************/
function parseCSV(text) {
  return text
    .tri
