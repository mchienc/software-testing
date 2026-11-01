"""
Test Report Generator
Module: reporter.py
Generates comprehensive JSON summaries and standalone interactive HTML reports
for academic project evaluations and CI/CD pipelines.
"""

from pathlib import Path
from typing import Dict, Any, List
import json
import base64
import re
from app.core.logger import logger


def _strip_emojis(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"[\U0001F300-\U0001FAFF\u2600-\u27BF\u2139\uFE00-\uFE0F]", "", text).strip()


class ReportGenerator:
    """Creates persistent JSON and interactive HTML reports for test runs."""

    @staticmethod
    def _image_to_base64(image_path: Path) -> str:
        """Encodes an image file to base64 data URI for self-contained HTML reports."""
        if not image_path.exists():
            return ""
        try:
            with open(image_path, "rb") as img_file:
                encoded = base64.b64encode(img_file.read()).decode("utf-8")
                return f"data:image/png;base64,{encoded}"
        except Exception as e:
            logger.warning(f"Failed to encode image to base64: {e}")
            return ""

    @classmethod
    def generate_html_report(
        cls,
        run_data: Dict[str, Any],
        output_file: Path,
        embed_images_base64: bool = False
    ) -> Path:
        """
        Builds a self-contained Vietnamese HTML report with Swiss Data-Dense layout.
        """
        results: List[Dict[str, Any]] = run_data.get("results", [])
        overall_status = run_data.get("overall_status", "UNKNOWN")
        overall_vn = "ĐẠT CHUẨN (PASSED)" if overall_status == "PASSED" else "PHÁT HIỆN LỖI (FAILED)"
        status_color = "#10b981" if overall_status == "PASSED" else "#f43f5e"

        viewports_html = ""
        for r in results:
            vp = r.get("viewport", "").upper()
            status = r.get("status", "UNKNOWN")
            status_vn = "ĐẠT (PASSED)" if status == "PASSED" else "LỖI (FAILED)"
            vp_badge_bg = "rgba(16, 185, 129, 0.12)" if status == "PASSED" else "rgba(244, 63, 94, 0.12)"
            vp_badge_text = "#10b981" if status == "PASSED" else "#f43f5e"
            vp_badge_border = "rgba(16, 185, 129, 0.3)" if status == "PASSED" else "rgba(244, 63, 94, 0.3)"

            baseline_src = r.get("baseline_image_url") or ""
            current_src = r.get("current_image_url") or ""
            diff_src = r.get("diff_image_url") or ""

            if embed_images_base64:
                if r.get("baseline_file_path"):
                    baseline_src = cls._image_to_base64(Path(r["baseline_file_path"]))
                if r.get("current_file_path"):
                    current_src = cls._image_to_base64(Path(r["current_file_path"]))
                if r.get("diff_file_path"):
                    diff_src = cls._image_to_base64(Path(r["diff_file_path"]))

            bboxes = r.get("bounding_boxes", [])
            bbox_rows = ""
            for i, box in enumerate(bboxes):
                sev = box.get("severity", "MEDIUM")
                sev_vn = "NGHIÊM TRỌNG" if sev == "HIGH" else "TRUNG BÌNH"
                sev_color = "text-rose-400 font-bold" if sev == "HIGH" else "text-amber-400"
                bbox_rows += f"""
                <tr class="border-b border-slate-800/80 hover:bg-slate-900/50">
                    <td class="p-2.5 font-mono text-xs text-slate-500">#{i+1}</td>
                    <td class="p-2.5 text-xs text-slate-200 font-medium">{box.get('region_name', 'Khu vực chung')}</td>
                    <td class="p-2.5 font-mono text-xs text-slate-300">{box.get('defect_type', 'Sai lệch hiển thị')}</td>
                    <td class="p-2.5 font-mono text-xs {sev_color}">{sev_vn}</td>
                    <td class="p-2.5 text-xs text-slate-300">{box.get('description', '')}</td>
                    <td class="p-2.5 font-mono text-xs text-slate-400 text-right">({box['x']}, {box['y']}) &middot; {box['width']}&times;{box['height']}px</td>
                </tr>
                """

            insights_html = ""
            if r.get("semantic_insights"):
                insights_html = "<div class='mb-4 p-3.5 bg-[#0c0e14] rounded-lg border border-slate-800 text-xs space-y-1.5'>"
                insights_html += "<div class='font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1'>Phân Tích Nguyên Nhân Thay Đổi Giao Diện</div>"
                for ins in r["semantic_insights"]:
                    clean_ins = _strip_emojis(ins)
                    insights_html += f"<p class='text-slate-200 flex items-center gap-2'><span class='w-1.5 h-1.5 rounded-full bg-blue-500 inline-block'></span>{clean_ins}</p>"
                insights_html += "</div>"

            viewports_html += f"""
            <div class="bg-[#101218] border border-slate-800 rounded-lg p-5 mb-6 print-card">
                <div class="flex flex-wrap items-center justify-between pb-3.5 border-b border-slate-800 mb-4 gap-3">
                    <div class="flex items-center gap-3 font-mono">
                        <span class="text-base font-bold text-white tracking-tight">MÀN HÌNH {vp}</span>
                        <span class="px-2 py-0.5 rounded text-[11px] font-bold" style="background-color: {vp_badge_bg}; color: {vp_badge_text}; border: 1px solid {vp_badge_border};">
                            {status_vn}
                        </span>
                        <span class="text-xs text-slate-400">
                            {r.get('viewport_width')} &times; {r.get('viewport_height')} px
                        </span>
                    </div>
                    <div class="flex items-center gap-6 text-xs font-mono">
                        <div>
                            <span class="text-slate-500">TỶ LỆ LỆCH (DIFF):</span>
                            <span class="font-bold ml-1 text-rose-400">{r.get('diff_ratio', 0):.4f}%</span>
                        </div>
                        <div>
                            <span class="text-slate-500">ĐIỂM SSIM:</span>
                            <span class="font-bold ml-1 text-blue-400">{r.get('ssim_score', 0):.4f}</span>
                        </div>
                        <div>
                            <span class="text-slate-500">SỐ PIXEL LỆCH:</span>
                            <span class="font-bold ml-1 text-slate-200">{r.get('diff_pixels', 0):,}</span>
                        </div>
                    </div>
                </div>

                {insights_html}

                <!-- 3-Column Visual Comparison -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
                    <div class="bg-[#090a0f] p-2.5 rounded border border-slate-800">
                        <div class="text-[11px] font-mono font-semibold text-slate-300 uppercase mb-2 flex items-center justify-between">
                            <span>01 / Ảnh Chuẩn Gốc (Baseline)</span>
                            <span class="text-emerald-400">v1.0</span>
                        </div>
                        <div class="overflow-auto max-h-[500px] border border-slate-800 rounded bg-black flex justify-center">
                            <img src="{baseline_src}" alt="Baseline {vp}" class="max-w-full h-auto object-top" />
                        </div>
                    </div>

                    <div class="bg-[#090a0f] p-2.5 rounded border border-rose-900/40">
                        <div class="text-[11px] font-mono font-semibold text-rose-400 uppercase mb-2 flex items-center justify-between">
                            <span>02 / Bản Đồ Điểm Ảnh Lệch (#FF0055)</span>
                            <span class="text-rose-400">{len(bboxes)} cụm lỗi</span>
                        </div>
                        <div class="overflow-auto max-h-[500px] border border-rose-900/40 rounded bg-black flex justify-center">
                            <img src="{diff_src}" alt="Diff {vp}" class="max-w-full h-auto object-top" />
                        </div>
                    </div>

                    <div class="bg-[#090a0f] p-2.5 rounded border border-slate-800">
                        <div class="text-[11px] font-mono font-semibold text-slate-300 uppercase mb-2 flex items-center justify-between">
                            <span>03 / Ảnh Hiện Tại (Current)</span>
                            <span class="text-amber-400">v2.0</span>
                        </div>
                        <div class="overflow-auto max-h-[500px] border border-slate-800 rounded bg-black flex justify-center">
                            <img src="{current_src}" alt="Current {vp}" class="max-w-full h-auto object-top" />
                        </div>
                    </div>
                </div>

                {f'''
                <div class="mt-4">
                    <h4 class="text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">Danh Sách Các Vùng Khiếm Khuyết Giao Diện ({len(bboxes)}):</h4>
                    <div class="overflow-x-auto border border-slate-800 rounded">
                        <table class="w-full text-left border-collapse bg-[#090a0f]">
                            <thead>
                                <tr class="bg-slate-900 text-slate-400 text-[11px] font-mono uppercase border-b border-slate-800">
                                    <th class="p-2.5">STT</th>
                                    <th class="p-2.5">Vị Trí Trên Trang</th>
                                    <th class="p-2.5">Loại Lỗi</th>
                                    <th class="p-2.5">Mức Độ</th>
                                    <th class="p-2.5">Mô Tả Chi Tiết Thay Đổi</th>
                                    <th class="p-2.5 text-right">Tọa Độ &amp; Kích Thước [X, Y, W&times;H]</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bbox_rows}
                            </tbody>
                        </table>
                    </div>
                </div>
                ''' if bboxes else '<p class="text-xs font-mono text-emerald-400">Không phát hiện bất kỳ vùng lỗi nào trên màn hình này.</p>'}
            </div>
            """

        clean_exec_summary = _strip_emojis(run_data.get("executive_summary", ""))

        html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo Cáo Kiểm Định Hồi Quy Giao Diện - {run_data.get('suite_name', 'Suite')}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {{
            background-color: #090a0f;
            color: #f1f5f9;
            font-family: 'IBM Plex Sans', sans-serif;
            font-variant-numeric: tabular-nums;
        }}
        .font-mono {{ font-family: 'JetBrains Mono', monospace; }}
        @media print {{
            body {{ background-color: #ffffff !important; color: #0f172a !important; padding: 0 !important; }}
            .no-print {{ display: none !important; }}
            .print-card {{ background-color: #ffffff !important; border-color: #cbd5e1 !important; color: #0f172a !important; break-inside: avoid !important; }}
            .text-white, .text-slate-200, .text-slate-300 {{ color: #0f172a !important; }}
            * {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
        }}
    </style>
</head>
<body class="p-6 md:p-10 max-w-[1400px] mx-auto">
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
        <div>
            <div class="flex items-center gap-3 font-mono">
                <span class="text-lg font-bold tracking-tight text-white">
                    PIXELPULSE // BÁO CÁO KIỂM ĐỊNH HỒI QUY GIAO DIỆN
                </span>
                <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase" style="background-color: {status_color}22; color: {status_color}; border: 1px solid {status_color}55;">
                    {overall_vn}
                </span>
            </div>
            <p class="text-slate-400 text-xs font-mono mt-1">
                Kịch bản: <strong class="text-slate-200">{run_data.get('suite_name')}</strong> &middot; Đường dẫn kiểm thử: <a href="{run_data.get('target_url')}" target="_blank" class="text-blue-400 underline">{run_data.get('target_url')}</a>
            </p>
        </div>
        <div class="flex items-center gap-4">
            <button onclick="window.print()" class="no-print px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-semibold text-xs rounded cursor-pointer transition">
                In / Xuất Báo Cáo PDF
            </button>
            <div class="text-right text-xs font-mono text-slate-400">
                <p>MÃ PHIÊN: <span class="text-slate-200">#{run_data.get('id')}</span></p>
                <p>THỜI GIAN: <span class="text-slate-200">{run_data.get('started_at')}</span></p>
                <p>THỜI LƯỢNG: <span class="text-slate-200">{run_data.get('duration_seconds', 0):.2f}s</span></p>
            </div>
        </div>
    </header>

    {f'''
    <div class="mb-6 p-4 bg-[#101218] border-l-4 border-l-blue-600 border border-slate-800 rounded-r-lg print-card">
        <h4 class="text-[10px] font-mono uppercase font-bold text-blue-400 mb-1">Tóm Tắt Đánh Giá Thay Đổi Giao Diện (Executive Summary)</h4>
        <p class="text-xs text-slate-200 leading-relaxed">{clean_exec_summary}</p>
    </div>
    ''' if clean_exec_summary else ''}

    <!-- Telemetry Strip -->
    <section class="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800 border border-slate-800 bg-[#101218] rounded-lg mb-6 font-mono">
        <div class="p-4">
            <div class="text-[10px] text-slate-400 uppercase">Tổng Số Màn Hình</div>
            <div class="text-xl font-bold text-white mt-1">{run_data.get('total_viewports', 0)}</div>
        </div>
        <div class="p-4">
            <div class="text-[10px] text-slate-400 uppercase">Số Màn Hình Đạt</div>
            <div class="text-xl font-bold text-emerald-400 mt-1">{run_data.get('passed_viewports', 0)}</div>
        </div>
        <div class="p-4">
            <div class="text-[10px] text-slate-400 uppercase">Số Màn Hình Lỗi</div>
            <div class="text-xl font-bold text-rose-400 mt-1">{run_data.get('failed_viewports', 0)}</div>
        </div>
        <div class="p-4">
            <div class="text-[10px] text-slate-400 uppercase">Kết Luận Chung</div>
            <div class="text-xl font-bold mt-1" style="color: {status_color};">{overall_vn}</div>
        </div>
    </section>

    <!-- Viewports Visual Comparison Cards -->
    <section>
        {viewports_html}
    </section>

    <footer class="mt-10 pt-6 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
        <span>ĐỒ ÁN ĐÁNH GIÁ &amp; KIỂM ĐỊNH CHẤT LƯỢNG PHẦN MỀM // PLAYWRIGHT + OPENCV + SSIM</span>
        <span>THỜI GIAN XUẤT BÁO CÁO: {run_data.get('completed_at') or run_data.get('started_at')}</span>
    </footer>
</body>
</html>
"""
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(html_content, encoding="utf-8")
        logger.info(f"HTML report successfully generated at: {output_file}")
        return output_file

    @classmethod
    def generate_json_report(
        cls,
        run_data: Dict[str, Any],
        output_file: Path
    ) -> Path:
        """
        Exports a structured JSON report for CI/CD pipelines and automated QA tools.
        """
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(
            json.dumps(run_data, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        logger.info(f"JSON report successfully generated at: {output_file}")
        return output_file
