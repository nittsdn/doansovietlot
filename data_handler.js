let historyData = [];
let numberStats = {};
const FILE_NAME = 'p655v3.xlsx - Sheet1.csv';

// 1. Nạp từ CSV mặc định
Papa.parse(FILE_NAME, {
    download: true,
    header: true,
    complete: function(results) {
        historyData = results.data.filter(row => row['6 số trúng'] || Object.values(row)[1]);
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
    numberStats = {};
    const recent = historyData.slice(-200);
    recent.forEach(row => {
        let nums = row['6 số trúng'] || Object.values(row)[1];
        if (nums && typeof nums === 'string') {
            nums.split(' ').forEach(n => {
                let num = parseInt(n);
                if (!isNaN(num)) numberStats[num] = (numberStats[num] || 0) + 1;
            });
        }
    });
}

function updateUIStatus(msg, count) {
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.innerText = msg;
    const infoEl = document.getElementById('statInfo');
    if (infoEl) infoEl.innerText = `Đã nạp ${count} kỳ`;
}

// 2. Quét số từ Web (Sửa lỗi kết nối)
async function fetchOnlineResults() {
    updateUIStatus("⏳ Đang thử kết nối dự phòng...", historyData.length);
    
    // Thử dùng Proxy dự phòng nếu AllOrigins lỗi
    const proxyUrls = [
        "https://api.allorigins.win/get?url=",
        "https://corsproxy.io/?"
    ];
    
    const targetUrl = "https://www.ketquadientoan.com/tat-ca-ky-xo-so-power-655.html";
    let success = false;

    for (let proxy of proxyUrls) {
        try {
            const finalUrl = proxy === "https://corsproxy.io/?" ? `${proxy}${targetUrl}` : `${proxy}${encodeURIComponent(targetUrl)}`;
            const response = await fetch(finalUrl);
            const data = await response.json();
            const html = data.contents || data; // Tùy cấu trúc proxy trả về

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
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
                // Hợp nhất dữ liệu
                historyData = [...onlineRecords, ...historyData];
                historyData = Array.from(new Set(historyData.map(a => a.Kỳ))).map(k => historyData.find(a => a.Kỳ === k));
                processStats();
                initMap();
                updateUIStatus("✅ Đã cập nhật từ Web", historyData.length);
                success = true;
                break; // Thành công thì thoát vòng lặp proxy
            }
        } catch (e) {
            console.log("Thử proxy tiếp theo...");
        }
    }

    if (!success) {
        updateUIStatus("❌ Web lỗi - Dùng tạm file CSV", historyData.length);
    }
}
