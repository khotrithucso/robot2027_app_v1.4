# Robot 2027 Companion • Phiên bản V1.4 (Full Native Kiosk + Karaoke + ESP32 BLE)

## Tổng hợp toàn bộ nâng cấp & bản vá từ V1.3 lên V1.4
1. **Sửa lỗi Build GitHub Actions & Nâng chuẩn Android SDK 35:**
   - Vá triệt để lỗi cú pháp Java tại dòng 498 (`replace("\"", "")`) trong `RobotNativePlugin.java`.
   - Cấu hình sẵn `compileSdkVersion = 35`, `targetSdkVersion = 35`, Node.js 22 và Java 21 (không còn cảnh báo deprecated).
2. **Sửa triệt để Mini-Player YouTube & Khóa thoát trình duyệt ngoài:**
   - Tự động bung đầy đủ khung hình khi quay về tab `YouTube` (hết lỗi màn hình đen).
   - Tự động ẩn khi mở tab `Setting` để không che nút `Cấu Hình Địa Chỉ Server API`.
   - Bổ sung nút phóng to (`⤢`) và nút tắt (`✕`) ngay trên khung video thu nhỏ.
3. **Sửa lỗi `Wi-Fi: <unknown ssid>` & Hiển thị IP LAN:**
   - Xin quyền Vị trí (`ACCESS_FINE_LOCATION`) ngay khi khởi động và hiển thị kèm địa chỉ IP nội bộ (`192.168.x.x`) trên thanh trạng thái tab `Setting`.
4. **Học Tiếng Anh Karaoke Chấm Điểm Phát Âm & Sổ Học Offline:**
   - Tích hợp sẵn 8 chủ đề tiếng Anh offline + nút **Đồng bộ 32 gói Server** từ `https://khotrithucso.io.vn/robot2027_2_4/api.php`.
   - Mắt Robot tự động thu gọn nhường chỗ cho bảng học Karaoke tô sáng từng từ, chấm điểm phát âm qua **Zero-Beep Mic**, nghe lại giọng mẫu hoặc giọng bé vừa đọc, và thưởng **+1 ★** đổi giờ xem YouTube/Game.
5. **Khóa PIN Phụ Huynh (4 số) & Kết nối 4 Nút Cứng ESP32 BLE:**
   - Tab `Setting` được bảo vệ bằng mã PIN (mặc định `1234`), hỗ trợ chỉnh độ sáng màn hình thật, âm lượng hệ thống thật và giao tiếp 2 chiều với mạch ESP32.

## Hướng dẫn đưa lên GitHub để Build APK V1.4
- **Nếu upload trực tiếp lên GitHub Web / Git CLI:** Giải nén `robot2027-app-v1.4-complete.zip` và đẩy toàn bộ lên repository (đã có sẵn `.github/workflows/build-apk.yml`).
- **Nếu import ZIP qua Spck Editor trên điện thoại:** Spck bỏ qua thư mục ẩn `.github/`, bạn chỉ cần tạo thư mục `.github/workflows/` và chép nội dung từ file `github_workflow_backup/build-apk.yml` vào `.github/workflows/build-apk.yml` rồi bấm **Commit & Push**.
