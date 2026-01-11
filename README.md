# Vietlott Pro V6 - Gem Edition 💎

Ứng dụng phân tích và dự đoán số Vietlott Power 6/55 với công nghệ AI và thuật toán thống kê nâng cao.

## ✨ Tính năng

- 🗺️ **Bản đồ nhiệt**: Hiển thị trực quan các số nóng, lạnh, và số kỳ trước
- 💎 **5 Chiến lược Gem**:
  - **Ruby**: Tập trung vào số nóng, linh hoạt với tổng và chẵn/lẻ
  - **Sapphire**: Kết hợp số lạnh với phân tích gan
  - **Gold**: Cân bằng tối ưu với tổng và chẵn/lẻ chính xác
  - **Diamond**: Chiến lược chặt chẽ nhất với yêu cầu cao
  - **Emerald**: Tự do và ngẫu nhiên
- ⚡ **Phân tích thông minh**: Dựa trên 1288+ kỳ quay lịch sử
- 🎯 **Lọc thông minh**: 
  - Kiểm tra tổng hợp lý (90-240)
  - Cân bằng chẵn/lẻ
  - Tránh chuỗi liên tiếp dài
  - Phân bổ theo vùng (thấp/trung/cao)
  - Tránh trùng lịch sử
- 📱 **Giao diện iOS**: Thiết kế hiện đại, mượt mà
- 🔄 **Dữ liệu realtime**: Cập nhật tự động từ Google Sheets

## 🚀 Sử dụng

### Online
Truy cập trực tiếp: [https://nittsdn.github.io/doansovietlot/](https://nittsdn.github.io/doansovietlot/)

### Local
```bash
# Clone repository
git clone https://github.com/nittsdn/doansovietlot.git
cd doansovietlot

# Chạy web server đơn giản
python -m http.server 8080
# hoặc
npx serve

# Mở trình duyệt tại http://localhost:8080
```

## 📖 Hướng dẫn

1. **Xem bản đồ nhiệt**: Các ô số được tô màu theo trạng thái
   - 🔴 Đỏ: Số nóng (xuất hiện nhiều)
   - 🔵 Xanh: Số lạnh (lâu không xuất hiện)
   - 🟡 Vàng: Số kỳ trước
   - ⚡ Lightning: Số Power

2. **Tắt/Mở số**: Bấm vào ô số để loại trừ hoặc bật lại

3. **Sinh số**: Bấm nút "✨ PHÂN TÍCH & SINH SỐ" để tạo 5 bộ số theo các chiến lược khác nhau

4. **Copy số**: Bấm biểu tượng copy để sao chép từng dòng hoặc "Copy Tất Cả"

## 🛠️ Công nghệ

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Design**: iOS-inspired UI/UX
- **Data**: Google Sheets API (CSV export)
- **Algorithms**: 
  - Statistical analysis (frequency, gan index)
  - Pair correlation detection
  - Pattern filtering
  - Smart number generation

## 📊 Thuật toán

### Phân tích dữ liệu
- Tần suất xuất hiện (Hot/Cold numbers)
- Chỉ số Gan (khoảng cách từ kỳ gần nhất)
- Phân tích cặp số (Top 50 pairs)
- Thống kê tổng, chẵn/lẻ, phân bổ vùng

### Chiến lược Gem
Mỗi chiến lược có độ chặt chẽ khác nhau:
- **Ruby**: Linh hoạt nhất, nhiều số nóng
- **Diamond**: Chặt chẽ nhất, yêu cầu cao về cặp và cân bằng
- **Gold**: Cân bằng hoàn hảo
- **Sapphire**: Tập trung số lạnh
- **Emerald**: Ngẫu nhiên, không filter

## ⚠️ Lưu ý

- Ứng dụng chỉ mang tính chất tham khảo và giải trí
- Không đảm bảo trúng số
- Chơi có trách nhiệm

## 📝 License

MIT License - Xem file LICENSE để biết thêm chi tiết

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng tạo Issue hoặc Pull Request.

---

Made with ❤️ for Vietlott players
