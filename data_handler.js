let historyData = [];
let numberStats = {};
const FILE_NAME = 'data.csv';

// 1. NẠP DỮ LIỆU GỐC TỪ FILE DATA.CSV
function loadLocalData() {
    updateUIStatus("⏳ Đang nạp dữ liệu gốc...", 0);
    Papa.parse(FILE_NAME, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            historyData = results.data.filter(row => {
                let val = row['6 số trúng'] || row['B'] || Object.values(row)[1];
                return val && val.toString().trim().length > 0;
            });
            processStats();
            initMap();
            updateUIStatus("✅ Sẵn sàng", historyData.length);
        },
        error: function() {
            updateUIStatus("⚠️ Không tìm thấy data.csv", 0);
            initMap();
        }
    });
}

// Khởi chạy ngay khi load trang
loadLocalData();

function processStats() {
    numberStats = {};
    const recent = historyData.slice(-200);
    recent.forEach(row => {
        let nums = row['6 số trúng'] || row['B'] || Object.values(row)[1];
        if (nums && typeof nums === 'string') {
            nums.split(' ').forEach(n => {
                let num = parseInt(n);
                if (!isNaN(num)) numberStats[num] = (numberStats[num] || 0) + 1;
            });
        }
    });
}

function updateUIStatus(msg, count) {
    document.getElementById('status').innerText = msg;
    document.getElementById('statInfo').innerText = `Đã nạp ${count} kỳ`;
}

// 2. CẬP NHẬT BẰNG TAY (Dán kết quả vào)
function updateManual() {
    const input = prompt("Dán kết quả mới (Ví dụ: 1245 01 02 03 04 05 06):");
    if (input) {
        const parts = input.split(' ');
        const ky = parts[0];
        const so = parts.slice(1).join(' ');
        
        if (so.split(' ').length >= 6) {
            historyData.unshift({ "Kỳ": ky, "6 số trúng": so });
            processStats();
            initMap();
            updateUIStatus("✅ Đã thêm kỳ " + ky, historyData.length);
            alert("Đã cập nhật kỳ mới thành công!");
        } else {
            alert("Sai định dạng! Hãy nhập: [SốKỳ] [Số1] [Số2]...");
        }
    }
}

// 3. LẤY DỮ LIỆU ONLINE (Chỉ chạy khi bạn nhấn nút)
async function fetchOnlineResults() {
    updateUIStatus("⏳ Đang kết nối Web...", historyData.length);
    try {
        const proxyUrl = "https://api.allorigins.win/get?url=";
        const targetUrl = encodeURIComponent("https://www.ketquadientoan.com/tat-ca-ky-xo-so-power-655.html");
        const response = await fetch(proxyUrl + targetUrl);
        const data = await response.json();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        const rows = doc.querySelectorAll('tr');
        
        let newCount = 0;
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const ky = cells[0].innerText.trim();
                const balls = Array.from(cells[1].querySelectorAll('.ball, span'))
                                   .map(b => b.innerText.trim())
                                   .filter(b => b.length > 0 && !isNaN(b));
                if (balls.length >= 6) {
                    const exists = historyData.some(h => h.Kỳ === ky);
                    if (!exists) {
                        historyData.unshift({ "Kỳ": ky, "6 số trúng": balls.slice(0,6).join(' ') });
                        newCount++;
                    }
                }
            }
        });
        processStats();
        initMap();
        updateUIStatus(`✅ Đã lấy thêm ${newCount} kỳ`, historyData.length);
    } catch (e) {
        updateUIStatus("❌ Lỗi kết nối Web", historyData.length);
        alert("Không thể kết nối internet. Hãy dùng cập nhật bằng tay!");
    }
}
