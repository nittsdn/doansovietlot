let historyData = [];
let numberStats = {};
const FILE_NAME = 'p655v3.xlsx - Sheet1.csv'; // Khớp với file của bạn

// 1. Nạp từ CSV mặc định
Papa.parse(FILE_NAME, {
    download: true,
    header: true,
    complete: function(results) {
        historyData = results.data;
        processStats();
        initMap();
        updateUIStatus("✅ Dữ liệu V3 Sẵn sàng", historyData.length);
    },
    error: function() {
        updateUIStatus("⚠️ Không thấy file CSV", 0);
        initMap();
    }
});

function processStats() {
    numberStats = {}; // Reset
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

// 2. Quét số từ ketquadientoan.com
async function fetchOnlineResults() {
    updateUIStatus("⏳ Đang quét Web...", historyData.length);
    const proxyUrl = "https://api.allorigins.win/get?url=";
    const targetUrl = encodeURIComponent("https://www.ketquadientoan.com/tat-ca-ky-xo-so-power-655.html");

    try {
        const response = await fetch(proxyUrl + targetUrl);
        const data = await response.json();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        const rows = doc.querySelectorAll('tr');
        
        let onlineRecords = [];
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const ky = cells[0].innerText.trim();
                const balls = Array.from(cells[1].querySelectorAll('.ball, span'))
                                   .map(b => b.innerText.trim())
                                   .filter(b => b.length > 0 && !isNaN(b));
                if (balls.length >= 6) {
                    onlineRecords.push({ "Kỳ": ky, "6 số trúng": balls.slice(0,6).join(' ') });
                }
            }
        });

        if (onlineRecords.length > 0) {
            historyData = [...onlineRecords, ...historyData];
            // Lọc trùng kỳ
            historyData = Array.from(new Set(historyData.map(a => a.Kỳ))).map(k => historyData.find(a => a.Kỳ === k));
            processStats();
            initMap();
            updateUIStatus("✅ Cập nhật Web thành công", historyData.length);
        }
    } catch (e) {
        updateUIStatus("❌ Lỗi kết nối Web", historyData.length);
    }
}
