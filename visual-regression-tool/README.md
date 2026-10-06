# CÔNG CỤ TỰ ĐỘNG KIỂM THỬ HỒI QUY GIAO DIỆN TRỰC QUAN CHO ỨNG DỤNG WEB
## (AUTOMATED VISUAL REGRESSION TESTING TOOL)

> **Đồ án môn học:** Đánh giá và Kiểm định Chất lượng Phần mềm (Software Quality Assurance & Testing)  
> **Phương pháp tiếp cận:** Kiểm thử hộp đen giao diện người dùng (Black-box GUI Testing) & Thị giác máy tính (Computer Vision)  
> **Ngăn xếp công nghệ:** Python 3.10+, FastAPI, Playwright (Headless Chromium), OpenCV, scikit-image, Pillow, React (Vite), Tailwind CSS.

---

## 1. CƠ SỞ LÝ THUYẾT MÔN HỌC (THEORETICAL FOUNDATION)

### 1.1. Kiểm thử hồi quy giao diện (Visual Regression Testing)
Trong quy trình phát triển phần mềm hiện đại (CI/CD), mỗi khi mã nguồn (HTML/CSS/JS) hoặc dependencies được cập nhật, nguy cơ phát sinh **lỗi hồi quy (Regression Bugs)** là rất cao: vỡ bố cục (layout shift), tràn phần tử (overflow), sai lệch mã màu thương hiệu, thụt thò khoảng cách lề (`margin`/`padding`), hoặc chồng lấn phông chữ.

Kiểm thử chức năng truyền thống (như Selenium / Cypress kiểm tra `click()`, `assert text == "..."`) **hoàn toàn bất lực** trước các lỗi hiển thị vì phần tử vẫn tồn tại trong DOM nhưng bị vỡ nát trên màn hình người dùng. Công cụ này giải quyết triệt để bài toán trên bằng cách so sánh trực quan từng điểm ảnh giữa phiên bản chuẩn (**Baseline**) và phiên bản hiện tại (**Current**).

### 1.2. Sai số Loại I & Sai số Loại II (False Positives & False Negatives)
| Khái niệm | Ý nghĩa trong Kiểm thử Giao diện | Nguyên nhân & Hậu quả | Giải pháp kỹ thuật của Hệ thống |
| :--- | :--- | :--- | :--- |
| **Sai số Loại I (False Positive / Báo động giả)** | Hệ thống báo **FAILED** dù giao diện thực tế người dùng không bị hỏng (Test Flakiness). | Do con trỏ nhấp nháy, CSS animation, tải phông trễ nửa chu kỳ, hoặc đồng hồ thời gian thực (`timestamp`). Làm suy giảm niềm tin vào bộ test tự động. | **Engine Khử Nhiễu (Anti-Flakiness):** Tiêm CSS triệt tiêu hiệu ứng chuyển động, chờ `document.fonts.ready`, chờ `networkidle`, và áp dụng cơ chế **Masking (Che vùng động)**. |
| **Sai số Loại II (False Negative / Bỏ sót lỗi)** | Giao diện bị vỡ/lệch nhưng hệ thống lại báo **PASSED**. | Ngưỡng dung sai (Threshold) đặt quá lỏng, hoặc thuật toán so sánh bỏ qua các vùng bị thay đổi màu. | Kết hợp **Perceptual Diff ($\gamma = 0.1$)** và chỉ số cấu trúc **SSIM**, khoanh vùng lỗi qua **OpenCV Bounding Box**. |

---

## 2. KIẾN TRÚC HỆ THỐNG VÀ CÁC MODULE CỐT LÕI

