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
from datetime import datetime
from app.core.logger import logger


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
        Builds a self-contained, interactive HTML report with:
        - Executive Metrics Dashboard (Pass/Fail rate, SSIM score, total viewports)
        - Side-by-side responsive visual comparison cards
        - Interactive toggle between Baseline, Current, and Diff overlays
        - Bounding box defect table
        """
        results: List[Dict[str, Any]] = run_data.get("results", [])
        overall_status = run_data.get("overall_status", "UNKNOWN")
        status_color = "#10b981" if overall_status == "PASSED" else "#ef4444"

        # Prepare viewports HTML
        viewports_html = ""
        for r in results:
            vp = r.get("viewport", "").upper()
            status = r.get("status", "UNKNOWN")
            vp_badge_bg = "#065f46" if status == "PASSED" else "#7f1d1d"
            vp_badge_text = "#34d399" if status == "PASSED" else "#f87171"

            # Image paths or data URIs
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
                sev_color = "text-rose-400 font-bold" if box.get("severity") == "HIGH" else "text-amber-400"
                bbox_rows += f"""
                <tr>
                    <td class="p-2 border border-slate-700 font-mono text-xs">#{i+1}</td>
                    <td class="p-2 border border-slate-700 text-xs text-cyan-300 font-medium">{box.get('region_name', 'Chung')}</td>
                    <td class="p-2 border border-slate-700 text-xs text-white font-semibold">{box.get('defect_type', 'Lệch hiển thị')}</td>
                    <td class="p-2 border border-slate-700 text-xs {sev_color}">{box.get('severity', 'MEDIUM')}</td>
                    <td class="p-2 border border-slate-700 text-xs text-slate-300">{box.get('description', '')}</td>
                    <td class="p-2 border border-slate-700 font-mono text-xs text-slate-400">({box['x']}, {box['y']}) | {box['width']}&times;{box['height']}px</td>
                </tr>
                """

            insights_html = ""
            if r.get("semantic_insights"):
                insights_html = "<div class='mb-4 p-3 bg-slate-950 rounded border border-slate-800 text-xs space-y-1'>"
                for ins in r["semantic_insights"]:
                    insights_html += f"<p class='text-slate-300'>{ins}</p>"
                insights_html += "</div>"

            viewports_html += f"""
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 shadow-xl">
                <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                    <div class="flex items-center gap-3">
                        <span class="text-xl font-bold text-white tracking-wide">{vp} VIEWPORT</span>
                        <span class="px-3 py-1 rounded-full text-xs font-semibold" style="background-color: {vp_badge_bg}; color: {vp_badge_text};">
                            {status}
                        </span>
                        <span class="text-xs text-slate-400">
                            {r.get('viewport_width')} &times; {r.get('viewport_height')} px
                        </span>
                    </div>
                    <div class="flex items-center gap-6 text-sm">
                        <div>
                            <span class="text-slate-400">Diff Ratio:</span>
                            <span class="font-bold ml-1 text-rose-400">{r.get('diff_ratio', 0):.4f}%</span>
                        </div>
                        <div>
                            <span class="text-slate-400">SSIM Score:</span>
                            <span class="font-bold ml-1 text-cyan-400">{r.get('ssim_score', 0):.4f}</span>
                        </div>
                        <div>
                            <span class="text-slate-400">Diff Pixels:</span>
                            <span class="font-bold ml-1 text-amber-400">{r.get('diff_pixels', 0):,}</span>
                        </div>
                    </div>
                </div>

                {insights_html}

                <!-- 3-Column Visual Comparison -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <!-- Baseline -->
                    <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>1. Baseline (Chuẩn)</span>
                            <span class="text-emerald-400">v1.0</span>
                        </div>
                        <div class="overflow-auto max-h-[500px] border border-slate-800 rounded bg-black flex justify-center">
                            <img src="{baseline_src}" alt="Baseline {vp}" class="max-w-full h-auto object-top shadow" />
                        </div>
                    </div>

                    <!-- Visual Diff Highlight -->
                    <div class="bg-slate-950 p-3 rounded-lg border border-rose-900/40">
                        <div class="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>2. Perceptual Diff (#FF0055)</span>
                            <span class="text-rose-400">{len(bboxes)} defects</span>
                        </div>
                        <div class="overflow-auto max-h-[500px] border border-rose-900/40 rounded bg-black flex justify-center">
                            <img src="{diff_src}" alt="Diff {vp}" class="max-w-full h-auto object-top shadow" />
                        </div>
                    </div>

                    <!-- Current -->
                    <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>3. Current (Hiện tại)</span>
                            <span class="text-amber-400">v2.0</span>
                        </div>
                        <div class="overflow-auto max-h-[500px] border border-slate-800 rounded bg-black flex justify-center">
                            <img src="{current_src}" alt="Current {vp}" class="max-w-full h-auto object-top shadow" />
                        </div>
                    </div>
                </div>

                <!-- Bounding Box Defects Table -->
                {f'''
                <div class="mt-4">
                    <h4 class="text-sm font-semibold text-slate-300 mb-2">Danh sách vùng lỗi phát hiện (Defect Clusters):</h4>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse border border-slate-800 bg-slate-950 rounded">
                            <thead>
                                <tr class="bg-slate-800/60 text-slate-400 text-xs uppercase">
                                    <th class="p-2 border border-slate-700">Cluster</th>
                                    <th class="p-2 border border-slate-700">Tọa độ (X, Y)</th>
                                    <th class="p-2 border border-slate-700">Kích thước (W &times; H)</th>
                                    <th class="p-2 border border-slate-700">Phân loại lỗi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bbox_rows}
                            </tbody>
                        </table>
                    </div>
                </div>
                ''' if bboxes else '<p class="text-xs text-emerald-400">✓ Không có bất kỳ vùng khiếm khuyết nào được phát hiện.</p>'}
            </div>
            """

        html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo Cáo Kiểm Định Hồi Quy Giao Diện - {run_data.get('suite_name', 'Suite')}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {{ background-color: #030712; color: #f9fafb; font-family: ui-sans-serif, system-ui, sans-serif; }}
    </style>
</head>
<body class="p-6 md:p-10 max-w-7xl mx-auto">
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-center justify-between pb-8 mb-8 border-b border-slate-800 gap-4">
        <div>
            <div class="flex items-center gap-3">
                <span class="text-2xl font-black bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent">
                    VISUAL REGRESSION QA REPORT
                </span>
                <span class="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider" style="background-color: {status_color}22; color: {status_color}; border: 1px solid {status_color}44;">
                    {overall_status}
                </span>
            </div>
            <p class="text-slate-400 text-sm mt-1">
                Kịch bản: <strong class="text-white">{run_data.get('suite_name')}</strong> | Target: <a href="{run_data.get('target_url')}" target="_blank" class="text-cyan-400 underline">{run_data.get('target_url')}</a>
            </p>
        </div>
        <div class="text-right text-xs text-slate-400">
            <p>Mã phiên chạy: <span class="font-mono text-slate-300">{run_data.get('id')}</span></p>
            <p>Thời gian chạy: <span class="text-slate-300">{run_data.get('started_at')}</span></p>
            <p>Thời lượng: <span class="text-slate-300">{run_data.get('duration_seconds', 0):.2f}s</span></p>
        </div>
    </header>

    <!-- Executive Metrics Grid -->
    <section class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div class="text-xs text-slate-400 uppercase font-semibold">Tổng Viewports</div>
            <div class="text-2xl font-bold text-white mt-1">{run_data.get('total_viewports', 0)}</div>
        </div>
        <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div class="text-xs text-slate-400 uppercase font-semibold">Đạt chuẩn (Passed)</div>
            <div class="text-2xl font-bold text-emerald-400 mt-1">{run_data.get('passed_viewports', 0)}</div>
        </div>
        <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div class="text-xs text-slate-400 uppercase font-semibold">Không đạt (Failed)</div>
            <div class="text-2xl font-bold text-rose-400 mt-1">{run_data.get('failed_viewports', 0)}</div>
        </div>
        <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div class="text-xs text-slate-400 uppercase font-semibold">Trạng thái tổng quát</div>
            <div class="text-2xl font-bold mt-1" style="color: {status_color};">{overall_status}</div>
        </div>
    </section>

    <!-- Viewports Visual Comparison Cards -->
    <section>
        {viewports_html}
    </section>

    <!-- Academic Theory Summary Section -->
    <footer class="mt-12 pt-8 border-t border-slate-800 text-xs text-slate-500 leading-relaxed">
        <h4 class="font-semibold text-slate-400 mb-2">Ghi chú học thuật (Software Quality Assurance):</h4>
        <p>• <strong>Kiểm thử hồi quy giao diện (Visual Regression Testing):</strong> Đảm bảo các thay đổi mã nguồn mới (v2.0) không vô tình làm sai lệch giao diện gốc (v1.0 Baseline).</p>
        <p>• <strong>Khử nhiễu (Anti-Flakiness):</strong> Loại trừ sai số Loại I (False Positives) bằng kỹ thuật tiêm CSS đóng băng chuyển động và đợi tải phông chữ hoàn tất.</p>
        <p>• <strong>Perceptual Diff & SSIM:</strong> Đánh giá mức độ biến đổi quang học và độ tương đồng cấu trúc hình học của tài liệu DOM.</p>
    </footer>
</body>
</html>
"""
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(html_content, encoding="utf-8")
        logger.info(f"HTML report successfully generated at: {output_file}")
        return output_file
