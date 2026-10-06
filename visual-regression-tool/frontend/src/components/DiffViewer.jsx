import React, { useState } from 'react';
import { api } from '../services/api';
import ImageSlider from './ImageSlider';
import { 
  Columns, 
  SlidersHorizontal, 
  Sparkles, 
  CheckCheck, 
  ExternalLink, 
  Smartphone, 
  Tablet, 
  Monitor,
  AlertTriangle,
  FileText
} from 'lucide-react';

export default function DiffViewer({ run, onApproveSuccess }) {
  const [selectedViewportIndex, setSelectedViewportIndex] = useState(0);
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'side-by-side' | 'diff-only'
  const [isApproving, setIsApproving] = useState(false);
  const [approveMessage, setApproveMessage] = useState(null);

  if (!run || !run.results || run.results.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        Không có dữ liệu kết quả phân tích hình ảnh.
      </div>
    );
  }

  const currentResult = run.results[selectedViewportIndex] || run.results[0];

  const baselineUrl = api.getImageUrl(currentResult.baseline_image_url);
  const currentUrl = api.getImageUrl(currentResult.current_image_url);
  const diffUrl = api.getImageUrl(currentResult.diff_image_url);

  const handleApprove = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn duyệt ảnh phiên bản này làm Baseline chuẩn mới?')) return;
    setIsApproving(true);
    setApproveMessage(null);
    try {
      await api.approveBaseline(run.id);
      setApproveMessage('✓ Đã cập nhật thành công làm Baseline chuẩn mới!');
      if (onApproveSuccess) onApproveSuccess();
    } catch (err) {
      setApproveMessage(`❌ Lỗi: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const getViewportIcon = (vp) => {
    if (vp.toLowerCase().includes('mobile')) return <Smartphone className="w-4 h-4" />;
    if (vp.toLowerCase().includes('tablet')) return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      {/* Top Controls: Viewport Tabs + Mode Switches */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        {/* Viewport Selectors */}
        <div className="flex items-center gap-2">
          {run.results.map((res, idx) => {
            const isSelected = idx === selectedViewportIndex;
            const isPass = res.status === 'PASSED';
            return (
              <button
                key={res.viewport}
                onClick={() => setSelectedViewportIndex(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {getViewportIcon(res.viewport)}
                <span>{res.viewport.toUpperCase()}</span>
                <span className={`w-2 h-2 rounded-full ${isPass ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              </button>
            );
          })}
        </div>

        {/* View Modes */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center">
            <button
              onClick={() => setViewMode('slider')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === 'slider' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Slider
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === 'side-by-side' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              3 Cột Song Song
            </button>
            <button
              onClick={() => setViewMode('diff-only')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === 'diff-only' ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Chỉ Diff (#FF0055)
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            {isApproving ? 'Đang duyệt...' : 'Duyệt làm Baseline'}
          </button>

          <a
            href={api.getReportUrl(run.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
          >
            <FileText className="w-4 h-4" />
            Báo cáo HTML
          </a>
        </div>
      </div>

      {approveMessage && (
        <div className="mt-4 p-3 bg-slate-950 border border-emerald-500/30 rounded-lg text-xs text-emerald-300">
          {approveMessage}
        </div>
      )}

      {/* Viewport Granular Stat Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-3 my-2 text-xs text-slate-300">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-500">Độ phân giải:</span>{' '}
            <span className="font-semibold text-white">{currentResult.viewport_width} &times; {currentResult.viewport_height} px</span>
          </div>
          <div>
            <span className="text-slate-500">Tỷ lệ sai biệt (Diff Ratio):</span>{' '}
            <span className="font-bold text-rose-400">{currentResult.diff_ratio.toFixed(4)}%</span>
          </div>
          <div>
            <span className="text-slate-500">Chỉ số SSIM:</span>{' '}
            <span className="font-bold text-cyan-400">{currentResult.ssim_score.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-slate-500">Pixel lệch:</span>{' '}
            <span className="font-mono text-amber-300">{currentResult.diff_pixels.toLocaleString()} / {currentResult.total_pixels.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Vùng khiếm khuyết:</span>
          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
            {currentResult.bounding_boxes.length} cụm Bounding Box
          </span>
        </div>
      </div>

      {/* Semantic Change Summary & Diagnostic Insights */}
      {currentResult.change_summary && (
        <div className="mb-4 p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Mô Tả Tương Đối Về Sự Thay Đổi (Semantic Change Analysis)
            </h4>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed mb-3">
            {currentResult.change_summary}
          </p>

          {currentResult.semantic_insights && currentResult.semantic_insights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
              {currentResult.semantic_insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded border border-slate-800 text-slate-300">
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Image Comparison Area */}
      <div className="mt-2">
        {viewMode === 'slider' && (
          <ImageSlider
            baselineSrc={baselineUrl}
            currentSrc={currentUrl}
            baselineLabel={`Baseline (${currentResult.viewport})`}
            currentLabel={`Current (${currentResult.viewport})`}
          />
        )}

        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <p className="text-xs font-semibold text-emerald-400 mb-2">1. Baseline (Chuẩn)</p>
              <div className="overflow-auto max-h-[600px] flex justify-center bg-black rounded">
                <img src={baselineUrl} alt="Baseline" className="max-w-full h-auto object-contain" />
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-rose-900/40">
              <p className="text-xs font-semibold text-rose-400 mb-2">2. Perceptual Diff (#FF0055)</p>
              <div className="overflow-auto max-h-[600px] flex justify-center bg-black rounded">
                <img src={diffUrl} alt="Diff" className="max-w-full h-auto object-contain" />
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <p className="text-xs font-semibold text-amber-400 mb-2">3. Current (Hiện tại)</p>
              <div className="overflow-auto max-h-[600px] flex justify-center bg-black rounded">
                <img src={currentUrl} alt="Current" className="max-w-full h-auto object-contain" />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'diff-only' && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-center overflow-auto max-h-[700px]">
            <img src={diffUrl} alt="Diff Highlight" className="max-w-full h-auto object-contain" />
          </div>
        )}
      </div>

      {/* Defect Bounding Boxes Table */}
      {currentResult.bounding_boxes && currentResult.bounding_boxes.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-800">
          <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Chi tiết các cụm Bounding Box phát hiện lỗi (Defect Clusters)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-800 bg-slate-950 rounded-lg">
              <thead>
                <tr className="bg-slate-800/60 text-slate-400">
                  <th className="p-2.5 border border-slate-800 font-medium">STT</th>
                  <th className="p-2.5 border border-slate-800 font-medium">Vị trí Layout</th>
                  <th className="p-2.5 border border-slate-800 font-medium">Phân loại lỗi</th>
                  <th className="p-2.5 border border-slate-800 font-medium">Mức độ</th>
                  <th className="p-2.5 border border-slate-800 font-medium">Mô tả tương đối về thay đổi</th>
                  <th className="p-2.5 border border-slate-800 font-medium">Tọa độ & Kích thước</th>
                </tr>
              </thead>
              <tbody>
                {currentResult.bounding_boxes.map((box, i) => {
                  const isHigh = box.severity === 'HIGH';
                  const isMedium = box.severity === 'MEDIUM';
                  const badgeColor = isHigh 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                    : isMedium 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700';

                  return (
                    <tr key={i} className="hover:bg-slate-900/60 transition">
                      <td className="p-2.5 border border-slate-800 font-mono text-cyan-400 font-semibold">#{i + 1}</td>
                      <td className="p-2.5 border border-slate-800 text-cyan-300 font-medium whitespace-nowrap">{box.region_name || 'Khu vực chung'}</td>
                      <td className="p-2.5 border border-slate-800 text-slate-200 font-semibold whitespace-nowrap">{box.defect_type || 'Biến đổi giao diện'}</td>
                      <td className="p-2.5 border border-slate-800 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                          {box.severity || 'MEDIUM'}
                        </span>
                      </td>
                      <td className="p-2.5 border border-slate-800 text-slate-300 leading-normal">
                        {box.description || 'Phát hiện sai khác pixel tại vùng này'}
                      </td>
                      <td className="p-2.5 border border-slate-800 font-mono text-slate-400 whitespace-nowrap">
                        ({box.x}, {box.y}) &bull; {box.width}&times;{box.height}px
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
  );
}
