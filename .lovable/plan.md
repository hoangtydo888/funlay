
Mục tiêu
- Fix triệt để lỗi “đăng nhập đúng email + mật khẩu nhưng báo Invalid login credentials” (ở cả Preview và domain play.fun.rich), đồng thời đảm bảo người dùng có đường thoát (đặt lại mật khẩu / xác nhận email) ngay trong app, không bị kẹt.

Những gì mình đã kiểm tra và phát hiện (từ log hệ thống)
- Request đăng nhập đang gọi đúng endpoint backend `/auth/v1/token?grant_type=password` và trả về:
  - `{"code":"invalid_credentials","message":"Invalid login credentials"}`
- Điều này xảy ra trên cả Preview và domain riêng (referer trong log có cả play.fun.rich).
- Nghĩa là frontend gửi request được, backend phản hồi 400 “invalid_credentials” (không phải lỗi route/UI).

Kết luận chẩn đoán quan trọng
1) Lỗi “invalid_credentials” thường đến từ 1 trong các nguyên nhân:
   - Email không tồn tại trong hệ thống (tài khoản chưa từng được tạo ở backend này / tạo bằng phương thức khác).
   - Sai mật khẩu (người dùng nhớ nhầm, đổi mật khẩu trước đó, hoặc có khoảng trắng đầu/cuối do copy/paste).
   - Tài khoản bị xóa/đổi email (hiếm hơn).
   - Ít khi là “chưa xác nhận email” (thường backend trả về thông báo “Email not confirmed” hoặc tương tự; hiện log không cho thấy case này).

2) Hiện tại luồng “Quên mật khẩu” trong app đang thiếu phần “Đặt mật khẩu mới”:
   - App có nút “Quên mật khẩu?” và gửi email reset.
   - Nhưng khi người dùng bấm link reset và quay về app, trang /auth hiện chưa có màn hình “Đặt mật khẩu mới”, và còn có nguy cơ tự động navigate về “/” khi session thay đổi.
   - Hậu quả: nếu người dùng bị sai mật khẩu, họ gần như không tự cứu được trong app → dẫn tới “kẹt đăng nhập” hàng loạt.

Giải pháp đề xuất (sẽ triển khai sau khi bạn bấm Approve)
A. Hoàn thiện luồng “Quên mật khẩu” để người dùng tự fix được ngay
1) Nhận diện trạng thái “Password Recovery” khi user bấm link trong email quay về /auth
   - Đọc query/hash params mà backend gửi về sau reset (tuỳ cấu hình).
   - Lắng nghe `onAuthStateChange` và xử lý riêng event `PASSWORD_RECOVERY` (không auto chuyển về trang chủ).
2) Hiển thị form “Đặt mật khẩu mới”
   - Input: mật khẩu mới + xác nhận mật khẩu
   - Kiểm tra tối thiểu 6 ký tự, cảnh báo khoảng trắng đầu/cuối
3) Gọi API cập nhật mật khẩu
   - `supabase.auth.updateUser({ password: newPassword })`
4) UX
   - Thông báo thành công + nút “Đăng nhập lại” hoặc tự chuyển về mode Login.
   - Nếu thất bại: hiển thị lỗi tiếng Việt rõ ràng.

B. Chuẩn hoá dữ liệu nhập để giảm “invalid_credentials” giả (copy/paste lỗi)
1) Email normalization (áp dụng cho Login/Signup/Reset)
   - `emailNormalized = email.trim().toLowerCase()`
2) Cảnh báo “mật khẩu có khoảng trắng đầu/cuối”
   - Không tự trim password (vì đó có thể là mật khẩu thật), nhưng cảnh báo rất rõ và gợi ý xoá khoảng trắng.
3) Thông báo lỗi hướng dẫn hành động
   - Nếu gặp `invalid_credentials`: hiển thị hộp hướng dẫn “Hãy thử đặt lại mật khẩu” + nút chuyển sang Quên mật khẩu (điền sẵn email).

C. Thêm “Gửi lại email xác nhận” (trường hợp user chưa xác nhận email)
- Vì bạn “không chắc” tình trạng xác nhận email, mình sẽ thêm một nhánh UI:
  - Khi backend trả về lỗi chứa “not confirmed” (hoặc code tương ứng), hiển thị nút “Gửi lại email xác nhận”.
  - Gọi `supabase.auth.resend({ type: 'signup', email })` (hoặc API tương đương mà supabase-js hỗ trợ).
- Lưu ý: Mình không bật auto-confirm (vì đây là yêu cầu bảo mật), chỉ giúp user tự resend.

D. Bổ sung logging an toàn để chẩn đoán nhanh (không lộ dữ liệu nhạy cảm)
- Ghi log event auth (không log password) khi xảy ra lỗi:
  - environment (preview/published), event, code/message
- Mục tiêu: lần sau gặp case tương tự, mình xác định được nhanh “not confirmed” vs “invalid credentials” vs “network”.

Phạm vi file dự kiến sẽ chạm (frontend)
- `src/pages/Auth.tsx`
  - Thêm state/UX cho “Set New Password”
  - Chuẩn hoá email + cảnh báo password whitespace
  - Thêm nút “Resend confirmation email” theo lỗi
  - Điều chỉnh `onAuthStateChange` để không redirect sai trong password recovery
- (Nếu cần) tạo component nhỏ để tái sử dụng UI form cho “New password” (tuỳ mức độ gọn code, nhưng sẽ giữ tối giản theo style hiện tại)

Kịch bản test bắt buộc sau khi triển khai
1) Test đăng nhập email/mật khẩu (tài khoản đang bị lỗi)
   - Thử lại với email viết hoa/viết thường, có/không có khoảng trắng đầu/cuối.
2) Test quên mật khẩu end-to-end
   - Bấm “Quên mật khẩu?” → nhận email → bấm link → vào /auth thấy form “Đặt mật khẩu mới” → đặt lại → đăng nhập thành công.
3) Test tài khoản chưa xác nhận email (nếu có)
   - Đăng ký mới → không xác nhận → thử đăng nhập → app hiển thị nút resend → bấm resend → nhận email.
4) Test Google login không bị ảnh hưởng
   - Nút Google vẫn hoạt động bình thường.

Điều mình cần bạn xác nhận thêm (không bắt buộc để làm, nhưng giúp chốt nguyên nhân)
- Tài khoản bị lỗi có thể đăng nhập bằng Google không? (Nếu có cùng email, sẽ cho biết user trước đây dùng phương thức nào).
- Bạn có muốn mình thêm 1 đoạn text hướng dẫn ngay dưới lỗi “Invalid login credentials” rằng “90% do sai mật khẩu hoặc chưa từng đặt mật khẩu, hãy bấm Quên mật khẩu”? (mình sẽ làm rất gọn, không làm rối UI).

Kỳ vọng kết quả
- Dù nguyên nhân gốc là user “nhớ sai mật khẩu” hay “tài khoản trước đây không có password”, sau bản cập nhật này người dùng sẽ tự xử lý được ngay trong app (reset password + đặt mật khẩu mới), giảm 99% ticket “không đăng nhập được”.