```text
visual-regression-tool/
├── backend/
│   ├── app/
│   │   ├── api/                 # FastAPI REST Endpoints (suites, runs)
│   │   ├── core/                # Config, Logger, Viewport Presets & Anti-flakiness CSS
│   │   ├── models/              # Pydantic v2 schemas & DTOs
│   │   ├── services/
│   │   │   ├── browser_engine.py    # Playwright Async API, Multi-viewport, Anti-flakiness & Masking
│   │   │   ├── diff_engine.py       # Perceptual Diff, Anti-Aliasing filter, SSIM, Bounding Box
│   │   │   ├── reporter.py          # Báo cáo JSON & Standalone HTML
│   │   │   └── storage_manager.py   # Quản lý vòng đời Baseline và lưu trữ ảnh
│   │   └── main.py              # FastAPI Application Entry
│   ├── demo_sites/              # Trang web mẫu v1.0 (Baseline) và v2.0 (Lỗi hồi quy)
│   ├── storage/                 # Kho lưu ảnh: baselines/, currents/, diffs/
│   ├── requirements.txt
│   ├── test_engines.py          # Script kiểm thử độc lập cho Browser & Diff Engine
│   └── run.py                   # Script khởi chạy Backend
├── frontend/
│   ├── src/
│   │   ├── components/          # TestRunnerForm, DiffViewer, ImageSlider, MetricsCard
│   │   ├── services/            # API client kết nối Backend
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

### Module 1: Browser Capture & Anti-Flakiness Engine (`browser_engine.py`)
1. **Đa độ phân giải Responsive (Viewports):**
   - **Desktop:** `1920 × 1080` (1080p chuẩn)
   - **Tablet:** `768 × 1024` (iPad Portrait, touch-enabled)
   - **Mobile:** `375 × 812` (iPhone SE/X Portrait, mobile emulation)
2. **Khử nhiễu (Anti-Flakiness Injection):**
   - Tiêm CSS chặn toàn bộ animation, transition, caret-color:
     ```css
     *, *::before, *::after {
         transition: none !important;
         animation: none !important;
         caret-color: transparent !important;
         scroll-behavior: auto !important;
     }
     ```
   - Đồng bộ phông chữ: Chờ Promise `document.fonts.ready` giải quyết xong trước khi render.
   - Đồng bộ trạng thái mạng: Chờ trạng thái `networkidle` (với timeout fallback chống treo nếu trang có socket ngầm).
3. **Cơ chế Masking (Che vùng động):**
   - Nhận danh sách CSS Selectors (ví dụ `.timestamp`, `.ads`, `.counter`).
   - Tự động bôi đen hoặc ẩn hoàn toàn nội dung trước khi chụp để giữ nguyên kích thước layout nhưng loại bỏ thay đổi nội dung động.

### Module 2: Image Comparison & Analytics Engine (`diff_engine.py`)
1. **Tự động chuẩn hóa kích thước (Canvas Auto-Padding):**
   - Nếu chiều cao của hai trang web lệch nhau do nội dung thêm bớt (ví dụ $768\times 1278$ vs $768\times 1281$), hệ thống tự động tạo canvas mở rộng với kích thước $\max(W_1, W_2) \times \max(H_1, H_2)$ và đệm nền trung tính `(245, 245, 245)`.
2. **Giải thuật So khớp Điểm ảnh Tri giác (Perceptual Diff):**
   - Tính khoảng cách Euclidean màu sắc chuẩn hóa giữa hai pixel:
     $$\Delta E = \frac{\sqrt{(R_1 - R_2)^2 + (G_1 - G_2)^2 + (B_1 - B_2)^2}}{\sqrt{255^2 \times 3}}$$
   - So sánh với ngưỡng dung sai $\gamma \approx 0.1$.
3. **Bộ lọc khử sai số làm mịn chữ (Anti-Aliasing Detection):**
   - Phân tích vùng lân cận $3 \times 3$ quanh pixel lệch. Nếu độ tương phản cục bộ cao và giá trị pixel nằm ở dải trung gian (nội suy vi mô giữa chữ và nền), pixel đó được xác định là kết quả khử răng cưa và **không tính là lỗi giao diện**.
4. **Chỉ số Tương đồng Cấu trúc (SSIM - Structural Similarity Index):**
   - Đánh giá hình khối, độ tương phản và độ sáng theo chuẩn thuật toán của Wang et al. (thang điểm $0.0 \to 1.0$).
5. **Gom cụm Bounding Box (Phát hiện vùng khiếm khuyết):**
   - Dùng phép toán hình thái học `cv2.dilate` để liên kết các pixel lỗi rời rạc thành một khối thống nhất (nút bấm, khối văn bản).
   - Dùng `cv2.findContours` và `cv2.boundingRect` để xuất tọa độ $[X, Y, W, H]$ của từng vùng lỗi.
6. **Đánh giá Pass/Fail:**
   $$\text{Diff Ratio} = \left(\frac{N_{\text{diff\_pixels}}}{N_{\text{total\_pixels}}}\right) \times 100\%$$
   - Nếu $\text{Diff Ratio} \le \text{Threshold}$ (mặc định $0.05\%$) $\to$ **PASSED**, ngược lại $\to$ **FAILED**.

---

## 3. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY HỆ THỐNG

### Bước 1: Chuẩn bị môi trường Python & Playwright
```bash
# 1. Di chuyển vào thư mục backend
cd visual-regression-tool/backend

# 2. Cài đặt các thư viện Python
pip install -r requirements.txt

# 3. Cài đặt trình duyệt Chromium cho Playwright
python -m playwright install chromium
```

### Bước 2: Kiểm thử độc lập Core Engines (Verification Test)
Chạy script kiểm tra tự động cả Browser Capture và Diff Engine trên 2 trang web mẫu (v1 vs v2):
```bash
python test_engines.py
```
*Kết quả in ra console sẽ chứng minh khả năng chụp 3 viewports, bắt timeout ngoại lệ, tính toán SSIM, phát hiện 19+ cụm bounding box và vượt qua test so khớp ảnh giống nhau.*

### Bước 3: Khởi chạy Máy chủ Backend (FastAPI)
```bash
python run.py
```
- Máy chủ khởi động tại: `http://localhost:8000`
- Tài liệu API tương tác (Swagger UI): `http://localhost:8000/docs`
- Trang web mẫu v1.0 (Baseline): `http://localhost:8000/demo/v1_baseline/index.html`
- Trang web mẫu v2.0 (Regression Bug): `http://localhost:8000/demo/v2_regression/index.html`

