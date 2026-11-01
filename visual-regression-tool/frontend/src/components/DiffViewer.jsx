import React, { useState } from 'react';
import { api } from '../services/api';
import ImageSlider from './ImageSlider';
import BlinkCompare from './BlinkCompare';
import {
  Columns,
  SlidersHorizontal,
  ScanEye,
  CheckCheck,
  Smartphone,
  Tablet,
  Monitor,
  AlertTriangle,
  FileText,
  Printer,
  Layers,
  Palette,
  MoveVertical,
  Ruler,
  Activity,
  Info,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

/**
 * Strips leading emojis from legacy backend semantic_insights strings
 * and returns a clean string + semantic category for vector icon pairing.
 */
function parseSemanticInsight(rawText = '') {
  const cleaned = rawText
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2139}\u{FE00}-\u{FE0F}\s]+/u, '')
    .trim();

  const lower = cleaned.toLowerCase();
  if (lower.includes('màu') || lower.includes('color')) {
    return { text: cleaned, type: 'color', Icon: Palette, colorClass: 'text-amber-500' };
  }
  if (lower.includes('xô lệch') || lower.includes('dịch chuyển') || lower.includes('layout')) {
    return { text: cleaned, type: 'layout', Icon: MoveVertical, colorClass: 'text-rose-500' };
  }
  if (lower.includes('chiều cao') || lower.includes('kích thước')) {
    return { text: cleaned, type: 'dimension', Icon: Ruler, colorClass: 'text-blue-500' };
  }
  if (lower.includes('ssim')) {
    return { text: cleaned, type: 'ssim', Icon: Activity, colorClass: 'text-indigo-500' };
  }
  return { text: cleaned, type: 'info', Icon: Info, colorClass: 'text-ink-secondary' };
}

