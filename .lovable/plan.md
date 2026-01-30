
## Mục tiêu
Tìm đúng nguyên nhân vì sao “điền đúng email + mật khẩu” nhưng vẫn báo lỗi và không đăng nhập được, đồng thời sửa triệt để luồng “Quên mật khẩu” để user **bắt buộc đặt mật khẩu mới** (đúng yêu cầu: có form đổi mật khẩu + bắt buộc xác nhận email + gợi ý reset khi sai).

---

## 1) Chẩn đoán từ code hiện tại (nguyên nhân gốc có thể xảy ra)

### A. Luồng “Quên mật khẩu” đang bị thiếu bước “đặt mật khẩu mới”
Trong `src/pages/Auth.tsx`, `onAuthStateChange` đang làm:
- Hễ có `session?.user` là `navigate("/")` ngay.
- Khi user bấm link reset trong email, hệ thống sẽ tạo session (đăng nhập tạm thời để đổi mật khẩu) → app lập tức redirect về `/` → user **không bao giờ được nhập mật khẩu mới**.
Kết quả:
- User “đăng nhập được” sau khi bấm link email (vì có session), nhưng **không biết mật khẩu mới là gì** (và có thể mật khẩu vẫn là mật khẩu cũ hoặc chưa được set đúng cách).
- Lần sau login bằng email+password sẽ dễ báo `Invalid login credentials`.

=> Đây khớp chính xác mô tả của con: “bấm quên mật khẩu thì vào được, nhưng không có mục đổi pass”.

### B. Input email có thể có khoảng trắng ở đầu/cuối (rất hay gặp)
Code hiện tại chỉ dùng `email.trim()` để kiểm tra rỗng, nhưng lúc gọi:
```ts
supabase.auth.signInWithPassword({ email, password })
```
Email **không trim**. Nếu user copy/paste có dấu cách (đầu/cuối) thì:
- User nhìn “đúng email”, nhưng hệ thống nhận “email có space” → sai → `Invalid login credentials`.

=> Đây là một lý do phổ biến tạo cảm giác “điền đúng mà vẫn lỗi”.

### C. Các user cũ có thể thuộc các trạng thái khác nhau
Vì app đã chạy lâu và có nhiều user, có thể có user:
- Đã tạo tài khoản nhưng **chưa confirm email** → sẽ báo “Email not confirmed”.
- Được tạo từ các luồng khác (magic link / provider / import) → có thể không có password “chuẩn”.

Ta sẽ vừa sửa UI/flow, vừa thêm chẩn đoán để phân loại lỗi chính xác, thay vì chỉ show chung chung.

---

## 2) Kế hoạch kiểm tra (để “tìm ra lỗi hiện tại” một cách chắc chắn)

### 2.1. Bổ sung log chẩn đoán ngay tại Auth page (tạm thời trong dev)
Trong `Auth.tsx`:
- Khi submit login: log `emailNormalized` (trim + lowercase) và log mã lỗi trả về từ auth (không log password).
- Khi `onAuthStateChange`: log `event` và có/không có session.

Mục tiêu: xác nhận lỗi user gặp thuộc nhóm nào:
- `invalid_credentials`
- `email_not_confirmed`
- `user_not_found`
- `recovery_session`/redirect sai

### 2.2. Đọc auth logs từ backend (Live)
Tiếp tục kiểm tra logs kiểu `/token` 400 `invalid_credentials` theo thời gian user report, để đối chiếu với hành vi UI.

---

## 3) Kế hoạch sửa triệt để (implementation)

### File sẽ sửa
- `src/pages/Auth.tsx` (chính)
- (Tùy chọn) `src/hooks/useAuth.tsx` nếu đang bị dùng ở nơi khác để auto-redirect làm nhiễu flow recovery, nhưng hiện tại lỗi chủ yếu nằm ở Auth page.

---

## 4) Thiết kế lại flow “Quên mật khẩu” đúng chuẩn

### 4.1. Thêm trạng thái “Đang ở chế độ đặt mật khẩu mới”
Thêm state:
- `resetMode: boolean` (hoặc `showResetPasswordForm`)
- `newPassword`, `confirmPassword`
- `resetTokenDetected` (optional) để xử lý UI khi link reset vừa mở

### 4.2. Bắt event password recovery và chặn redirect về trang chủ
Trong `supabase.auth.onAuthStateChange((event, session) => ...)`:
- Nếu `event === "PASSWORD_RECOVERY"`:
  - set `resetMode = true`
  - set session/user vào state
  - **return sớm** (không navigate `/`)
