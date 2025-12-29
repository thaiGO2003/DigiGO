# DigiGOVN

Hệ thống thương mại điện tử DigiGOVN - Nền tảng mua sắm sản phẩm số tự động.

## Tính năng

### Người dùng (Khách hàng)
- **Xem danh sách sản phẩm**: Hiển thị sản phẩm theo dạng lưới với hình ảnh, giá và mô tả.
- **Tìm kiếm & Lọc**: Tìm kiếm theo tên, lọc theo danh mục (Phần mềm, Game, Giáo dục), loại (Key, Email, Gói) và khoảng giá.
- **Trạng thái kho hàng**:
  - Hiển thị số lượng còn lại.
  - Cảnh báo "Sắp hết hàng" khi số lượng < 10.
  - Trạng thái "Tạm hết hàng" và vô hiệu hóa nút mua khi số lượng = 0.
- **Mua hàng**:
  - Yêu cầu đăng nhập để mua.
  - Trừ tiền trực tiếp vào số dư tài khoản.
  - Tự động cập nhật số lượng tồn kho sau khi mua.
  - Giá được tính theo hệ thống giảm giá (rank + giới thiệu), tối đa 20%.
- **Tài khoản**:
  - Đăng ký / Đăng nhập.
  - Xem thông tin cá nhân và số dư.
  - Cập nhật thông tin cá nhân (Họ tên).
  - Xem lịch sử mua hàng.
- **Hệ thống Rank theo số tiền nạp**:
  - **Đồng**: 0 - 500K (không giảm giá)
  - **Bạc**: 500K - 1 triệu (giảm giá 2%)
  - **Vàng**: 1 - 2 triệu (giảm giá 4%)
  - **Platinum**: 2 - 3 triệu (giảm giá 6%)
  - **Kim cương**: 3 - 5 triệu (giảm giá 10%)
  - **Kim cương+**: Trên 5 triệu (giảm giá 10%)
- **Hệ thống giảm giá giới thiệu**:
  - Giảm 1% cho mỗi người giới thiệu (tối đa 10%)
  - Cả người giới thiệu và người được giới thiệu đều được giảm 1%
  - Tổng giảm giá tối đa: 20% (10% từ rank + 10% từ giới thiệu)
- **Hỗ trợ**:
  - Chat trực tuyến với Admin.
  - Tham gia nhóm Zalo hỗ trợ.

### Quản trị viên (Admin)
- **Quản lý sản phẩm**: Thêm, sửa, xóa sản phẩm (bao gồm cả số lượng và thời hạn).
- **Quản lý người dùng**: Xem danh sách người dùng, số dư, tổng tiền nạp, hạng và ngày đăng ký.
- **Điều chỉnh số dư**: Admin có thể nạp/tiền cho người dùng, tự động cập nhật tổng tiền nạp và hạng.
- **Hệ thống rank tự động**: Rank được cập nhật tự động dựa trên tổng tiền nạp (không cần set thủ công).
- **Hỗ trợ khách hàng**: Chat trực tiếp với người dùng qua giao diện Admin.

## 🛠️ Công nghệ sử dụng

- **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (Icons)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime)

## ⚙️ Cài đặt và Chạy dự án

### Yêu cầu tiên quyết
- [Node.js](https://nodejs.org/) (Phiên bản 16 trở lên)
- Tài khoản Supabase để thiết lập cơ sở dữ liệu.

### Các bước cài đặt

1.  **Clone dự án**
    ```bash
    git clone https://github.com/your-username/digigo.git
    cd digigo
    ```

2.  **Cài đặt dependencies**
    ```bash
    npm install
    ```

3.  **Cấu hình biến môi trường**
    Tạo file `.env` tại thư mục gốc và điền thông tin Supabase của bạn:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Chạy Database Migrations**
    Chạy các file SQL trong thư mục `supabase/migrations` trên SQL Editor của Supabase để tạo bảng và trigger cần thiết.

5.  **Chạy server phát triển**
    ```bash
    npm run dev
    ```
    Truy cập `http://localhost:5173` để xem ứng dụng.

## 🗃️ Cấu trúc thư mục

```
digigo/
├── src/
│   ├── components/      # Các component React (Header, ProductsPage, AdminPage,...)
│   ├── hooks/           # Custom hooks (useAuth,...)
│   ├── lib/             # Cấu hình Supabase và các hàm tiện ích
│   ├── App.tsx          # Component chính và routing
│   └── main.tsx         # Điểm khởi chạy ứng dụng
├── supabase/
│   └── migrations/      # Các file SQL để khởi tạo database
├── .env                 # Biến môi trường (không push lên git)
├── .gitignore           # Các file bỏ qua khi git commit
├── package.json         # Khai báo dependencies và scripts
├── tailwind.config.js   # Cấu hình Tailwind CSS
└── vite.config.ts       # Cấu hình Vite
```

## 📝 Ghi chú
- Tài khoản Admin mặc định được cấu hình trong code hoặc database (ví dụ: `luongquocthai.thaigo.2003@gmail.com`).
- Hệ thống sử dụng Realtime của Supabase cho tính năng Chat.

## 🤝 Đóng góp
Mọi đóng góp đều được hoan nghênh. Vui lòng tạo Pull Request hoặc Issue để đóng góp ý kiến.

## 📄 Giấy phép
Dự án này được phân phối dưới giấy phép MIT.
