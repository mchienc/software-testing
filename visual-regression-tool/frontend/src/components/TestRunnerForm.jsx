import React, { useState } from 'react';
import { Play, Plus, Settings2, ShieldAlert, Camera } from 'lucide-react';

export default function TestRunnerForm({ onSubmit, onCaptureBaseline, isRunning, isCapturingBaseline }) {
  const [name, setName] = useState('SaaSify Visual Suite');
  const [url, setUrl] = useState('http://localhost:8000/demo/v2_regression/index.html');
  const [baselineUrl, setBaselineUrl] = useState('http://localhost:8000/demo/v1_baseline/index.html');
  const [viewports, setViewports] = useState(['desktop', 'tablet', 'mobile']);
  const [threshold, setThreshold] = useState(0.05);
  const [colorThreshold, setColorThreshold] = useState(0.1);
  const [maskInput, setMaskInput] = useState('.timestamp');

  const toggleViewport = (vp) => {
    if (viewports.includes(vp)) {
      if (viewports.length === 1) return; // keep at least 1
      setViewports(viewports.filter((v) => v !== vp));
    } else {
      setViewports([...viewports, vp]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const masks = maskInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    onSubmit({
      name,
      url,
      baseline_url: baselineUrl.trim() || null,
      viewports,
      threshold: parseFloat(threshold),
      color_threshold: parseFloat(colorThreshold),
      mask_selectors: masks,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl mb-8">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
          <Settings2 className="w-5 h-5 text-cyan-400" />
          <span>Cấu hình Kịch bản Kiểm thử Hồi quy (Test Suite Runner)</span>
        </div>
        <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
          Black-box UI Automation
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Tên Kịch Bản (Suite Name)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Ngưỡng Sai Số Cho Phép (Threshold Diff Ratio %)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">Mặc định: 0.05%</span>
            </div>
          </div>
        </div>

        {/* URLs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 uppercase">
                URL Cần Kiểm Thử (Current / Test URL)
              </label>
              <button
                type="button"
                onClick={() => setUrl('http://localhost:8000/demo/v2_regression/index.html')}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Gán Demo v2.0 (Regression)
              </button>
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 uppercase">
                URL Ảnh Chuẩn Gốc (Baseline URL - Tùy chọn)
              </label>
              <button
                type="button"
                onClick={() => setBaselineUrl('http://localhost:8000/demo/v1_baseline/index.html')}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                Gán Demo v1.0 (Baseline)
              </button>
            </div>
            <input
              type="text"
              value={baselineUrl}
              onChange={(e) => setBaselineUrl(e.target.value)}
              placeholder="Để trống nếu đã có Baseline lưu sẵn"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        {/* Viewport Checkboxes & Masking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
              Các Độ Phân Giải Kiểm Thử (Responsive Viewports)
            </label>
            <div className="flex gap-4">
              {[
                { id: 'desktop', label: 'Desktop (1920×1080)' },
                { id: 'tablet', label: 'Tablet (768×1024)' },
                { id: 'mobile', label: 'Mobile (375×812)' },
              ].map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 select-none hover:border-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={viewports.includes(item.id)}
                    onChange={() => toggleViewport(item.id)}
                    className="accent-cyan-500 rounded"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              CSS Selectors Che Vùng Động (Dynamic Masking)
            </label>
            <input
              type="text"
              value={maskInput}
              onChange={(e) => setMaskInput(e.target.value)}
              placeholder=".timestamp, .ads, #live-counter"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Các selector phân tách bởi dấu phẩy, sẽ được bôi đen trước khi chụp để tránh False Positive.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
          <div className="text-xs text-slate-400">
            <span className="text-amber-400 font-semibold">Quy trình chuẩn:</span> 1. Chụp Baseline trước &rarr; 2. Sửa code / Deploy &rarr; 3. Chạy Kiểm Thử So Khớp.
          </div>

          <div className="flex items-center gap-3">
            {/* 1. Dedicated Capture Baseline Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const masks = maskInput.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
                onCaptureBaseline({
                  name,
                  url,
                  baseline_url: baselineUrl.trim() || null,
                  viewports,
                  threshold: parseFloat(threshold),
                  color_threshold: parseFloat(colorThreshold),
                  mask_selectors: masks,
                });
              }}
              disabled={isRunning || isCapturingBaseline}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg transition-all disabled:opacity-50 text-sm"
            >
              <Camera className="w-4 h-4" />
              {isCapturingBaseline ? 'Đang Chụp Baseline...' : 'Chụp Ảnh Gốc (Capture Baseline)'}
            </button>

            {/* 2. Execute Test Run Button */}
            <button
              type="submit"
              disabled={isRunning || isCapturingBaseline}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold rounded-lg shadow-lg transition-all disabled:opacity-50 text-sm"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              {isRunning ? 'Đang Chạy So Khớp...' : 'Kích Hoạt Phiên Kiểm Thử'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
