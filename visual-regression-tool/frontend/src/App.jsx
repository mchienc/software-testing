import React, { useState, useEffect, useMemo } from 'react';
import { api } from './services/api';
import TestRunnerForm from './components/TestRunnerForm';
import MetricsCard from './components/MetricsCard';
import DiffViewer from './components/DiffViewer';
import BaselineViewer from './components/BaselineViewer';
import TrendChart from './components/TrendChart';
import CiCdPanel from './components/CiCdPanel';
import {
  Activity,
  History,
  CheckCircle2,
  XCircle,
  ExternalLink,
  BookOpen,
  Sun,
  Moon,
  Terminal,
  Search,
  Copy,
  Check,
  Scan,
  AlertCircle,
  Loader2,
} from 'lucide-react';

function stripEmojis(text = '') {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2139}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export default function App() {
  const [suites, setSuites] = useState([]);
  const [runs, setRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCapturingBaseline, setIsCapturingBaseline] = useState(false);
  const [capturedBaselinesInfo, setCapturedBaselinesInfo] = useState(null);
  const [error, setError] = useState(null);

  // Navigation & Theme
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('workbench'); // 'workbench' | 'analytics' | 'cicd'
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pixelpulse-theme');
      if (saved) return saved === 'dark';
    }
    return true;
  });

  // Audit log filters
  const [runStatusFilter, setRunStatusFilter] = useState('ALL');
  const [runSearchQuery, setRunSearchQuery] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('pixelpulse-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('pixelpulse-theme', 'light');
    }
  }, [isDark]);

  const loadInitialData = async () => {
    try {
      const [suitesData, runsData] = await Promise.all([
        api.getSuites(),
        api.getRuns(),
      ]);
      setSuites(suitesData);
      setRuns(runsData);
      if (runsData.length > 0 && !activeRun) {
        setActiveRun(runsData[0]);
      }
    } catch (err) {
      console.error(err);
      setError(
        'Không thể kết nối đến máy chủ FastAPI (http://localhost:8000). Vui lòng kiểm tra lệnh python run.py đang chạy.'
      );
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleCaptureBaseline = async (formData) => {
    setIsCapturingBaseline(true);
    setError(null);
    try {
      const suite = await api.createSuite(formData);
      const result = await api.captureBaseline(suite.id, {
        url_override: formData.baseline_url || formData.url,
      });
      setCapturedBaselinesInfo(result);
      await loadInitialData();
    } catch (err) {
      setError(err.message || 'Lỗi khi chụp bộ ảnh gốc Baseline.');
    } finally {
      setIsCapturingBaseline(false);
    }
  };

  const handleStartRun = async (formData) => {
    setIsRunning(true);
    setError(null);
    try {
      const newSuite = await api.createSuite(formData);
      const runResult = await api.runSuite(newSuite.id);
      setActiveRun(runResult);
      await loadInitialData();
    } catch (err) {
      setError(err.message || 'Xảy ra lỗi trong quá trình chạy kiểm thử hồi quy giao diện.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectHistoricalRun = async (runId) => {
    try {
      const runDetails = await api.getRunDetails(runId);
      setActiveRun(runDetails);
      setActiveWorkspaceTab('workbench');
      window.scrollTo({ top: 260, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    }
  };

  const copyCommand = (id, cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      if (runStatusFilter !== 'ALL' && r.overall_status !== runStatusFilter) {
        return false;
      }
      if (runSearchQuery.trim()) {
        const q = runSearchQuery.toLowerCase();
        const hay = `${r.id} ${r.suite_name || ''} ${r.target_url || ''}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [runs, runStatusFilter, runSearchQuery]);

  return (
    <div className="min-h-screen bg-surface-canvas text-ink-primary flex flex-col font-sans">
      {/* Top Enterprise Command Header */}
      <header className="border-b border-line-subtle bg-surface-panel/95 backdrop-blur sticky top-0 z-50 px-4 lg:px-6 h-14 flex items-center">
        <div className="max-w-[1400px] w-full mx-auto flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Scan className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold tracking-tight text-ink-primary">
                    PIXELPULSE
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-ink-secondary border border-line-subtle uppercase">
                    KIỂM THỬ GIAO DIỆN v2.0
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted hidden sm:block leading-none mt-0.5">
                  Hệ thống Kiểm thử Hồi quy Giao diện Tự động (Perceptual Diff &amp; SSIM)
                </p>
              </div>
            </div>

            {/* Workspace Navigation Tabs */}
            <nav
              aria-label="Không gian làm việc"
              className="hidden md:flex items-center bg-surface-elevated p-0.5 rounded-md border border-line-subtle text-xs"
            >
              {[
                { id: 'workbench', label: '01 / Bàn Kiểm Định & So Khớp' },
                { id: 'analytics', label: `02 / Xu Hướng & Lịch Sử (${runs.length})` },
                { id: 'cicd', label: '03 / Tích Hợp CLI & CI/CD' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveWorkspaceTab(tab.id)}
                  className={`px-3 py-1 rounded font-mono text-[11px] font-medium cursor-pointer transition-colors ${
                    activeWorkspaceTab === tab.id
                      ? 'bg-surface-panel text-ink-primary border border-line-strong shadow-sm'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right Quick Links & Theme Switcher */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <a
              href="http://localhost:8000/demo/v1_baseline/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface-inset text-ink-secondary hover:text-ink-primary border border-line-subtle transition-colors"
              title="Mở trang mẫu phiên bản chuẩn v1.0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Trang Mẫu v1.0 (Gốc)</span>
            </a>
            <a
              href="http://localhost:8000/demo/v2_regression/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface-inset text-ink-secondary hover:text-ink-primary border border-line-subtle transition-colors"
              title="Mở trang mẫu phiên bản lỗi hồi quy v2.0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Trang Mẫu v2.0 (Lỗi)</span>
            </a>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface-inset text-ink-secondary hover:text-ink-primary border border-line-subtle transition-colors"
              title="Tài liệu REST API (Swagger UI)"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
              <span>Tài liệu API</span>
            </a>

            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              aria-label={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              className="p-1.5 rounded-md bg-surface-elevated hover:bg-surface-inset text-ink-secondary hover:text-ink-primary border border-line-subtle cursor-pointer transition-colors"
              title={isDark ? 'Chuyển sang chế độ Sáng (Light Mode)' : 'Chuyển sang chế độ Tối (Dark Mode)'}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Workspace Switcher */}
      <div className="md:hidden px-4 py-2 bg-surface-panel border-b border-line-subtle flex items-center gap-1">
        {[
          { id: 'workbench', label: 'Bàn Kiểm Định' },
          { id: 'analytics', label: `Lịch Sử (${runs.length})` },
          { id: 'cicd', label: 'CLI / CI-CD' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveWorkspaceTab(tab.id)}
            className={`flex-1 py-1 rounded font-mono text-xs font-medium cursor-pointer ${
              activeWorkspaceTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-surface-elevated text-ink-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Container */}
      <main className="max-w-[1400px] mx-auto w-full px-4 lg:px-6 py-6 flex-1">
        {error && (
          <div
            role="alert"
            className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-500 text-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs font-mono underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* TAB 03: CLI & CI/CD Gatekeeper View */}
        {activeWorkspaceTab === 'cicd' && (
          <CiCdPanel
            onRunCreated={(newRun) => {
              setActiveRun(newRun);
              loadInitialData();
            }}
          />
        )}

        {/* TAB 01: Diff Workbench */}
        {activeWorkspaceTab === 'workbench' && (
          <>
            {/* 1. Control Panel Form */}
            <TestRunnerForm
              onSubmit={handleStartRun}
              onCaptureBaseline={handleCaptureBaseline}
              isRunning={isRunning}
              isCapturingBaseline={isCapturingBaseline}
            />

            {/* Baseline Capture Progress State */}
            {isCapturingBaseline && (
              <div className="bg-surface-panel border border-emerald-500/40 rounded-lg p-6 mb-6 flex items-center gap-4">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-mono font-bold text-ink-primary">
                    Đang chụp bộ ảnh chuẩn gốc (Baseline) trên đa màn hình...
                  </h3>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    Playwright Chromium đang đóng băng hiệu ứng chuyển động CSS, đồng bộ phông chữ, che vùng dữ liệu động và chụp ảnh Desktop (1920×1080), Tablet (768×1024), Mobile (375×812).
                  </p>
                </div>
              </div>
            )}

            {/* Display Captured Baseline Preview if available */}
            {capturedBaselinesInfo && (
              <BaselineViewer
                baselines={capturedBaselinesInfo.baselines}
                suiteName={capturedBaselinesInfo.suite_name}
                capturedUrl={capturedBaselinesInfo.captured_url}
                onClose={() => setCapturedBaselinesInfo(null)}
              />
            )}

            {/* Loading Progress State for Test Run */}
            {isRunning && (
              <div className="bg-surface-panel border border-blue-500/40 rounded-lg p-6 mb-6 flex items-center gap-4">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-mono font-bold text-ink-primary">
                    Đang thực thi so khớp điểm ảnh (Perceptual Diff), chấm điểm SSIM &amp; khoanh vùng lỗi...
                  </h3>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    Hệ thống đang chuẩn hóa kích thước ảnh, lọc nhiễu răng cưa chữ (3×3 Anti-Aliasing), tính toán độ tương đồng cấu trúc SSIM và gom cụm đường bao lỗi OpenCV.
                  </p>
                </div>
              </div>
            )}

            {/* 2. Active Run Telemetry & Optical Diff Inspector */}
            {activeRun && (
              <section aria-label="Báo cáo kiểm định chi tiết" className="mb-8">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" aria-hidden="true" />
                    <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-primary">
                      Kết Quả Phân Tích &amp; So Khớp // {activeRun.suite_name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-ink-muted tabular-nums">
                    <span>MÃ PHIÊN: #{activeRun.id}</span>
                    <span>&middot;</span>
                    <span>HOÀN TẤT: {activeRun.completed_at || activeRun.started_at}</span>
                  </div>
                </div>

                {/* Clean Executive Diagnostic Banner (Emojis stripped) */}
                {activeRun.executive_summary && (
                  <div className="mb-4 p-3.5 bg-surface-panel border-l-4 border-l-blue-600 border border-line-subtle rounded-r-lg flex items-start justify-between gap-4">
                    <div>
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-blue-500 mb-1">
                        Tóm Tắt Đánh Giá Thay Đổi Giao Diện (Executive Summary)
                      </span>
                      <p className="text-xs text-ink-primary leading-relaxed">
                        {stripEmojis(activeRun.executive_summary)}
                      </p>
                    </div>
                  </div>
                )}

                <MetricsCard run={activeRun} />
                <DiffViewer run={activeRun} onApproveSuccess={loadInitialData} />
              </section>
            )}
          </>
        )}

        {/* Quality Trend Analytics & Execution Audit Log */}
        {(activeWorkspaceTab === 'analytics' || activeWorkspaceTab === 'workbench') && (
          <section aria-label="Biểu đồ xu hướng và lịch sử chạy">
            {runs && runs.length > 0 && <TrendChart runs={runs} />}

            {/* Execution History Table with Status Filter & Search */}
            <div className="bg-surface-panel border border-line-subtle rounded-lg overflow-hidden">
              <div className="px-5 py-3 bg-surface-elevated border-b border-line-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-blue-500" aria-hidden="true" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-primary">
                    Lịch Sử Các Phiên Kiểm Thử ({filteredRuns.length} / {runs.length})
                  </h3>
                </div>

                {/* Filter & Search Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-surface-panel p-0.5 rounded border border-line-subtle text-[11px] font-mono">
                    {[
                      { id: 'ALL', label: 'TẤT CẢ' },
                      { id: 'PASSED', label: 'ĐẠT (PASSED)' },
                      { id: 'FAILED', label: 'LỖI (FAILED)' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setRunStatusFilter(st.id)}
                        className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          runStatusFilter === st.id
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-ink-secondary hover:text-ink-primary'
                        }`}
                      >
                        {st.label}
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
                      value={runSearchQuery}
                      onChange={(e) => setRunSearchQuery(e.target.value)}
                      placeholder="Tìm mã phiên hoặc tên kịch bản..."
                      aria-label="Tìm kiếm lịch sử kiểm thử"
                      className="bg-surface-inset border border-line-subtle focus:border-blue-500 rounded pl-8 pr-2.5 py-1 text-xs text-ink-primary w-56"
                    />
                  </div>
                </div>
              </div>

              {filteredRuns.length === 0 ? (
                <p className="text-center text-ink-muted text-xs font-mono py-8">
                  Không tìm thấy phiên kiểm thử nào khớp với bộ lọc.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-line-subtle bg-surface-elevated/50 text-ink-muted font-mono text-[11px] uppercase">
                        <th className="py-2.5 px-4">Mã Phiên</th>
                        <th className="py-2.5 px-4">Tên Kịch Bản</th>
                        <th className="py-2.5 px-4">Kết Quả</th>
                        <th className="py-2.5 px-4">Màn Hình Đạt</th>
                        <th className="py-2.5 px-4">Thời Lượng</th>
                        <th className="py-2.5 px-4">Thời Gian Chạy</th>
                        <th className="py-2.5 px-4 text-right">Báo Cáo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-subtle">
                      {filteredRuns.map((r) => {
                        const isPassed = r.overall_status === 'PASSED';
                        const isSelected = activeRun?.id === r.id;
                        return (
                          <tr
                            key={r.id}
                            onClick={() => handleSelectHistoricalRun(r.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-500/10'
                                : 'hover:bg-surface-elevated/60'
                            }`}
                          >
                            <td className="py-2.5 px-4 font-mono font-semibold text-blue-500 tabular-nums">
                              #{r.id}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-ink-primary">
                              {r.suite_name}
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                  isPassed
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                }`}
                              >
                                {isPassed ? (
                                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                ) : (
                                  <XCircle className="w-3 h-3" aria-hidden="true" />
                                )}
                                {isPassed ? 'ĐẠT (PASSED)' : 'LỖI (FAILED)'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-ink-secondary tabular-nums">
                              {r.passed_viewports}/{r.total_viewports} màn hình
                            </td>
                            <td className="py-2.5 px-4 font-mono text-ink-secondary tabular-nums">
                              {r.duration_seconds}s
                            </td>
                            <td className="py-2.5 px-4 font-mono text-ink-muted tabular-nums">
                              {r.started_at}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <a
                                href={api.getReportUrl(r.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-blue-500 hover:underline font-mono text-[11px]"
                              >
                                <span>Mở HTML</span>
                                <ExternalLink className="w-3 h-3" aria-hidden="true" />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Compact Technical Footer */}
      <footer className="border-t border-line-subtle bg-surface-panel py-4 px-6 mt-10 text-[11px] font-mono text-ink-muted">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            ĐỒ ÁN ĐÁNH GIÁ &amp; KIỂM ĐỊNH CHẤT LƯỢNG PHẦN MỀM // PLAYWRIGHT + OPENCV + SSIM
          </span>
          <span>
            HỆ THỐNG KIỂM THỬ HỒI QUY GIAO DIỆN TRỰC QUAN TỰ ĐỘNG
          </span>
        </div>
      </footer>
    </div>
  );
}
