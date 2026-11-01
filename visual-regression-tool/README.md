# CÔNG CỤ TỰ ĐỘNG KIỂM THỬ HỒI QUY GIAO DIỆN TRỰC QUAN CHO ỨNG DỤNG WEB
## (AUTOMATED VISUAL REGRESSION TESTING TOOL)

> **Đồ án môn học:** Đánh giá và Kiểm định Chất lượng Phần mềm (Software Quality Assurance & Testing)  
> **Phương pháp tiếp cận:** Kiểm thử hộp đen giao diện người dùng (Black-box GUI Testing), Thị giác máy tính (Computer Vision) & Cổng kiểm duyệt tự động CI/CD (DevOps Quality Gate)  
> **Ngăn xếp công nghệ:** Python 3.10+, FastAPI, Playwright (Headless Chromium), OpenCV, scikit-image (SSIM), NumPy, Pillow, React 19 (Vite), Tailwind CSS, GitHub Actions CI/CD.

---

## MỤC LỤC
1. [Cơ Sở Lý Thuyết Môn Học](#1-cơ-sở-lý-thuyết-môn-học)
2. [Kiến Trúc Hệ Thống & Cây Thư Mục](#2-kiến-trúc-hệ-thống--cây-thư-mục)
3. [Nguyên Lý Hoạt Động Của Các Module Cốt Lõi](#3-nguyên-lý-hoạt-động-của-các-module-cốt-lõi)
4. [Hướng Dẫn Cài Đặt & Khởi Chạy Nhanh](#4-hướng-dẫn-cài-đặt--khởi-chạy-nhanh)
5. [Hướng Dẫn Sử Dụng 3 Không Gian Làm Việc Trên Web](#5-hướng-dẫn-sử-dụng-3-không-gian-làm-việc-trên-web)
6. [Kịch Bản Demo Bảo Vệ Đồ Án Trước Hội Đồng](#6-kịch-bản-demo-bảo-vệ-đồ-án-trước-hội-đồng)
7. [Công Cụ Dòng Lệnh (Headless CLI) & Tích Hợp GitHub Actions CI/CD](#7-công-cụ-dòng-lệnh-headless-cli--tích-hợp-github-actions-cicd)

---

## 1. CƠ SỞ LÝ THUYẾT MÔN HỌC

### 1.1. Bài toán Kiểm thử Hồi quy Giao diện (Visual Regression Testing)
Trong chu trình phát triển phần mềm hiện đại (Agile / CI-CD), mỗi khi lập trình viên chỉnh sửa mã nguồn (`HTML`, `CSS`, `JavaScript`) hoặc nâng cấp thư viện giao diện, nguy cơ phát sinh **lỗi hồi quy hiển thị (Visual Regression Bugs)** là rất lớn:
- Vỡ bố cục trang (Layout Shift), phần tử bị đẩy lệch vị trí (`margin` / `padding`).
- Sai lệch mã màu nhận diện thương hiệu hoặc mất hiệu ứng nền.
- Tràn khung văn bản (Text Overflow), chồng lấn phần tử trên màn hình điện thoại / máy tính bảng.

Các công cụ kiểm thử chức năng truyền thống (như Selenium hay Cypress kiểm tra `element.click()`, `assert text == "..."`) **không thể phát hiện các lỗi này** vì phần tử vẫn tồn tại trong cây DOM và vẫn bấm được, dù giao diện hiển thị đã bị vỡ. Công cụ **Automated Visual Regression Testing Tool** giải quyết triệt để bài toán trên bằng cách chụp ảnh đa thiết bị và đối sánh trực quan từng điểm ảnh giữa **Bản Chuẩn Gốc (Baseline)** và **Bản Hiện Tại (Current)**.

### 1.2. Kiểm soát Sai số Loại I (False Positives) & Sai số Loại II (False Negatives)

| Loại sai số | Bản chất trong Kiểm thử Giao diện | Nguyên nhân gây ra | Giải pháp kỹ thuật của Hệ thống |
| :--- | :--- | :--- | :--- |
| **Sai số Loại I (`False Positive` — Báo động giả)** | Hệ thống báo **LỖI (`FAILED`)** trong khi giao diện thực tế không hề bị hỏng (Test Flakiness). | Do hiệu ứng chuyển động CSS (`animation`/`transition`), con trỏ văn bản nhấp nháy, phông chữ tải chậm, nhiễu làm mịn viền chữ (`anti-aliasing`), hoặc đồng hồ thời gian thực (`.timestamp`). | **1. Engine Khử Nhiễu (`Anti-Flakiness`):** Tiêm CSS khóa mọi chuyển động, chờ `document.fonts.ready` và `networkidle`.<br>**2. Cơ chế Che vùng động (`DOM Masking`):** Tự động che các CSS Selector động (`.timestamp`, `#live-visitors-counter`).<br>**3. Bộ lọc Răng cưa `3×3` (`Anti-Aliasing Filter`):** Loại bỏ nhiễu nội suy viền chữ. |
| **Sai số Loại II (`False Negative` — Bỏ sót lỗi)** | Giao diện thực tế bị lệch/đổi màu nhưng hệ thống lại báo **ĐẠT (`PASSED`)**. | Ngưỡng dung sai đặt quá cao hoặc thuật toán chỉ đo kích thước khung mà bỏ qua sai lệch màu sắc. | Kết hợp **So khớp Điểm ảnh Tri giác (`Perceptual Diff`, $\gamma = 0.1$)**, chỉ số **Tương đồng Cấu trúc (`SSIM`)** và **Gom cụm Vùng lỗi OpenCV (`Bounding Boxes`)**. |

---

## 2. KIẾN TRÚC HỆ THỐNG & CÂY THƯ MỤC

```text
software_testing/
├── .github/
│   └── workflows/
│       └── visual-regression.yml        # Pipeline GitHub Actions CI/CD tự động chạy trên đám mây
├── cli.py                               # Điểm vào CLI Runner ở thư mục gốc dự án
├── README.md                            # Tài liệu hướng dẫn tổng thể dự án
└── visual-regression-tool/
    ├── cli.py                           # Điểm vào CLI Runner của công cụ
    ├── backend/
    │   ├── app/
    │   │   ├── api/
    │   │   │   ├── suites.py            # REST API quản lý kịch bản, chụp Baseline & chạy GitHub Repo
    │   │   │   └── runs.py              # REST API lịch sử chạy, duyệt Baseline & xuất báo cáo HTML
    │   │   ├── core/
    │   │   │   ├── config.py            # Cấu hình hệ thống và đường dẫn lưu trữ
    │   │   │   ├── constants.py         # Cấu hình 3 độ phân giải (Desktop/Tablet/Mobile) & CSS khử nhiễu
    │   │   │   └── logger.py            # Bộ ghi log chuẩn hóa UTF-8
    │   │   ├── models/
    │   │   │   └── schemas.py           # Pydantic v2 Schemas & DTOs
    │   │   ├── services/
    │   │   │   ├── browser_engine.py    # Playwright Headless Chromium, Anti-Flakiness & DOM Masking
    │   │   │   ├── diff_engine.py       # Perceptual Diff, Anti-Aliasing 3x3, SSIM, OpenCV Bounding Box
    │   │   │   ├── test_runner.py       # Luồng điều phối kiểm thử 2 URL (Baseline vs Current)
    │   │   │   ├── github_runner.py     # Tự động git clone, dựng server cục bộ & kiểm thử kho GitHub bất kỳ
    │   │   │   ├── reporter.py          # Bộ sinh Báo cáo HTML độc lập (nhúng ảnh Base64)
    │   │   │   └── storage_manager.py   # Quản lý lưu trữ JSON metadata & kho ảnh chụp
    │   │   ├── cli.py                   # Lõi xử lý Headless CLI Gatekeeper (Exit Code 0 / 1 / 2)
    │   │   └── main.py                  # Khởi tạo ứng dụng FastAPI, phục vụ cả API và Frontend
    │   ├── demo_sites/
    │   │   ├── v1_baseline/index.html   # Trang web mẫu Phiên bản Chuẩn v1.0 (Gốc)
    │   │   └── v2_regression/index.html # Trang web mẫu Phiên bản Lỗi Hồi quy v2.0 (Lỗi CSS & Bố cục)
    │   ├── storage/                     # Kho lưu trữ ảnh: baselines/, runs/, metadata/
    │   ├── requirements.txt             # Danh sách thư viện Python
    │   ├── test_engines.py              # Script kiểm thử tự động các thuật toán lõi
    │   └── run.py                       # Script khởi chạy máy chủ Backend + Web UI tại cổng 8000
    └── frontend/
        ├── design-system/
        │   └── pixelpulse-qa/MASTER.md  # Đặc tả Hệ thống Thiết kế (Swiss Data-Dense Workbench)
        ├── src/
        │   ├── components/
        │   │   ├── TestRunnerForm.jsx   # Bảng cấu hình kịch bản & khởi chạy kiểm thử (Tab 01)
        │   │   ├── BaselineViewer.jsx   # Khung xem trước bộ ảnh chuẩn gốc Baseline (Tab 01)
        │   │   ├── MetricsCard.jsx      # Bảng 4 chỉ số đo lường tổng quan phiên chạy (Tab 01)
        │   │   ├── DiffViewer.jsx       # Bàn kiểm định trực quan 5 chế độ + danh sách vùng lỗi (Tab 01)
        │   │   ├── ImageSlider.jsx      # Chế độ kéo thanh trượt Trước / Sau
        │   │   ├── BlinkCompare.jsx     # Chế độ Chớp tắt & Hòa trộn mờ (Onion Skin)
        │   │   ├── MagnifierCompare.jsx # Chế độ Kính lúp soi điểm ảnh (2x / 3x / 4x)
        │   │   ├── TrendChart.jsx       # Biểu đồ xu hướng chất lượng qua các phiên chạy (Tab 02)
        │   │   └── CiCdPanel.jsx        # Trung tâm tích hợp GitHub Actions & kiểm thử kho GitHub (Tab 03)
        │   ├── services/api.js          # Tầng giao tiếp REST API
        │   ├── App.jsx                  # Giao diện chính 3 Tab + Chuyển đổi Sáng/Tối (Light/Dark)
        │   └── index.css                # Hệ thống Token màu sắc 3 tầng & tối ưu in ấn A4
        └── dist/                        # Bản đóng gói giao diện chuẩn phục vụ trực tiếp từ FastAPI
```

---

## 3. NGUYÊN LÝ HOẠT ĐỘNG CỦA CÁC MODULE CỐT LÕI

### 3.1. Module Chụp Ảnh Đa Màn Hình & Khử Nhiễu (`browser_engine.py`)
1. **Giả lập 3 Độ phân giải Thiết bị (`VIEWPORT_PRESETS`):**
   - **Desktop (`desktop`):** `1920 × 1080` (Màn hình máy tính tiêu chuẩn Full HD).
   - **Tablet (`tablet`):** `768 × 1024` (Máy tính bảng iPad dọc, hỗ trợ cảm ứng).
   - **Mobile (`mobile`):** `375 × 812` (Điện thoại thông minh iPhone X/SE dọc).
2. **Tiêm CSS Khử Nhiễu (`Anti-Flakiness CSS Injection`):**
   - Tắt toàn bộ hiệu ứng chuyển động (`transition: none !important; animation: none !important`), ẩn con trỏ nhập liệu (`caret-color: transparent !important`) và cố định thanh cuộn trước khi chụp.
   - Đợi toàn bộ phông chữ tải xong (`await document.fonts.ready`) và mạng ổn định (`networkidle`).
3. **Che Vùng Dữ Liệu Động (`DOM Masking`):**
   - Nhận danh sách CSS Selectors (ví dụ: `.timestamp`, `#live-visitors-counter`) và phủ lớp mặt nạ đồng nhất lên phần tử đó để dữ liệu biến thiên theo giây không gây ra báo động giả.

### 3.2. Module Thị Giác Máy Tính & Phân Tích Sai Lệch (`diff_engine.py`)
1. **Chuẩn hóa Kích thước Khung Ảnh (`Canvas Auto-Padding`):**
   - Khi chiều cao trang thay đổi giữa 2 phiên bản, hệ thống tự động đồng bộ về kích thước lớn nhất $\max(W_1, W_2) \times \max(H_1, H_2)$ để không bị lỗi lệch ma trận điểm ảnh.
2. **So khớp Điểm ảnh Tri giác (`Perceptual Color Distance`):**
   - Tính khoảng cách màu Euclidean chuẩn hóa trên từng điểm ảnh $(x, y)$:
     $$\Delta E(x,y) = \frac{\sqrt{(R_1 - R_2)^2 + (G_1 - G_2)^2 + (B_1 - B_2)^2}}{\sqrt{255^2 \times 3}}$$
   - Điểm ảnh có $\Delta E > \gamma$ (mặc định $\gamma = 0.1$) được đánh dấu là ứng viên sai lệch.
3. **Bộ lọc Khử Răng Cưa Chữ `3×3` (`Anti-Aliasing Filter`):**
   - Kiểm tra vùng lân cận $3 \times 3$ quanh điểm ảnh lệch để loại bỏ các điểm ảnh viền chữ do trình duyệt làm mịn phông (anti-aliasing), giữ tỷ lệ báo động giả ở mức `0.0000%`.
4. **Chỉ số Tương đồng Cấu trúc (`SSIM - Structural Similarity Index`):**
   - Đo độ tương đồng về cấu trúc bố cục, độ sáng và độ tương phản trong thang điểm từ `0.0000` đến `1.0000` (trong đó `1.0000` là giống hệt 100%).
5. **Gom cụm Vùng lỗi & Chẩn đoán Ngữ nghĩa (`OpenCV Morphological Clustering`):**
   - Sử dụng phép giãn nở hình thái học (`cv2.dilate`) và tìm đường bao (`cv2.findContours`) để gom các điểm ảnh lỗi rời rạc thành từng khung chữ nhật `[X, Y, Rộng × Cao]`, phân loại mức độ nghiêm trọng (`HIGH`, `MEDIUM`, `LOW`) và tự động sinh mô tả lỗi bằng tiếng Việt (ví dụ: *Đổi màu sắc từ Xanh ngọc sang Tím*, *Dịch chuyển bố cục theo trục dọc*).

### 3.3. Module Kiểm Thử Trực Tiếp Kho Mã Nguồn GitHub (`github_runner.py`)
- Cho phép người dùng nhập đường dẫn của bất kỳ kho mã nguồn dự án web công khai nào trên GitHub.
- Hệ thống tự động `git clone` dự án về bộ đệm cục bộ, truy xuất lịch sử `git log`, tự động tìm thư mục giao diện web (`frontend/dist`, `dist`, `build`, hoặc `index.html`), khởi chạy máy chủ HTTP tạm thời (`EphemeralStaticServer`) và dùng Playwright chụp ảnh so sánh giữa **2 bản Commit** hoặc **giả lập tiêm lỗi CSS hồi quy** trực tiếp trên giao diện dự án đó.

---

## 4. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY NHANH

### Bước 1: Cài đặt thư viện Python & trình duyệt Playwright Chromium
Mở cửa sổ dòng lệnh (Terminal / PowerShell) tại thư mục gốc của dự án:
```bash
cd visual-regression-tool/backend
pip install -r requirements.txt
python -m playwright install chromium
```

### Bước 2: Khởi chạy hệ thống (Backend FastAPI + Giao diện Web)
```bash
python run.py
```
Sau khi chạy lệnh trên, toàn bộ hệ thống đã sẵn sàng tại địa chỉ:
- **Giao diện Web chính (Dashboard 3 Tab):** `http://localhost:8000`
- **Tài liệu REST API (Swagger UI):** `http://localhost:8000/docs`
- **Trang Mẫu v1.0 (Bản gốc chuẩn):** `http://localhost:8000/demo/v1_baseline/index.html`
- **Trang Mẫu v2.0 (Bản lỗi hồi quy):** `http://localhost:8000/demo/v2_regression/index.html`

---

## 5. HƯỚNG DẪN SỬ DỤNG 3 KHÔNG GIAN LÀM VIỆC TRÊN WEB

Giao diện tại `http://localhost:8000` được thiết kế theo chuẩn **Bàn Kiểm Định Dữ Liệu Mật Độ Cao (Swiss Data-Dense Workbench)**, hỗ trợ chuyển đổi giao diện **Sáng / Tối (nút Mặt trời / Mặt trăng ở góc phải trên cùng)** và chia thành **3 Tab chức năng**:

### Tab `01 / Bàn Kiểm Định & So Khớp`
Dành cho kiểm thử trực tiếp hai đường dẫn URL (Baseline URL và Current URL):
1. **Nạp cấu hình hoặc điền URL:**
   - Bấm **`Nạp Mẫu v1.0 Chuẩn (Gốc vs Gốc)`** để kiểm tra kịch bản 2 phiên bản giống hệt nhau.
   - Hoặc bấm **`Nạp Mẫu v2.0 Lỗi (Gốc vs Lỗi)`** để kiểm tra kịch bản bản mới bị vỡ giao diện.
   - Hoặc tự nhập đường dẫn trang web bất kỳ vào 2 ô **Đường dẫn Bản chuẩn gốc (Baseline URL)** và **Đường dẫn Bản cần kiểm tra (Current URL)**.
2. **Bước 1 — Chụp bộ ảnh chuẩn gốc:** Bấm nút **`1. Chụp Ảnh Gốc (Baseline)`** để hệ thống chụp và lưu 3 bức ảnh gốc (Desktop, Tablet, Mobile).
3. **Bước 2 — Chạy so khớp điểm ảnh:** Bấm nút **`2. Chạy So Khớp Kiểm Thử`**.
4. **Bước 3 — Soi lỗi bằng 5 chế độ trực quan:**
   - **`Thanh Trượt`:** Kéo thanh gạt trái/phải để đối chiếu trực tiếp ảnh Gốc và ảnh Hiện tại.
   - **`3 Cột Song Song`:** Đặt 3 ảnh (Ảnh Gốc — Bản Đồ Nhiệt Đỏ `#FF0055` — Ảnh Hiện Tại) cạnh nhau; bấm nút **`Hiện Khung Vùng Lỗi`** để xem các khung đánh số thứ tự lỗi.
   - **`Chớp Tắt` / `Mờ Đè Lớp`:** Nhấp nháy luân phiên hai ảnh hoặc hòa trộn độ mờ để phát hiện các chi tiết bị xê dịch vài pixel.
   - **`Kính Lúp`:** Rê chuột tới đâu, kính lúp phóng đại (`2×`, `3×`, `4×`) soi chi tiết điểm ảnh tới đó.
5. **Bước 4 — Duyệt chuẩn mới hoặc Xuất báo cáo:**
   - Bấm **`Duyệt Làm Ảnh Chuẩn Mới`** nếu thay đổi giao diện là hợp lệ và muốn cập nhật làm chuẩn gốc mới.
   - Bấm **`Mở Báo Cáo HTML`** hoặc **`In / Lưu PDF`** để xuất hồ sơ nghiệm thu.

### Tab `02 / Xu Hướng & Lịch Sử`
Dành cho theo dõi chất lượng dự án theo thời gian và quản lý hồ sơ kiểm định:
- **Biểu đồ Xu hướng Chất lượng:** Biểu diễn trực quan **Tỷ lệ sai lệch trung bình (`Avg Diff %`)** và **Điểm cấu trúc (`Avg SSIM %`)** qua 10 phiên kiểm thử gần nhất.
- **Bảng Nhật ký Kiểm định Lịch sử:**
  - Hỗ trợ lọc nhanh theo trạng thái **`Tất cả`**, **`Đạt (PASSED)`**, **`Lỗi (FAILED)`** và tìm kiếm theo mã phiên hoặc tên kịch bản.
  - **Nhấp chuột vào bất kỳ dòng nào** trong bảng để nạp lại toàn bộ bộ ảnh của lần chạy đó lên màn hình, hoặc bấm **`Mở HTML`** để tải báo cáo độc lập.

### Tab `03 / Tích Hợp CLI & CI/CD`
Dành cho tự động hóa kiểm thử trong quy trình làm việc nhóm trên GitHub:
1. **Mục `01` — Theo dõi GitHub Actions & Nạp kho GitHub:**
   - Nhập đường dẫn kho GitHub của bạn (ví dụ `https://github.com/mchienc/software-testing.git` hoặc bất kỳ kho dự án web nào khác) rồi bấm **`Nạp Dự Án GitHub Này`**.
   - Nếu kho đã gắn GitHub Actions, bảng bên dưới sẽ hiển thị trực tiếp lịch sử các phiên chạy tự động trên đám mây GitHub và chi tiết từng bước (`Step-by-step logs`).
2. **Mục `02` — Chạy kịch bản kiểm thử trực tiếp trên kho GitHub đã chọn:**
   - **Chế độ 1 (Giả lập Lỗi Hồi quy CSS trên giao diện dự án):** Tự động `git clone` kho GitHub bạn vừa nhập, chụp bản chuẩn gốc, sau đó tiêm lỗi CSS hồi quy vào chính giao diện dự án đó để chứng minh Cổng CI/CD phát hiện đúng vùng lỗi và trả về **`EXIT CODE 1 (CHẶN PR)`**.
   - **Chế độ 2 (So sánh trực tiếp giữa 2 Commit của dự án):** Chọn 2 bản Commit thực tế từ danh sách lịch sử Git của dự án để hệ thống lần lượt `git checkout`, dựng giao diện từng bản và đo tỷ lệ sai lệch điểm ảnh.
   - Ngay sau khi chạy xong, bên dưới màn hình Terminal sẽ hiển thị trực tiếp **3 bức ảnh chụp thực tế của dự án GitHub đó** cùng nút mở sang Bàn Kiểm Định (Tab `01`).
3. **Mục `03` — Các câu lệnh chạy trong Terminal:** Cung cấp sẵn 4 lệnh CLI tiêu chuẩn kèm nút **`Sao chép`** nhanh.

---

## 6. KỊCH BẢN DEMO BẢO VỆ ĐỒ ÁN TRƯỚC HỘI ĐỒNG

Khi thuyết trình và demo trực tiếp trước Giảng viên / Hội đồng chấm đồ án, bạn có thể trình bày theo kịch bản 4 phần mạch lạc sau (tổng thời gian khoảng 5–7 phút):

1. **Phần 1 — Chứng minh Khử Báo động Giả đạt `0.0000%` (Tại Tab `01`):**
   - Bấm **`Nạp Mẫu v1.0 Chuẩn (Gốc vs Gốc)`** $\to$ Bấm **`1. Chụp Ảnh Gốc (Baseline)`** $\to$ Bấm **`2. Chạy So Khớp Kiểm Thử`**.
   - Chỉ ra rằng dù trang web có đồng hồ thời gian thực (`.timestamp`) và bộ đếm người dùng (`#live-visitors-counter`) thay đổi mỗi giây, nhờ cơ chế **DOM Masking** và **Anti-Flakiness CSS**, kết quả vẫn báo **`ĐẠT CHUẨN (PASSED)`** tuyệt đối với **`Diff Ratio = 0.0000%`** và **`SSIM = 1.0000`**.
2. **Phần 2 — Chứng minh Phát hiện & Khoanh vùng Lỗi Hồi quy (Tại Tab `01`):**
   - Bấm **`Nạp Mẫu v2.0 Lỗi (Gốc vs Lỗi)`** $\to$ Bấm **`2. Chạy So Khớp Kiểm Thử`**.
   - Hệ thống lập tức báo **`PHÁT HIỆN LỖI (FAILED)`** trên cả 3 màn hình (`Desktop`, `Tablet`, `Mobile`).
   - Sử dụng **`Thanh Trượt`**, **`3 Cột Song Song`** và **`Kính Lúp`** để chỉ rõ các vùng lỗi được OpenCV tự động đóng khung và chẩn đoán bằng tiếng Việt: nút bấm bị đổi màu từ Xanh sang Tím, khoảng cách lề bị đẩy tụt xuống dưới 25px, thẻ trạng thái bị đổi màu.
3. **Phần 3 — Chứng minh Quản lý Lịch sử & Báo cáo Nghiệm thu (Tại Tab `02`):**
   - Chuyển sang Tab **`02 / Xu Hướng & Lịch Sử`** để chỉ biểu đồ biến thiên giữa phiên Đạt (`0%`) và phiên Lỗi (`>12%`), sau đó bấm **`Mở HTML`** để trình chiếu file Báo cáo Kiểm định Độc lập.
4. **Phần 4 — Chứng minh Thực chiến Doanh nghiệp với CI/CD & Kiểm thử Kho GitHub (Tại Tab `03`):**
   - Chuyển sang Tab **`03 / Tích Hợp CLI & CI/CD`**.
   - Cho Hội đồng xem lịch sử các phiên chạy tự động xanh lá trên máy chủ đám mây GitHub Actions.
   - Nhập một link dự án GitHub thực tế vào ô nhập liệu, bấm **`Chạy Kiểm Thử Dự Án ... Ngay`** ở Mục `02` để hệ thống tự động tải kho GitHub đó về, chụp giao diện và xuất kết quả **`EXIT CODE 1 — CHẶN PULL REQUEST`** kèm ảnh chụp thực tế ngay trên màn hình.

---

## 7. CÔNG CỤ DÒNG LỆNH (HEADLESS CLI) & TÍCH HỢP GITHUB ACTIONS CI/CD

### 7.1. Các câu lệnh CLI chạy từ Terminal
Tại thư mục gốc dự án (`software_testing`) hoặc thư mục `visual-regression-tool`, bạn có thể chạy trực tiếp:

```bash
# 1. Xem đầy đủ bảng hướng dẫn tham số dòng lệnh
python cli.py --help

# 2. Liệt kê các bộ kịch bản kiểm thử hiện có
python cli.py --list-suites

# 3. Chụp mới bộ ảnh chuẩn gốc (Capture Baseline -> trả về Exit Code 0)
python cli.py --capture-baseline

# 4. Chạy kiểm định chuẩn Zero-Diff (v1.0 vs v1.0 -> PASSED -> trả về Exit Code 0)
python cli.py --mode pass --reset-baseline --output-html ci_reports/pass_report.html

# 5. Chạy phát hiện lỗi hồi quy (v1.0 vs v2.0 -> FAILED -> trả về Exit Code 1)
python cli.py --mode regression --reset-baseline --output-html ci_reports/regression_report.html --output-json ci_reports/result.json

# 6. Duyệt kết quả của phiên chạy gần nhất làm Baseline mới
python cli.py --approve-latest
```

### 7.2. Quy ước Mã Thoát (`Exit Code`) trong Pipeline CI/CD
- **`Exit Code 0` (`PASSED`):** Sai lệch điểm ảnh trên mọi màn hình nằm trong ngưỡng cho phép ($\text{Diff Ratio} \le \text{Threshold}$) $\to$ Cổng CI/CD mở xanh, cho phép gộp nhánh (`Merge Pull Request`).
- **`Exit Code 1` (`FAILED`):** Phát hiện lỗi hồi quy giao diện vượt ngưỡng ($\text{Diff Ratio} > \text{Threshold}$) $\to$ Cổng CI/CD tự động khóa Pull Request và đính kèm báo cáo vùng lỗi.
- **`Exit Code 2` (`ERROR`):** Lỗi cấu hình tham số hoặc không kết nối được tới máy chủ đích.

### 7.3. Quy trình tự động trên đám mây GitHub Actions (`.github/workflows/visual-regression.yml`)
Mỗi khi có lệnh `git push` hoặc tạo `Pull Request` lên GitHub:
1. Máy chủ đám mây GitHub khởi tạo môi trường `ubuntu-latest`, cài đặt Python 3.11, OpenCV, scikit-image và trình duyệt **Playwright Headless Chromium**.
2. Tự động thực thi kiểm thử đơn vị thuật toán lõi (`test_engines.py`).
3. Thực thi **Cổng Kiểm Duyệt 1 (`Zero-Diff Gate`)** và **Cổng Kiểm Duyệt 2 (`Regression Detection Gate`)** thông qua `cli.py`.
4. Tự động xuất bảng tổng kết Markdown lên **GitHub Job Summary** và đóng gói toàn bộ ảnh chụp + báo cáo HTML vào mục **Artifacts** của phiên chạy.
