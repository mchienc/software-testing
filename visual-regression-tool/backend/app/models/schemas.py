"""
Pydantic Schemas & Data Transfer Objects (DTOs)
Strict validation for test suites, execution runs, and visual diff analysis.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    """Coordinates and semantic diagnostic attributes of a clustered UI defect region."""
    x: int = Field(..., description="Top-left X coordinate")
    y: int = Field(..., description="Top-left Y coordinate")
    width: int = Field(..., description="Bounding box width")
    height: int = Field(..., description="Bounding box height")
    region_name: str = Field("Khu vực chung", description="Vị trí tương đối của thành phần trên layout")
    defect_type: str = Field("Biến đổi hiển thị", description="Phân loại: Lệch Bố Cục | Sai Màu Sắc | Thay Đổi Nội Dung")
    severity: str = Field("MEDIUM", description="Mức độ nghiêm trọng: HIGH | MEDIUM | LOW")
    description: str = Field("", description="Mô tả tương đối chi tiết về sự thay đổi")

class ViewportResult(BaseModel):
    """Granular comparison metrics for a specific device viewport."""
    viewport: str = Field(..., description="Preset key: desktop | tablet | mobile")
    viewport_width: int
    viewport_height: int
    status: str = Field(..., description="PASSED | FAILED | ERROR")
    diff_ratio: float = Field(0.0, description="Percentage of differing pixels (0.0 to 100.0%)")
    ssim_score: float = Field(1.0, description="Structural Similarity Index (0.0 to 1.0)")
    diff_pixels: int = Field(0, description="Absolute count of defect pixels")
    total_pixels: int = Field(0, description="Total normalized image pixel count")
    bounding_boxes: List[BoundingBox] = Field(default_factory=list, description="Clustered visual defect regions")
    baseline_image_url: Optional[str] = None
    current_image_url: Optional[str] = None
    diff_image_url: Optional[str] = None
    error_message: Optional[str] = None
    duration_ms: float = 0.0
    change_summary: Optional[str] = Field(None, description="Tóm tắt tổng quan về các thay đổi trên viewport này")
    semantic_insights: List[str] = Field(default_factory=list, description="Danh sách các phát hiện quan trọng nổi bật")

class TestSuiteBase(BaseModel):
    name: str = Field(..., example="E-Commerce Landing Page")
    url: str = Field(..., example="http://localhost:8000/demo/v1")
    baseline_url: Optional[str] = Field(None, description="Optional distinct baseline URL (e.g., Production vs Staging)")
    viewports: List[str] = Field(default=["desktop", "tablet", "mobile"], description="Target responsive viewports")
    threshold: float = Field(0.05, description="Max acceptable diff ratio (%)")
    color_threshold: float = Field(0.1, description="Color perceptual tolerance gamma (0.0 to 1.0)")
    mask_selectors: List[str] = Field(default_factory=list, description="CSS selectors of dynamic elements to mask")

class TestSuiteCreate(TestSuiteBase):
    pass

class TestSuite(TestSuiteBase):
    id: str
    has_baseline: bool = False
    created_at: str
    updated_at: str

class TestRunTrigger(BaseModel):
    override_url: Optional[str] = Field(None, description="Temporary URL to test without updating suite")
    capture_as_baseline: bool = Field(False, description="Whether to capture and set as new baseline immediately")

class BaselineCaptureRequest(BaseModel):
    url_override: Optional[str] = Field(None, description="Optional custom URL to capture baseline from (defaults to baseline_url or url)")

class BaselineItem(BaseModel):
    viewport: str
    image_url: str
    width: Optional[int] = None
    height: Optional[int] = None
    file_path: Optional[str] = None
    size_bytes: Optional[int] = None
    updated_at: Optional[str] = None

class BaselineCaptureResponse(BaseModel):
    suite_id: str
    suite_name: str
    captured_url: str
    message: str
    baselines: List[BaselineItem]

class TestRunResponse(BaseModel):
    id: str
    suite_id: str
    suite_name: str
    target_url: str
    status: str = Field(..., description="RUNNING | COMPLETED | FAILED")
    overall_status: str = Field(..., description="PASSED | FAILED | ERROR")
    started_at: str
    completed_at: Optional[str] = None
    duration_seconds: float = 0.0
    total_viewports: int = 0
    passed_viewports: int = 0
    failed_viewports: int = 0
    executive_summary: Optional[str] = Field(None, description="Tóm tắt tổng quan mức độ thay đổi của toàn bộ phiên kiểm thử")
    results: List[ViewportResult] = Field(default_factory=list)