### Bước 4: Mở Giao diện Web Dashboard (React Frontend)
Vì mã nguồn Frontend đã được đóng gói trực tiếp vào thư mục `dist`, khi chạy `python run.py`, bạn có thể mở ngay trình duyệt và truy cập:
👉 **`http://localhost:8000`**

*(Tùy chọn: Nếu muốn phát triển Frontend với Hot-Reload):*
```bash
cd visual-regression-tool/frontend
npm run dev
# Mở http://localhost:5173
```

---

## 4. QUY TRÌNH KIỂM THỬ CHUẨN 3 BƯỚC (STANDARD VISUAL QA WORKFLOW)

Hệ thống hỗ trợ 2 nút bấm thao tác tách biệt hoàn toàn theo chuẩn công nghiệp (tương tự Percy / BackstopJS):

1. **Bước 1: Chụp Ảnh Gốc (Capture Baseline)**
   - Nhập URL phiên bản gốc ổn định (ví dụ `http://localhost:8000/demo/v1_baseline/index.html`).
   - Bấm nút **"Chụp Ảnh Gốc (Capture Baseline)"** màu xanh ngọc.
   - Trình duyệt Playwright sẽ mở ngầm và chụp full-page 3 viewports: Desktop (1920x1080), Tablet (768x1024), Mobile (375x812).
   - Khung **Bộ Ảnh Chuẩn Baseline Đã Lưu** xuất hiện cho phép QA xem trước ảnh chuẩn.

2. **Bước 2: Kích Hoạt Phiên Kiểm Thử So Khớp (Run Test)**
   - Nhập URL phiên bản mới vừa sửa đổi (ví dụ `http://localhost:8000/demo/v2_regression/index.html`).
   - Bấm nút **"Kích Hoạt Phiên Kiểm Thử"**.
   - Hệ thống tự động so sánh bản mới với bộ ảnh Baseline đã lưu ở Bước 1, phát hiện các sai khác pixel, chấm điểm SSIM và khoanh vùng lỗi.

3. **Bước 3: Duyệt Chuẩn Mới (Approve Baseline)**
   - Nếu sự thay đổi giao diện là do tính năng mới được thiết kế lại (intentional UI update), bấm nút **"Duyệt làm Baseline"** để thăng cấp ảnh mới thành Baseline cho các chu kỳ sau.

---

## 5. KỊCH BẢN DEMO BẢO VỆ ĐỒ ÁN (DEMO WALKTHROUGH)

Khi trình bày với Hội đồng hoặc Giảng viên, bạn có thể thực hiện theo các bước sau để đạt điểm tối đa:

1. **Bước 1: Trình diễn Chụp Baseline (Capture Baseline)**
   - Mở Dashboard tại `http://localhost:8000`.
   - Bấm **"Gán Demo v1.0 (Baseline)"**.
   - Bấm nút xanh **"Chụp Ảnh Gốc (Capture Baseline)"** &rarr; Xem các ảnh Desktop, Tablet, Mobile chuẩn vừa chụp.

2. **Bước 2: Trình diễn Phát hiện Lỗi Hồi quy (Regression Detection)**
   - Bấm **"Gán Demo v2.0 (Regression)"**.
   - Bấm **"Kích Hoạt Phiên Kiểm Thử"**.
   - **Kết quả:** Hệ thống báo **FAILED**.
   - Chuyển chế độ xem sang **"3 Cột Song Song"** hoặc kéo **"Slider"**:
     - *Lỗi 1 (Màu sắc):* Nút bấm chính bị đổi màu từ Xanh ngọc (`#10B981`) sang Tím (`#8B5CF6`).
     - *Lỗi 2 (Bố cục):* Nút bấm bị xô lệch xuống dưới 25px do `margin-top: 35px` thay vì `10px`.
     - *Lỗi 3 (Văn bản):* Thẻ Badge đổi màu sang Hồng đỏ.
     - Bảng Bounding Box liệt kê chính xác tọa độ và kích thước các vùng bị biến dạng.

2. **Bước 2: Trình diễn Cơ chế Duyệt Baseline (Approve Baseline)**
   - Giả sử sự thay đổi ở phiên bản v2.0 là tính năng mới được chấp thuận bởi Product Owner.
   - Bấm nút **"Duyệt làm Baseline"**.
   - Chạy lại kiểm thử với v2.0 $\to$ Kết quả chuyển ngay thành **PASSED** (0% sai lệch, SSIM = 1.0000).

3. **Bước 3: Trình diễn Cơ chế Khử Báo động Giả (Anti-Flakiness Masking)**
   - Trang Demo có khối đồng hồ thời gian thực (`.timestamp`) nhảy liên tục mỗi giây.
   - Nhờ bộ lọc selector `.timestamp`, vùng này được che tự động, ngăn chặn hoàn toàn sai số Loại I (False Positives).

4. **Bước 4: Xuất Báo cáo Độc lập (Export HTML Report)**
   - Bấm nút **"Báo cáo HTML"** để mở bản báo cáo chuyên nghiệp, có thể lưu trữ và đính kèm vào hồ sơ nghiệm thu phần mềm.
