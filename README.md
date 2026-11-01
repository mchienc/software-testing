# PIXELPULSE VISUAL QA — CÔNG CỤ TỰ ĐỘNG KIỂM THỬ HỒI QUY GIAO DIỆN TRỰC QUAN
## (AUTOMATED VISUAL REGRESSION TESTING TOOL)

> 📁 **Tài Liệu Báo Cáo Đồ Án & Video Demo:**  
> 👉 **Google Drive:** [https://drive.google.com/drive/folders/1gEZ5lAWS9EdPpJ5rg-94R94ryNQq2abx?usp=sharing](https://drive.google.com/drive/folders/1gEZ5lAWS9EdPpJ5rg-94R94ryNQq2abx?usp=sharing)

**PixelPulse Visual QA** là nền tảng tự động kiểm thử hồi quy giao diện trực quan (Visual Regression Testing) dành cho các ứng dụng Web hiện đại. Hệ thống kết hợp trình duyệt không giao diện **Playwright Headless Chromium** với các thuật toán Thị giác máy tính (**Perceptual Diff**, **SSIM**, **OpenCV Morphological Clustering**) và cổng kiểm duyệt tự động **CLI / GitHub Actions CI/CD** nhằm phát hiện chính xác mọi sai lệch về bố cục, màu sắc, phông chữ và khả năng hiển thị đa thiết bị.

---

## MỤC LỤC
1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Các Tính Năng Cốt Lõi](#2-các-tính-năng-cốt-lõi)
3. [Kiến Trúc Hệ Thống & Cấu Trúc Thư Mục](#3-kiến-trúc-hệ-thống--cấu-trúc-thư-mục)
4. [Cơ Chế Thuật Toán & Khử Nhiễu](#4-cơ-chế-thuật-toán--khử-nhiễu)
5. [Hướng Dẫn Cài Đặt & Khởi Chạy](#5-hướng-dẫn-cài-đặt--khởi-chạy)
6. [Hướng Dẫn Sử Dụng Giao Diện Web](#6-hướng-dẫn-sử-dụng-giao-diện-web)
7. [Tích Hợp Dòng Lệnh (CLI) & GitHub Actions CI/CD](#7-tích-hợp-dòng-lệnh-cli--github-actions-cicd)
8. [Danh Mục REST API](#8-danh-mục-rest-api)

---

## 1. TỔNG QUAN DỰ ÁN

Trong quy trình phát triển và cập nhật ứng dụng Web, các bài kiểm thử chức năng truyền thống (như kiểm tra cây DOM hoặc sự kiện thao tác) không thể phát hiện được các lỗi hiển thị thực tế trên màn hình người dùng như:
- Xô lệch bố cục (Layout Shift), tràn phần tử (Overflow) hoặc đè lấp văn bản.
- Sai lệch mã màu nhận diện, mất định kiểu CSS hoặc vỡ giao diện trên màn hình điện thoại / máy tính bảng.

**PixelPulse Visual QA** giải quyết bài toán này thông qua quy trình đối sánh trực quan tự động giữa **Bản Chuẩn Gốc (Baseline)** và **Bản Hiện Tại (Current)** trên đa độ phân giải màn hình, đồng thời loại bỏ hiện tượng báo động giả (Test Flakiness) do các phần tử động hoặc hiệu ứng chuyển động gây ra.

---

## 2. CÁC TÍNH NĂNG CỐT LÕI

- **Chụp ảnh tự động đa thiết bị (Multi-Viewport Capture):** Giả lập đồng thời 3 độ phân giải tiêu chuẩn trong một phiên chạy: **Desktop (`1920 × 1080`)**, **Tablet (`768 × 1024`)**, và **Mobile (`375 × 812`)**.
- **Khử nhiễu chống báo động giả (Anti-Flakiness & DOM Masking):** Tự động đóng băng hiệu ứng `animation` / `transition`, ẩn con trỏ văn bản, đồng bộ phông chữ (`document.fonts.ready`) và che các vùng dữ liệu động theo CSS Selector (ví dụ: `.timestamp`, `#live-visitors-counter`).
- **Phân tích Thị giác máy tính chuyên sâu:**
  - Đo khoảng cách màu sắc tri giác (**Perceptual Color Distance** $\Delta E$).
  - Lọc bỏ nhiễu làm mịn viền chữ bằng cửa sổ trượt $3 \times 3$ (**Anti-Aliasing Filter**).
  - Chấm điểm chỉ số tương đồng cấu trúc (**SSIM — Structural Similarity Index**).
  - Gom cụm vùng lỗi bằng phép toán hình thái học **OpenCV** (`cv2.dilate`, `cv2.findContours`) và tự động phân loại, mô tả vùng lỗi bằng tiếng Việt.
- **Bàn Kiểm Định Trực Quan 5 Chế Độ:** Hỗ trợ đối chiếu hình ảnh trực tiếp trên trình duyệt qua 5 chế độ: *Thanh Trượt (Slider)*, *3 Cột Song Song (Side-by-Side)*, *Chớp Tắt (Blink)*, *Mờ Đè Lớp (Onion Skin)* và *Kính Lúp Phóng Đại (`2× / 3× / 4×`)*.
- **Kiểm thử trực tiếp kho mã nguồn GitHub & CI/CD:** Hỗ trợ nhập đường dẫn kho mã nguồn GitHub bất kỳ để hệ thống tự động `git clone`, dựng giao diện web và kiểm thử so sánh giữa 2 bản Commit hoặc kiểm tra cổng chặn CI/CD qua `cli.py`.
- **Xuất Báo cáo HTML Độc lập & In PDF:** Tự động xuất báo cáo HTML độc lập (nhúng sẵn toàn bộ hình ảnh dạng Base64) và hỗ trợ in ấn chuẩn trang A4.

---

## 3. KIẾN TRÚC HỆ THỐNG & CẤU TRÚC THƯ MỤC

```text
software_testing/
├── .github/
│   └── workflows/
│       └── visual-regression.yml        # Pipeline GitHub Actions CI/CD tự động
├── cli.py                               # Điểm vào công cụ dòng lệnh (CLI Runner)
├── README.md                            # Tài liệu giới thiệu và hướng dẫn dự án
└── visual-regression-tool/
    ├── backend/
    │   ├── app/
    │   │   ├── api/
    │   │   │   ├── suites.py            # REST API quản lý kịch bản, chụp Baseline & kiểm thử GitHub Repo
    │   │   │   └── runs.py              # REST API lịch sử chạy, duyệt Baseline & xuất báo cáo HTML
    │   │   ├── core/
    │   │   │   ├── config.py            # Cấu hình ứng dụng và đường dẫn lưu trữ
    │   │   │   ├── constants.py         # Định nghĩa 3 độ phân giải Viewport & CSS khử nhiễu
    │   │   │   └── logger.py            # Bộ ghi log hệ thống chuẩn UTF-8
    │   │   ├── models/
    │   │   │   └── schemas.py           # Pydantic v2 Schemas & Data Transfer Objects (DTOs)
    │   │   ├── services/
    │   │   │   ├── browser_engine.py    # Playwright Headless Chromium, Anti-Flakiness & DOM Masking
    │   │   │   ├── diff_engine.py       # Perceptual Diff, Anti-Aliasing 3x3, SSIM, OpenCV Contours
    │   │   │   ├── test_runner.py       # Điều phối luồng kiểm thử giữa 2 URL
    │   │   │   ├── github_runner.py     # Tự động clone, dựng server cục bộ & kiểm thử kho GitHub
    │   │   │   ├── reporter.py          # Bộ sinh Báo cáo HTML độc lập (nhúng ảnh Base64)
    │   │   │   └── storage_manager.py   # Quản lý lưu trữ JSON metadata & kho ảnh chụp
    │   │   ├── cli.py                   # Lõi xử lý Headless CLI Gatekeeper (Exit Code 0 / 1 / 2)
    │   │   └── main.py                  # Khởi tạo FastAPI Server phục vụ API & Static Frontend
    │   ├── demo_sites/
    │   │   ├── v1_baseline/index.html   # Trang web mẫu phiên bản chuẩn v1.0 (Baseline)
    │   │   └── v2_regression/index.html # Trang web mẫu phiên bản lỗi hồi quy v2.0
    │   ├── storage/                     # Kho lưu trữ ảnh: baselines/, runs/, metadata/
    │   ├── requirements.txt             # Danh sách thư viện Python
    │   ├── test_engines.py              # Script kiểm thử tự động các thuật toán lõi
    │   └── run.py                       # Script khởi chạy máy chủ tại cổng 8000
    └── frontend/
        ├── src/
        │   ├── components/
        │   │   ├── TestRunnerForm.jsx   # Biểu mẫu cấu hình kịch bản & khởi chạy kiểm thử
        │   │   ├── BaselineViewer.jsx   # Khung xem trước bộ ảnh chuẩn gốc Baseline
        │   │   ├── MetricsCard.jsx      # Bảng chỉ số đo lường tổng quan phiên chạy
        │   │   ├── DiffViewer.jsx       # Bàn kiểm định trực quan 5 chế độ & danh sách vùng lỗi
        │   │   ├── ImageSlider.jsx      # Chế độ kéo thanh trượt Trước / Sau
        │   │   ├── BlinkCompare.jsx     # Chế độ Chớp tắt & Hòa trộn mờ (Onion Skin)
        │   │   ├── MagnifierCompare.jsx # Chế độ Kính lúp soi điểm ảnh (2x / 3x / 4x)
        │   │   ├── TrendChart.jsx       # Biểu đồ xu hướng chất lượng qua các phiên chạy
        │   │   └── CiCdPanel.jsx        # Trung tâm tích hợp GitHub Actions & kiểm thử kho GitHub
        │   ├── services/api.js          # Tầng giao tiếp REST API
        │   ├── App.jsx                  # Giao diện chính 3 Tab + Chuyển đổi Sáng/Tối (Light/Dark)
        │   └── index.css                # Hệ thống Token màu sắc & tối ưu in ấn A4
        └── dist/                        # Bản đóng gói giao diện chuẩn phục vụ từ FastAPI
```

---

## 4. CƠ CHẾ THUẬT TOÁN & KHỬ NHIỄU

### 4.1. Chuẩn hóa kích thước ảnh (Canvas Auto-Padding)
Khi chiều cao của trang web thay đổi giữa hai phiên bản, hệ thống tự động tạo khung nền đồng nhất theo kích thước lớn nhất $\max(W_1, W_2) \times \max(H_1, H_2)$ trước khi so khớp ma trận điểm ảnh.

### 4.2. Khoảng cách màu sắc tri giác (Perceptual Color Distance)
Tại mỗi tọa độ điểm ảnh $(x, y)$, khoảng cách màu Euclidean chuẩn hóa trên không gian RGB được tính theo công thức:

$$\Delta E(x,y) = \frac{\sqrt{(R_1 - R_2)^2 + (G_1 - G_2)^2 + (B_1 - B_2)^2}}{\sqrt{255^2 \times 3}}$$

Điểm ảnh được đánh dấu là khác biệt khi $\Delta E(x,y) > \gamma$ (mặc định $\gamma = 0.1$) và không thuộc vùng nhiễu làm mịn viền chữ $3 \times 3$ (Anti-Aliasing Filter).

### 4.3. Chỉ số tương đồng cấu trúc (SSIM) & Tỷ lệ sai lệch (Diff Ratio)
- **Tỷ lệ sai lệch điểm ảnh (`Diff Ratio %`):**
  $$\text{Diff Ratio} = \left(\frac{N_{\text{diff}}}{N_{\text{total}}}\right) \times 100\%$$
  Màn hình được đánh giá là **ĐẠT (`PASSED`)** khi $\text{Diff Ratio} \le \text{Threshold}$ (mặc định `0.05%`), ngược lại là **LỖI (`FAILED`)**.
- **Chỉ số tương đồng cấu trúc (`SSIM`):** Đo mức độ bảo toàn bố cục hình học, độ tương phản và độ sáng trong dải từ `0.0000` đến `1.0000`.

---

## 5. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY

### Bước 1: Cài đặt thư viện Python & trình duyệt Playwright Chromium
```bash
cd visual-regression-tool/backend
pip install -r requirements.txt
python -m playwright install chromium
```

### Bước 2: Khởi chạy máy chủ ứng dụng
```bash
python run.py
```
Sau khi khởi chạy, truy cập hệ thống tại:
- **Giao diện Web Dashboard:** `http://localhost:8000`
- **Tài liệu API (Swagger UI):** `http://localhost:8000/docs`
- **Trang mẫu v1.0 (Gốc):** `http://localhost:8000/demo/v1_baseline/index.html`
- **Trang mẫu v2.0 (Lỗi hồi quy):** `http://localhost:8000/demo/v2_regression/index.html`

*(Tùy chọn: Nếu chỉnh sửa mã nguồn giao diện trong `visual-regression-tool/frontend/src`, chạy lệnh `npm run build` trong thư mục `frontend` để cập nhật gói giao diện).*

---

## 6. HƯỚNG DẪN SỬ DỤNG GIAO DIỆN WEB

Giao diện tại `http://localhost:8000` hỗ trợ chuyển đổi chế độ **Sáng / Tối (Light / Dark Mode)** và bao gồm **3 Tab chức năng**:

1. **Tab `01 / Bàn Kiểm Định & So Khớp`:**
   - Thiết lập **Đường dẫn Bản chuẩn gốc (Baseline URL)** và **Đường dẫn Bản cần kiểm tra (Current URL)** (hoặc chọn nhanh cấu hình mẫu `v1.0` / `v2.0`).
   - Bấm **`1. Chụp Ảnh Gốc (Baseline)`** để khởi tạo bộ ảnh tham chiếu chuẩn trên 3 màn hình.
   - Bấm **`2. Chạy So Khớp Kiểm Thử`** để phân tích sai lệch, quan sát qua 5 chế độ (*Thanh Trượt*, *3 Cột Song Song*, *Chớp Tắt*, *Mờ Đè Lớp*, *Kính Lúp*), xem danh sách vùng lỗi OpenCV, hoặc bấm **`Duyệt Làm Ảnh Chuẩn Mới`** để cập nhật Baseline.
2. **Tab `02 / Xu Hướng & Lịch Sử`:**
   - Theo dõi **Biểu đồ Xu hướng Chất lượng** (`Avg Diff %` và `Avg SSIM %`) qua các phiên kiểm thử.
   - Tra cứu, lọc trạng thái (`Tất cả`, `Đạt`, `Lỗi`), tìm kiếm phiên chạy cũ và xuất **Báo cáo HTML độc lập**.
3. **Tab `03 / Tích Hợp CLI & CI/CD`:**
   - Nhập đường dẫn kho mã nguồn GitHub để theo dõi lịch sử chạy tự động **GitHub Actions** và nạp danh sách Commit.
   - Chạy kiểm thử hồi quy giao diện trực tiếp trên kho GitHub đã chọn theo 2 chế độ: *Giả lập lỗi hồi quy CSS trên giao diện dự án* hoặc *So sánh trực tiếp giữa 2 bản Commit Git*.

---

## 7. TÍCH HỢP DÒNG LỆNH (CLI) & GITHUB ACTIONS CI/CD

### 7.1. Các câu lệnh CLI thông dụng
```bash
# Xem bảng hướng dẫn tham số dòng lệnh
python cli.py --help

# Liệt kê danh sách các bộ kịch bản kiểm thử hiện có
python cli.py --list-suites

# Chụp mới bộ ảnh chuẩn gốc (Capture Baseline)
python cli.py --capture-baseline

# Chạy kiểm định chuẩn Zero-Diff (trả về Exit Code 0 - PASSED)
python cli.py --mode pass --reset-baseline --output-html ci_reports/pass_report.html

# Chạy phát hiện lỗi hồi quy (trả về Exit Code 1 - FAILED)
python cli.py --mode regression --reset-baseline --output-html ci_reports/regression_report.html --output-json ci_reports/result.json

# Duyệt kết quả của phiên chạy gần nhất làm Baseline mới
python cli.py --approve-latest
```

### 7.2. Quy ước Mã Thoát (Exit Code) trong CI/CD
- `Exit Code 0` (**PASSED**): Tất cả các độ phân giải đạt chuẩn ($\text{Diff Ratio} \le \text{Threshold}$) $\to$ Cho phép gộp Pull Request.
- `Exit Code 1` (**FAILED**): Phát hiện lỗi hồi quy giao diện vượt ngưỡng $\to$ Tự động chặn Pull Request và xuất báo cáo vùng lỗi.
- `Exit Code 2` (**ERROR**): Lỗi cấu hình tham số hoặc kết nối mạng.

---

## 8. DANH MỤC REST API

| Phương thức | Endpoint | Mô tả chức năng |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Kiểm tra trạng thái hoạt động của máy chủ FastAPI |
| `GET` | `/api/suites` | Lấy danh sách các bộ kịch bản kiểm thử |
| `POST` | `/api/suites` | Tạo mới bộ kịch bản kiểm thử |
| `DELETE` | `/api/suites/{suite_id}` | Xóa bộ kịch bản kiểm thử và ảnh Baseline liên quan |
| `POST` | `/api/suites/{suite_id}/capture-baseline` | Chụp và lưu bộ ảnh chuẩn gốc (Baseline) trên đa màn hình |
| `GET` | `/api/suites/{suite_id}/baselines` | Lấy danh sách ảnh Baseline hiện tại của kịch bản |
| `POST` | `/api/suites/{suite_id}/run` | Kích hoạt phiên chạy kiểm thử so khớp điểm ảnh |
| `POST` | `/api/suites/run-github` | Tự động clone và kiểm thử hồi quy trực tiếp kho GitHub |
| `GET` | `/api/runs` | Lấy lịch sử tất cả các phiên chạy kiểm thử |
| `GET` | `/api/runs/{run_id}` | Lấy thông tin chi tiết và danh sách vùng lỗi của một phiên chạy |
| `POST` | `/api/runs/{run_id}/approve` | Phê duyệt bộ ảnh hiện tại của phiên chạy làm Baseline mới |
| `GET` | `/api/runs/{run_id}/report` | Xuất tập tin Báo cáo HTML độc lập (nhúng ảnh Base64) |