- Chỉ `navigate("/")` khi:
  - user sign in bình thường (`SIGNED_IN`) và **không ở resetMode**

Ngoài event, cũng parse URL để bắt trường hợp provider trả về dạng query:
- `type=recovery` (hoặc các tham số auth tương tự)
Khi phát hiện `type=recovery`:
- bật `resetMode = true` ngay khi page load.

### 4.3. Thêm form “Đặt mật khẩu mới”
UI:
- 2 ô: “Mật khẩu mới”, “Xác nhận mật khẩu”
- Validate:
  - >= 6 ký tự
  - khớp nhau
- Nút submit gọi:
```ts
await supabase.auth.updateUser({ password: newPassword })
```
Nếu thành công:
- show success message “Đổi mật khẩu thành công”
- clear URL query (optional) để tránh loop
- navigate về `/` (hoặc về login tùy mong muốn; đề xuất về `/auth` và auto chuyển sang login cũng được, nhưng vì user đã có session recovery thì về `/` hợp lý)

---

## 5) Sửa lỗi “điền đúng nhưng vẫn invalid_credentials” do khoảng trắng / chuẩn hóa email

### 5.1. Chuẩn hóa email trước khi gửi đi
Ở cả 3 chỗ:
- login
- signup
- forgot password

Dùng:
- `const emailNormalized = email.trim().toLowerCase();`
Sau đó call auth bằng `emailNormalized`.

Ghi chú:
- Password không nên trim (vì password hợp lệ có thể có space), nhưng ta sẽ:
  - detect nếu password có leading/trailing whitespace (`password !== password.trim()`)
  - hiện cảnh báo nhỏ “Mật khẩu đang có khoảng trắng ở đầu/cuối, hãy kiểm tra lại” (nhiều user “dính” lỗi này khi copy).

---

## 6) “Gợi ý reset khi sai” (đúng yêu cầu của con)
Khi login thất bại và message match `Invalid login credentials`:
- Hiển thị một box nổi bật ngay dưới lỗi:
  - “Có thể bạn đã quên mật khẩu”
  - Button: “Đặt lại mật khẩu”
  - Click → set `forgotPassword = true` và tự điền email đang nhập (nếu có)

---

## 7) Bắt buộc xác nhận email (đúng yêu cầu)
Về phía app:
- Giữ nguyên: nếu lỗi “Email not confirmed” → hiển thị tiếng Việt rõ ràng.
- Sau signup:
  - cập nhật thông báo thành: “Vui lòng mở email để xác nhận trước khi đăng nhập.”
  - không auto-login.

Về phía backend (Lovable Cloud auth setting):
- Xác nhận lại đang bật “require email confirmation”.
- Nếu chưa bật, sẽ bật bằng cấu hình auth (không làm trong plan mode; sẽ làm khi implement).

---

## 8) Kiểm thử end-to-end (bắt buộc để chắc chắn hết lỗi)
Kịch bản test tối thiểu:

1) User mới:
- Signup → nhận mail confirm → confirm → login bằng password vừa đặt → OK

2) User cũ quên mật khẩu:
- Vào /auth → bấm “Quên mật khẩu” → nhận email → bấm link →
  - Phải vào đúng /auth và hiển thị form “Đặt mật khẩu mới”
  - Đặt mật khẩu mới → logout → login lại bằng mật khẩu mới → OK

3) Case khoảng trắng:
- Email có space đầu/cuối → login phải vẫn OK (vì email trim)
- Password có space đầu/cuối → app cảnh báo rõ, user sửa và login OK

4) Case chưa confirm email:
- Login → báo đúng “Email chưa được xác nhận” + hướng dẫn kiểm tra inbox/spam

---

## 9) Tiêu chí hoàn thành
- User bấm link reset password luôn thấy form đổi mật khẩu (không bị đá về trang chủ trước).
- Tỷ lệ `invalid_credentials` giảm rõ rệt do email được chuẩn hóa.
- UX “gợi ý reset khi sai” hoạt động và giúp user tự xử lý.
- Không phá luồng thưởng signup hiện tại (awardSignupReward) và không gây double navigate.

---

## Những thay đổi dự kiến (tóm tắt)
- `Auth.tsx`:
  - Thêm reset password mode + form đổi pass
  - Xử lý event `PASSWORD_RECOVERY` + parse URL `type=recovery`
  - Chuẩn hóa email khi login/signup/forgot
  - Cảnh báo password có khoảng trắng đầu/cuối
  - Hiển thị gợi ý reset khi login sai
  - Điều chỉnh điều kiện `navigate("/")` để không chặn flow recovery