export default function DiffViewer({ run, onApproveSuccess }) {
  const [selectedViewportIndex, setSelectedViewportIndex] = useState(0);
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'side-by-side' | 'blink' | 'diff-only'
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approveStatus, setApproveStatus] = useState(null);

  // Defect cluster filtering
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [defectSearch, setDefectSearch] = useState('');

  if (!run || !run.results || run.results.length === 0) {
    return (
      <div className="bg-surface-panel border border-line-subtle rounded-lg p-8 text-center text-ink-muted text-xs font-mono">
        Không có dữ liệu kết quả so sánh hình ảnh cho phiên chạy này.
      </div>
    );
  }

  const currentResult = run.results[selectedViewportIndex] || run.results[0];
  const baselineUrl = api.getImageUrl(currentResult.baseline_image_url);
  const currentUrl = api.getImageUrl(currentResult.current_image_url);
  const diffUrl = api.getImageUrl(currentResult.diff_image_url);

  const handleApprove = async () => {
    setIsApproving(true);
    setApproveStatus(null);
    try {
      await api.approveBaseline(run.id);
      setApproveStatus({
        ok: true,
        text: 'Đã cập nhật bộ ảnh hiện tại làm ảnh chuẩn gốc (Baseline) mới cho kịch bản này.',
      });
      setConfirmApprove(false);
      if (onApproveSuccess) onApproveSuccess();
    } catch (err) {
      setApproveStatus({
        ok: false,
        text: `Không thể duyệt Baseline: ${err.message}`,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const getViewportIcon = (vp) => {
    if (vp.toLowerCase().includes('mobile'))
      return <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />;
    if (vp.toLowerCase().includes('tablet'))
      return <Tablet className="w-3.5 h-3.5" aria-hidden="true" />;
    return <Monitor className="w-3.5 h-3.5" aria-hidden="true" />;
  };

  const allBboxes = currentResult.bounding_boxes || [];
  const filteredBboxes = allBboxes.filter((box) => {
    if (severityFilter !== 'ALL' && (box.severity || 'MEDIUM') !== severityFilter) {
      return false;
    }
    if (defectSearch.trim()) {
      const q = defectSearch.toLowerCase();
      const hay = `${box.region_name || ''} ${box.defect_type || ''} ${box.description || ''}`.toLowerCase();
      return hay.includes(q);
    }
    return true;
  });

  const severityLabel = (sev) => {
    if (sev === 'HIGH') return 'NGHIÊM TRỌNG (HIGH)';
    if (sev === 'MEDIUM') return 'TRUNG BÌNH (MEDIUM)';
    return 'THẤP (LOW)';
  };

  return (
    <div className="bg-surface-panel border border-line-subtle rounded-lg overflow-hidden">
      {/* Unified Inspector Control Bar */}
      <div className="p-4 bg-surface-elevated border-b border-line-subtle flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left: Viewport Segmented Tabs with Live Diff % */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Chọn màn hình">
          {run.results.map((res, idx) => {
            const isSelected = idx === selectedViewportIndex;
            const isPass = res.status === 'PASSED';
            return (
              <button
                key={res.viewport}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedViewportIndex(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono font-medium cursor-pointer transition-colors border ${
                  isSelected
                    ? 'bg-surface-panel text-ink-primary border-line-strong shadow-sm'
                    : 'bg-transparent text-ink-secondary border-transparent hover:bg-surface-panel/50 hover:text-ink-primary'
                }`}
              >
                {getViewportIcon(res.viewport)}
                <span className="uppercase font-semibold">{res.viewport}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                    isPass
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-rose-500/10 text-rose-500 font-semibold'
                  }`}
                >
                  {res.diff_ratio.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Center + Right: Inspection Mode Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="bg-surface-inset p-0.5 rounded-md border border-line-subtle flex items-center">
            {[
              { id: 'slider', label: 'Kéo Trượt (Slider)', icon: SlidersHorizontal },
              { id: 'side-by-side', label: '3 Cột Song Song', icon: Columns },
              { id: 'blink', label: 'Chớp Tắt / Đè Lớp', icon: Layers },
              { id: 'diff-only', label: 'Chỉ Vùng Lỗi', icon: ScanEye },
            ].map((mode) => {
              const Icon = mode.icon;
              const active = viewMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewMode(mode.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                    active
                      ? 'bg-surface-panel text-ink-primary border border-line-strong shadow-sm'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {!confirmApprove ? (
              <button
                type="button"
                onClick={() => setConfirmApprove(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium cursor-pointer transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Duyệt làm Baseline</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1 bg-surface-panel border border-emerald-500/50 rounded-md px-2 py-1 text-xs">
                <span className="text-ink-secondary text-[11px] mr-1">Cập nhật làm ảnh chuẩn mới?</span>
                <button
                  type="button"
                  disabled={isApproving}
                  onClick={handleApprove}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold cursor-pointer"
                >
                  {isApproving ? 'Đang lưu...' : 'Đồng ý'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmApprove(false)}
                  className="px-2 py-0.5 text-ink-muted hover:text-ink-primary text-[11px] cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}

            <a
              href={api.getReportUrl(run.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-panel hover:bg-surface-inset text-ink-secondary hover:text-ink-primary border border-line-subtle rounded-md text-xs font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Báo cáo HTML</span>
            </a>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-panel hover:bg-surface-inset text-ink-secondary hover:text-ink-primary border border-line-subtle rounded-md text-xs font-medium cursor-pointer transition-colors no-print"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>In / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inline Status Notification */}
      {approveStatus && (
        <div
          className={`px-4 py-2.5 border-b text-xs flex items-center justify-between ${
            approveStatus.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {approveStatus.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            {approveStatus.text}
          </span>
          <button
            type="button"
            onClick={() => setApproveStatus(null)}
            className="text-[11px] underline cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Viewport Telemetry Strip */}
      <div className="px-4 py-2.5 bg-surface-panel border-b border-line-subtle flex flex-wrap items-center justify-between gap-4 text-xs font-mono tabular-nums">
        <div className="flex flex-wrap items-center gap-5">
          <div>
            <span className="text-ink-muted">KÍCH THƯỚC ẢNH:</span>{' '}
            <span className="text-ink-primary font-semibold">
              {currentResult.viewport_width}×{currentResult.viewport_height}px
            </span>
          </div>
          <div>
            <span className="text-ink-muted">TỶ LỆ SAI LỆCH (DIFF RATIO):</span>{' '}
            <span
              className={`font-bold ${
                currentResult.status === 'PASSED' ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {currentResult.diff_ratio.toFixed(4)}%
            </span>
          </div>
          <div>
            <span className="text-ink-muted">ĐIỂM CẤU TRÚC SSIM:</span>{' '}
            <span className="text-blue-500 font-bold">{currentResult.ssim_score.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-ink-muted">SỐ PIXEL LỆCH:</span>{' '}
            <span className="text-ink-primary">
              {currentResult.diff_pixels.toLocaleString()}{' '}
              <span className="text-ink-muted">
                / {currentResult.total_pixels.toLocaleString()}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-ink-muted">VÙNG LỖI PHÁT HIỆN:</span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
              allBboxes.length === 0
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/25'
            }`}
          >
            {allBboxes.length} cụm vùng lỗi
          </span>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Semantic Root-Cause Diagnostic Panel */}
        {currentResult.change_summary && (
          <div className="p-3.5 bg-surface-elevated border border-line-subtle rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-secondary">
                Phân Tích Nguyên Nhân Thay Đổi Giao Diện ({currentResult.viewport.toUpperCase()})
              </span>
              <span className="text-[11px] font-mono text-ink-muted">
                Thuật toán OpenCV Canny + Phân tích màu HSV
              </span>
            </div>
            <p className="text-xs text-ink-primary leading-relaxed">
              {currentResult.change_summary}
            </p>

            {currentResult.semantic_insights && currentResult.semantic_insights.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-3 border-t border-line-subtle">
                {currentResult.semantic_insights.map((rawInsight, idx) => {
                  const { text, Icon, colorClass } = parseSemanticInsight(rawInsight);
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 bg-surface-panel p-2.5 rounded border border-line-subtle text-xs text-ink-secondary"
                    >
                      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${colorClass}`} aria-hidden="true" />
                      <span className="leading-snug text-ink-primary">{text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Main Optical Comparison Canvas */}
        <div>
          {viewMode === 'slider' && (
            <ImageSlider
              baselineSrc={baselineUrl}
              currentSrc={currentUrl}
              baselineLabel={`Ảnh Gốc Baseline · ${currentResult.viewport.toUpperCase()}`}
              currentLabel={`Ảnh Hiện Tại · ${currentResult.viewport.toUpperCase()}`}
            />
          )}

          {viewMode === 'side-by-side' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="bg-surface-elevated p-2.5 rounded-lg border border-line-subtle">
                <div className="flex items-center justify-between text-[11px] font-mono mb-2 px-1">
                  <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    01 / ẢNH CHUẨN GỐC (BASELINE)
                  </span>
                  <span className="text-ink-muted">v1.0</span>
                </div>
                <div className="overflow-auto max-h-[600px] flex justify-center bg-optical-grid rounded border border-line-subtle p-1">
                  <img
                    src={baselineUrl}
                    alt="Ảnh chuẩn gốc Baseline"
                    className="max-w-full h-auto object-contain"
                  />
                </div>
              </div>

              <div className="bg-surface-elevated p-2.5 rounded-lg border border-rose-500/30">
                <div className="flex items-center justify-between text-[11px] font-mono mb-2 px-1">
                  <span className="font-semibold text-rose-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    02 / BẢN ĐỒ ĐIỂM ẢNH LỆCH (#FF0055)
                  </span>
                  <span className="text-rose-500 tabular-nums">{allBboxes.length} cụm lỗi</span>
                </div>
                <div className="overflow-auto max-h-[600px] flex justify-center bg-optical-grid rounded border border-line-subtle p-1">
                  <img
                    src={diffUrl}
                    alt="Bản đồ điểm ảnh lệch"
                    className="max-w-full h-auto object-contain"
                  />
                </div>
              </div>

              <div className="bg-surface-elevated p-2.5 rounded-lg border border-line-subtle">
                <div className="flex items-center justify-between text-[11px] font-mono mb-2 px-1">
                  <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    03 / ẢNH HIỆN TẠI (CURRENT)
                  </span>
                  <span className="text-ink-muted">v2.0</span>
                </div>
                <div className="overflow-auto max-h-[600px] flex justify-center bg-optical-grid rounded border border-line-subtle p-1">
                  <img
                    src={currentUrl}
                    alt="Ảnh hiện tại Current"
                    className="max-w-full h-auto object-contain"
                  />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'blink' && (
            <BlinkCompare
              baselineSrc={baselineUrl}
              currentSrc={currentUrl}
              baselineLabel={`Ảnh Gốc Baseline · ${currentResult.viewport.toUpperCase()}`}
              currentLabel={`Ảnh Hiện Tại · ${currentResult.viewport.toUpperCase()}`}
            />
          )}

          {viewMode === 'diff-only' && (
            <div className="bg-optical-grid p-4 rounded-lg border border-line-subtle flex justify-center overflow-auto max-h-[700px]">
              <img
                src={diffUrl}
                alt="Bản đồ điểm ảnh sai lệch"
                className="max-w-full h-auto object-contain"
              />
            </div>
          )}
        </div>

        {/* Defect Bounding Boxes Table with Filter & Search */}
        {allBboxes.length > 0 && (
          <div className="pt-4 border-t border-line-subtle">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" aria-hidden="true" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-primary">
                  Danh Sách Các Vùng Khiếm Khuyết Giao Diện ({filteredBboxes.length} / {allBboxes.length})
                </h4>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-surface-elevated p-0.5 rounded border border-line-subtle text-[11px] font-mono">
                  {[
                    { id: 'ALL', label: 'TẤT CẢ' },
                    { id: 'HIGH', label: 'NGHIÊM TRỌNG' },
                    { id: 'MEDIUM', label: 'TRUNG BÌNH' },
                  ].map((sev) => (
                    <button
                      key={sev.id}
                      type="button"
                      onClick={() => setSeverityFilter(sev.id)}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        severityFilter === sev.id
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-ink-secondary hover:text-ink-primary'
                      }`}
                    >
                      {sev.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search
                    className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={defectSearch}
                    onChange={(e) => setDefectSearch(e.target.value)}
                    placeholder="Lọc vùng hoặc loại lỗi..."
                    aria-label="Lọc danh sách vùng lỗi"
                    className="bg-surface-inset border border-line-subtle focus:border-blue-500 rounded pl-8 pr-2.5 py-1 text-xs text-ink-primary w-52"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-line-subtle rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-elevated border-b border-line-subtle text-ink-muted font-mono text-[11px] uppercase">
                    <th className="py-2 px-3">STT</th>
                    <th className="py-2 px-3">Vị Trí Trên Trang</th>
                    <th className="py-2 px-3">Loại Lỗi</th>
                    <th className="py-2 px-3">Mức Độ</th>
                    <th className="py-2 px-3">Mô Tả Chi Tiết Thay Đổi</th>
                    <th className="py-2 px-3 text-right">Tọa Độ &amp; Kích Thước [X, Y, W×H]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle bg-surface-panel">
                  {filteredBboxes.map((box, i) => {
                    const isHigh = box.severity === 'HIGH';
                    const isMedium = box.severity === 'MEDIUM';
                    const badgeColor = isHigh
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                      : isMedium
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      : 'bg-surface-elevated text-ink-secondary border-line-subtle';

                    return (
                      <tr key={i} className="hover:bg-surface-elevated/60 transition-colors">
                        <td className="py-2 px-3 font-mono text-ink-muted tabular-nums">
                          #{i + 1}
                        </td>
                        <td className="py-2 px-3 font-medium text-ink-primary whitespace-nowrap">
                          {box.region_name || 'Khu vực chung'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-ink-secondary whitespace-nowrap">
                          {box.defect_type || 'Sai lệch hiển thị'}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeColor}`}
                          >
                            {severityLabel(box.severity || 'MEDIUM')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-ink-secondary leading-normal">
                          {box.description || 'Phát hiện sai lệch điểm ảnh tại vùng này'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-ink-muted text-right whitespace-nowrap tabular-nums">
                          ({box.x}, {box.y}) &middot; {box.width}×{box.height}px
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
