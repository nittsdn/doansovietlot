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
