"""
Image Comparison & Analytics Engine
Module 2: Perceptual Difference, SSIM, Anti-Aliasing Filtering, and Defect Clustering.
Computes pixel-by-pixel perceptual distance, structural similarity index,
and bounding boxes around layout and visual regressions.
"""

import time
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
from PIL import Image
import cv2
from skimage.metrics import structural_similarity as ssim

from app.core.constants import (
    DEFAULT_COLOR_THRESHOLD,
    DEFAULT_DIFF_RATIO_THRESHOLD,
    DIFF_COLOR_RGB,
    BBOX_COLOR_BGR,
    BBOX_THICKNESS
)
from app.core.logger import logger


class DiffEngineError(Exception):
    """Base exception for Diff Engine failures."""
    pass


class ImageLoadError(DiffEngineError):
    """Raised when an input image cannot be read or parsed."""
    pass


class DiffEngine:
    """
    High-performance Computer Vision Engine for Visual Regression Analysis.
    Combines:
    1. Dimension Auto-Normalization (Canvas Padding)
    2. Anti-Aliasing (AA) aware Perceptual Diffing
    3. Structural Similarity Index Measure (SSIM)
    4. Morphological Defect Clustering & Bounding Box extraction
    """

    def __init__(
        self,
        color_threshold: float = DEFAULT_COLOR_THRESHOLD,
        diff_ratio_threshold: float = DEFAULT_DIFF_RATIO_THRESHOLD,
        detect_anti_aliasing: bool = True
    ):
        """
        Parameters:
            color_threshold: Normalized color distance tolerance (0.0 to 1.0).
                             Default 0.1 (~10% perceptual delta E).
            diff_ratio_threshold: Max allowed percentage of differing pixels (e.g. 0.05%).
            detect_anti_aliasing: Whether to filter out font sub-pixel smoothing artifacts.
        """
        self.color_threshold = color_threshold
        self.diff_ratio_threshold = diff_ratio_threshold
        self.detect_anti_aliasing = detect_anti_aliasing

    @staticmethod
    def load_image(image_path: Path) -> np.ndarray:
        """
        Loads an image from disk into an RGB numpy array.
        Handles non-existent files and corrupt formats.
        """
        if not image_path.exists():
            raise ImageLoadError(f"Image not found at path: {image_path}")

        try:
            pil_img = Image.open(image_path)
            # Standardize color space to 24-bit RGB (discarding alpha transparency variations)
            if pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")
            return np.array(pil_img)
        except Exception as e:
            raise ImageLoadError(f"Failed to load image '{image_path}': {str(e)}") from e

    @staticmethod
    def normalize_dimensions(
        img1: np.ndarray,
        img2: np.ndarray,
        neutral_color: Tuple[int, int, int] = (245, 245, 245)
    ) -> Tuple[np.ndarray, np.ndarray, bool]:
        """
        Normalizes two images of differing dimensions onto a unified canvas size.
        Uses canvas padding with a neutral background color so that layout shifts
        or content additions/deletions at the bottom of the page are properly detected.

        Returns:
            (padded_img1, padded_img2, was_resized)
        """
        h1, w1 = img1.shape[:2]
        h2, w2 = img2.shape[:2]

        if h1 == h2 and w1 == w2:
            return img1, img2, False

        target_w = max(w1, w2)
        target_h = max(h1, h2)

        logger.info(
            f"Dimension mismatch detected: Baseline ({w1}x{h1}) vs Current ({w2}x{h2}). "
            f"Auto-normalizing to target canvas ({target_w}x{target_h})."
        )

        def pad_image(img: np.ndarray, tw: int, th: int) -> np.ndarray:
            h, w, c = img.shape
            canvas = np.full((th, tw, c), neutral_color, dtype=np.uint8)
            canvas[:h, :w] = img
            return canvas

        padded1 = pad_image(img1, target_w, target_h)
        padded2 = pad_image(img2, target_w, target_h)
        return padded1, padded2, True

    @staticmethod
    def _detect_anti_aliasing_mask(
        gray_img: np.ndarray,
        contrast_threshold: float = 30.0
    ) -> np.ndarray:
        """
        Identifies pixels that are part of text subpixel anti-aliasing edges.
        A pixel is an anti-aliasing candidate if its 3x3 local neighborhood exhibits
        high contrast while the pixel itself has intermediate luminance between min and max.
        """
        # Convert to float for local gradient computation
        gray_f = gray_img.astype(np.float32)

        # 3x3 kernel for min and max filtering
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        local_min = cv2.erode(gray_f, kernel)
        local_max = cv2.dilate(gray_f, kernel)

        contrast = local_max - local_min

        # High contrast neighborhood
        is_edge_neighborhood = contrast >= contrast_threshold

        # Pixel luminance is between min and max (intermediate transition)
        margin = 5.0
        is_intermediate = (gray_f > (local_min + margin)) & (gray_f < (local_max - margin))

        return is_edge_neighborhood & is_intermediate

    def compute_perceptual_diff(
        self,
        img1: np.ndarray,
        img2: np.ndarray
    ) -> Tuple[np.ndarray, int, float]:
        """
        Computes pixel-wise perceptual difference mask using normalized Euclidean color distance.
        Incorporates Anti-Aliasing suppression to prevent font-rendering false positives.

        Returns:
            diff_mask (uint8 array, 255 for diff, 0 for identical),
            diff_pixel_count (int),
            diff_ratio (float, percentage)
        """
        # 1. Normalized Euclidean color distance in RGB space
        # Max distance between two 8-bit RGB pixels is sqrt(255^2 * 3) ~ 441.67
        diff_float = img1.astype(np.float32) - img2.astype(np.float32)
        euclidean_dist = np.sqrt(np.sum(diff_float ** 2, axis=2))
        max_dist = 441.6729559300637
        norm_dist = euclidean_dist / max_dist

        # Initial difference candidate mask
        diff_candidates = norm_dist > self.color_threshold

        # 2. Anti-Aliasing Detection filter
        if self.detect_anti_aliasing:
            gray1 = cv2.cvtColor(img1, cv2.COLOR_RGB2GRAY)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_RGB2GRAY)

            aa_mask1 = self._detect_anti_aliasing_mask(gray1)
            aa_mask2 = self._detect_anti_aliasing_mask(gray2)

            # A pixel is considered an anti-aliased artifact if it falls on an AA boundary
            # in either image AND its color distance is within a relaxed tolerance (2x threshold)
            is_aa_artifact = (aa_mask1 | aa_mask2) & (norm_dist <= (self.color_threshold * 2.2))
            diff_mask_bool = diff_candidates & (~is_aa_artifact)
        else:
            diff_mask_bool = diff_candidates

        diff_pixel_count = int(np.sum(diff_mask_bool))
        total_pixels = img1.shape[0] * img1.shape[1]
        diff_ratio = (diff_pixel_count / total_pixels) * 100.0

        # Convert bool mask to binary uint8 (255 for diff, 0 for match)
        diff_mask_uint8 = (diff_mask_bool * 255).astype(np.uint8)

        return diff_mask_uint8, diff_pixel_count, diff_ratio

    @staticmethod
    def compute_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
        """
        Computes the Structural Similarity Index Measure (SSIM) between two images.
        Scale ranges from -1.0 to 1.0 (1.0 signifies identical structural composition).
        """
        gray1 = cv2.cvtColor(img1, cv2.COLOR_RGB2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_RGB2GRAY)

        score, _ = ssim(gray1, gray2, full=True)
        # Clamp score between 0.0 and 1.0 for UI testing scoring metrics
        return max(0.0, min(1.0, float(score)))

    @staticmethod
    def extract_bounding_boxes(
        diff_mask: np.ndarray,
        min_area: int = 20,
        dilation_kernel_size: Tuple[int, int] = (15, 15)
    ) -> List[Dict[str, int]]:
        """
        Performs morphological defect clustering and contour extraction.
        Groups neighboring differing pixels into coherent visual defect regions.

        Returns:
            List of bounding box dicts: [{'x': int, 'y': int, 'width': int, 'height': int}]
        """
        # Morphological dilation to coalesce adjacent defect pixels (e.g. text letters or icon edges)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, dilation_kernel_size)
        dilated_mask = cv2.dilate(diff_mask, kernel, iterations=1)

        contours, _ = cv2.findContours(dilated_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        bounding_boxes: List[Dict[str, int]] = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area:
                continue
            x, y, w, h = cv2.boundingRect(cnt)
            bounding_boxes.append({
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h)
            })

        # Sort top-to-bottom, left-to-right for consistent presentation
        bounding_boxes.sort(key=lambda b: (b["y"], b["x"]))
        return bounding_boxes

    @staticmethod
    def _classify_color_name(rgb: np.ndarray) -> str:
        """Translates RGB values into intuitive human-readable color labels."""
        r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
        hsv = cv2.cvtColor(np.uint8([[[r, g, b]]]), cv2.COLOR_RGB2HSV)[0][0]
        h, s, v = int(hsv[0]), int(hsv[1]), int(hsv[2])

        if v < 45:
            return "Đen / Nền tối"
        if s < 25 and v > 210:
            return "Trắng"
        if s < 30:
            return "Xám / Bạc"

        if h < 10 or h >= 170:
            return "Đỏ / Crimson"
        if h < 24:
            return "Cam / Amber"
        if h < 38:
            return "Vàng"
        if h < 85:
            return "Xanh lục / Emerald"
        if h < 105:
            return "Xanh lơ / Cyan"
        if h < 128:
            return "Xanh dương / Indigo"
        if h < 155:
            return "Tím / Violet"
        return "Hồng / Rose"

    @classmethod
    def _analyze_box_semantics(
        cls,
        box: Dict[str, Any],
        baseline_img: np.ndarray,
        current_img: np.ndarray,
        canvas_w: int,
        canvas_h: int
    ) -> Dict[str, Any]:
        """
        Determines the semantic nature of a defect cluster:
        - Layout shift displacement (dx, dy)
        - Color mutation (hue / saturation)
        - Component regional role (Header, Hero, Feature Card, Footer)
        - Severity impact assessment
        """
        x, y, w, h = box["x"], box["y"], box["width"], box["height"]

        # 1. Regional localization
        rel_y = (y + h / 2.0) / float(canvas_h)
        rel_x = (x + w / 2.0) / float(canvas_w)

        if rel_y < 0.12:
            section = "Thanh điều hướng / Header"
        elif rel_y < 0.45:
            section = "Khu vực Hero / CTA Chính"
        elif rel_y < 0.80:
            section = "Nội dung thân trang / Feature Grid"
        else:
            section = "Chân trang / Footer"

        if rel_x < 0.33:
            col = "Cột trái"
        elif rel_x > 0.66:
            col = "Cột phải"
        else:
            col = "Vị trí Trung tâm"

        region_name = f"{section} ({col})"

        # 2. Extract crops
        roi_b = baseline_img[y:y+h, x:x+w]
        roi_c = current_img[y:y+h, x:x+w]

        # Dark theme background reference
        bg_ref = np.array([15, 23, 42])
        diff_bg_b = np.linalg.norm(roi_b.astype(float) - bg_ref, axis=2)
        diff_bg_c = np.linalg.norm(roi_c.astype(float) - bg_ref, axis=2)

        fg_b = diff_bg_b > 35
        fg_c = diff_bg_c > 35

        mean_rgb_b = np.mean(roi_b[fg_b], axis=0) if np.any(fg_b) else np.mean(roi_b, axis=(0, 1))
        mean_rgb_c = np.mean(roi_c[fg_c], axis=0) if np.any(fg_c) else np.mean(roi_c, axis=(0, 1))

        color_name_b = cls._classify_color_name(mean_rgb_b)
        color_name_c = cls._classify_color_name(mean_rgb_c)
        has_color_shift = (color_name_b != color_name_c) and (np.linalg.norm(mean_rgb_b - mean_rgb_c) > 35)

        # 3. Detect Layout Shift (Displacement) via Edge Correlation
        has_layout_shift = False
        detected_dy = 0
        if h > 18 and w > 18:
            try:
                gray_b = cv2.cvtColor(baseline_img, cv2.COLOR_RGB2GRAY)
                gray_c = cv2.cvtColor(current_img, cv2.COLOR_RGB2GRAY)
                edge_b = cv2.Canny(gray_b, 50, 150)
                edge_c = cv2.Canny(gray_c, 50, 150)

                th_sub = min(30, h // 2)
                tpl = edge_b[y:y+th_sub, x:x+w]
                if np.sum(tpl) > 0:
                    search_margin = 40
                    y1 = max(0, y - search_margin)
                    y2 = min(canvas_h, y + h + search_margin)
                    search_win = edge_c[y1:y2, x:x+w]

                    match_res = cv2.matchTemplate(search_win, tpl, cv2.TM_CCOEFF_NORMED)
                    _, max_val, _, max_loc = cv2.minMaxLoc(match_res)
                    if max_val > 0.65:
                        actual_dy = (y1 + max_loc[1]) - y
                        if abs(actual_dy) >= 5:
                            has_layout_shift = True
                            detected_dy = actual_dy
            except Exception:
                pass

        # 4. Synthesize diagnostic descriptions
        descriptions = []
        defect_types = []
        severity = "MEDIUM"
        area = w * h

        if has_layout_shift:
            dir_str = f"xuống dưới ~{detected_dy}px" if detected_dy > 0 else f"lên trên ~{abs(detected_dy)}px"
            descriptions.append(f"Dịch chuyển bố cục {dir_str} (Layout Shift / Vertical Offset)")
            defect_types.append("Lệch Vị Trí")
            severity = "HIGH"

        if has_color_shift:
            descriptions.append(f"Đổi mã màu thành phần từ [{color_name_b}] sang [{color_name_c}]")
            defect_types.append("Sai Màu Sắc")
            if severity != "HIGH" and area > 3500:
                severity = "HIGH"

        if not descriptions:
            if area > 10000:
                descriptions.append("Biến đổi cấu trúc hình khối và khối văn bản lớn")
                defect_types.append("Vỡ Bố Cục")
                severity = "HIGH"
            elif area > 1500:
                descriptions.append("Thay đổi nội dung văn bản hoặc kích thước chữ")
                defect_types.append("Thay Đổi Nội Dung")
                severity = "MEDIUM"
            else:
                descriptions.append("Lệch viền lề hoặc padding chi tiết nhỏ")
                defect_types.append("Lệch Padding/Viền")
                severity = "LOW"

        final_description = "; ".join(descriptions)
        final_defect_type = " & ".join(defect_types) if defect_types else "Biến đổi giao diện"

        return {
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "region_name": region_name,
            "defect_type": final_defect_type,
            "severity": severity,
            "description": final_description
        }

    @staticmethod
    def _generate_viewport_summary(
        bounding_boxes: List[Dict[str, Any]],
        diff_ratio: float,
        ssim_score: float,
        was_padded: bool,
        canvas_h_diff: int
    ) -> Tuple[str, List[str]]:
        """Generates natural language executive summary and bulleted insights."""
        if not bounding_boxes or diff_ratio == 0:
            return (
                "Hoàn hảo: Không phát hiện bất kỳ sự sai lệch điểm ảnh hay biến dạng cấu trúc nào. Giao diện trùng khớp 100% với Baseline chuẩn.",
                ["✓ Điểm SSIM tuyệt đối 1.0000", "✓ 0 điểm ảnh khác biệt", "✓ Bố cục ổn định tuyệt đối"]
            )

        insights = []
        layout_shifts = [b for b in bounding_boxes if "Lệch Vị Trí" in b.get("defect_type", "")]
        color_shifts = [b for b in bounding_boxes if "Sai Màu Sắc" in b.get("defect_type", "")]
        high_severity = [b for b in bounding_boxes if b.get("severity") == "HIGH"]

        if layout_shifts:
            top_shift = layout_shifts[0]
            insights.append(f"⚠️ Phát hiện xô lệch bố cục tại {top_shift['region_name']}: {top_shift['description']}.")

        if color_shifts:
            top_color = color_shifts[0]
            insights.append(f"🎨 Phát hiện đổi màu sắc hiển thị tại {top_color['region_name']}: {top_color['description']}.")

        if was_padded and abs(canvas_h_diff) > 0:
            insights.append(f"📐 Chiều cao trang bị thay đổi lệch {abs(canvas_h_diff)}px so với Baseline chuẩn.")

        if ssim_score < 0.90:
            insights.append(f"🚨 Điểm tương đồng cấu trúc SSIM giảm sâu xuống {ssim_score:.4f} (biến dạng hình học rõ rệt).")
        else:
            insights.append(f"ℹ️ Điểm SSIM đạt {ssim_score:.4f} (cấu trúc khung trang nhìn chung duy trì tốt).")

        summary = (
            f"Phát hiện tổng cộng {len(bounding_boxes)} vùng khiếm khuyết hiển thị (Diff Ratio: {diff_ratio:.2f}%). "
            f"Gồm {len(high_severity)} vùng cảnh báo mức độ cao (High Impact) và {len(layout_shifts)} thành phần bị dịch chuyển vị trí. "
            f"Trọng tâm sai khác tập trung tại khu vực Hero/CTA."
        )

        return summary, insights

    def generate_diff_image(
        self,
        base_img: np.ndarray,
        diff_mask: np.ndarray,
        bounding_boxes: List[Dict[str, int]]
    ) -> np.ndarray:
        """
        Synthesizes the diagnostic Diff Image:
        1. Base context rendered as dimmed grayscale for high readability.
        2. Regressed pixels painted in fluorescent crimson (#FF0055).
        3. Visual defect clusters enclosed with bounding box frames.
        """
        gray = cv2.cvtColor(base_img, cv2.COLOR_RGB2GRAY)
        dimmed_gray = np.clip(gray * 0.45 + 130, 0, 255).astype(np.uint8)
        canvas = cv2.cvtColor(dimmed_gray, cv2.COLOR_GRAY2RGB)

        is_diff = diff_mask > 0
        canvas[is_diff] = DIFF_COLOR_RGB

        canvas_bgr = cv2.cvtColor(canvas, cv2.COLOR_RGB2BGR)
        for box in bounding_boxes:
            x, y, w, h = box["x"], box["y"], box["width"], box["height"]
            cv2.rectangle(
                canvas_bgr,
                (x, y),
                (x + w, y + h),
                BBOX_COLOR_BGR,
                BBOX_THICKNESS
            )

        return cv2.cvtColor(canvas_bgr, cv2.COLOR_BGR2RGB)

    def compare(
        self,
        baseline_path: Path,
        current_path: Path,
        diff_output_path: Path
    ) -> Dict[str, Any]:
        """
        Executes end-to-end visual regression comparison between baseline and current image.
        """
        start_time = time.time()

        # 1. Load images
        baseline_img = self.load_image(baseline_path)
        current_img = self.load_image(current_path)

        orig_h_b = baseline_img.shape[0]
        orig_h_c = current_img.shape[0]
        h_diff = orig_h_c - orig_h_b

        # 2. Dimension Normalization
        baseline_norm, current_norm, was_padded = self.normalize_dimensions(
            baseline_img,
            current_img
        )

        height, width = baseline_norm.shape[:2]
        total_pixels = width * height

        # 3. Compute Perceptual Difference
        diff_mask, diff_pixel_count, diff_ratio = self.compute_perceptual_diff(
            baseline_norm,
            current_norm
        )

        # 4. Compute Structural Similarity (SSIM)
        ssim_score = self.compute_ssim(baseline_norm, current_norm)

        # 5. Defect Clustering & Semantic Bounding Box extraction
        raw_boxes = self.extract_bounding_boxes(diff_mask)
        annotated_boxes = [
            self._analyze_box_semantics(box, baseline_norm, current_norm, width, height)
            for box in raw_boxes
        ]

        # 6. Generate Natural Language Summaries
        change_summary, semantic_insights = self._generate_viewport_summary(
            annotated_boxes,
            diff_ratio,
            ssim_score,
            was_padded,
            h_diff
        )

        # 7. Generate and save diagnostic Diff Image
        diff_image_rgb = self.generate_diff_image(
            baseline_norm,
            diff_mask,
            annotated_boxes
        )

        diff_output_path.parent.mkdir(parents=True, exist_ok=True)
        diff_pil = Image.fromarray(diff_image_rgb)
        diff_pil.save(diff_output_path, format="PNG")

        # 8. Evaluate Pass/Fail Status
        is_passed = diff_ratio <= self.diff_ratio_threshold
        status = "PASSED" if is_passed else "FAILED"

        duration_ms = (time.time() - start_time) * 1000.0

        logger.info(
            f"Comparison completed in {duration_ms:.1f}ms: Status={status} | "
            f"Diff Ratio={diff_ratio:.4f}% | SSIM={ssim_score:.4f} | "
            f"Defects={len(annotated_boxes)} | Summary: {change_summary[:60]}..."
        )

        return {
            "status": status,
            "is_passed": is_passed,
            "diff_ratio": round(diff_ratio, 4),
            "diff_ratio_threshold": self.diff_ratio_threshold,
            "ssim_score": round(ssim_score, 4),
            "diff_pixel_count": diff_pixel_count,
            "total_pixels": total_pixels,
            "was_dimension_normalized": was_padded,
            "normalized_width": width,
            "normalized_height": height,
            "bounding_boxes": annotated_boxes,
            "change_summary": change_summary,
            "semantic_insights": semantic_insights,
            "diff_image_path": str(diff_output_path),
            "duration_ms": round(duration_ms, 2)
        }
