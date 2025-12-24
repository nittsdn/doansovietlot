let historyData = [];
let numberStats = {};
const FILE_NAME = 'data.csv';

Papa.parse(FILE_NAME, {
    download: true,
    header: true,
    complete: function(results) {
        historyData = results.data;
        // Logic tính Hot/Cold
        historyData.slice(-200).forEach(row => {
            let nums = row['B'] || Object.values(row)[1];
            if (nums) nums.split(' ').forEach(n => {
                let num = parseInt(n);
                numberStats[num] = (numberStats[num] || 0) + 1;
            });
        });
        document.getElementById('status').innerText = "✅ V3 Ready";
        initMap();
    }
});
async function fetchOnlineResults() {
    const statusEl = document.getElementById('status');
    statusEl.innerText = "⏳ Đang kết nối tới ketquadientoan.com...";

    // Sử dụng proxy AllOrigins để lách luật bảo mật CORS
    const proxyUrl = "https://api.allorigins.win/get?url=";
    const targetUrl = encodeURIComponent("https://www.ketquadientoan.com/tat-ca-ky-xo-so-power-655.html");

    try {
        const response = await fetch(proxyUrl + targetUrl);
        const data = await response.json();
        const html = data.contents;
        
        // Dùng DOMParser để "mổ xẻ" mã HTML của trang web
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Tìm các hàng dữ liệu trong bảng kết quả
        const rows = doc.querySelectorAll('tr'); 
        let newRecords = [];

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const ky = cells[0].innerText.trim();
                // Tìm các quả bóng số (thường nằm trong thẻ span hoặc class cụ thể)
                const numbers = Array.from(cells[1].querySelectorAll('.ball'))
                                     .map(b => b.innerText.trim())
                                     .join(' ');
                
                if (ky && numbers.length > 10) {
                    newRecords.push({ "Kỳ": ky, "6 số trúng": numbers });
                }
            }
        });

        if (newRecords.length > 0) {
            // Trộn dữ liệu mới quét được vào dữ liệu cũ từ CSV
            historyData = [...newRecords, ...historyData]; 
            // Loại bỏ trùng lặp kỳ
            historyData = Array.from(new Set(historyData.map(a => a.Kỳ)))
                               .map(ky => historyData.find(a => a.Kỳ === ky));
            
            processStats(); // Tính toán lại Hot/Cold ngay lập tức
            statusEl.innerText = `✅ Đã cập nhật xong! (Tổng ${historyData.length} kỳ)`;
            initMap(); // Vẽ lại bản đồ với dữ liệu mới nhất
        }
    } catch (error) {
        console.error(error);
        statusEl.innerText = "❌ Lỗi quét dữ liệu trực tuyến!";
    }
}
