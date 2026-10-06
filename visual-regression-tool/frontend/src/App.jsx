import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import TestRunnerForm from './components/TestRunnerForm';
import MetricsCard from './components/MetricsCard';
import DiffViewer from './components/DiffViewer';
import BaselineViewer from './components/BaselineViewer';
import { 
  Sparkles, 
  Activity, 
  History, 
  Layers, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  BookOpen,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

export default function App() {
  const [suites, setSuites] = useState([]);
  const [runs, setRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCapturingBaseline, setIsCapturingBaseline] = useState(false);
  const [capturedBaselinesInfo, setCapturedBaselinesInfo] = useState(null);
  const [error, setError] = useState(null);

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
      setError('Không thể kết nối đến Backend FastAPI (http://localhost:8000). Hãy đảm bảo server đang chạy.');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleCaptureBaseline = async (formData) => {
    setIsCapturingBaseline(true);
    setError(null);
    try {
      // 1. Create or find suite
      const suite = await api.createSuite(formData);
      // 2. Explicitly capture baseline
      const result = await api.captureBaseline(suite.id, {
        url_override: formData.baseline_url || formData.url
      });
      setCapturedBaselinesInfo(result);
      await loadInitialData();
    } catch (err) {
      setError(err.message || 'Lỗi khi chụp bộ ảnh Baseline');
    } finally {
      setIsCapturingBaseline(false);
    }
  };

  const handleStartRun = async (formData) => {
    setIsRunning(true);
    setError(null);
    try {
      // 1. Create or find suite
      const newSuite = await api.createSuite(formData);
      // 2. Trigger test run
      const runResult = await api.runSuite(newSuite.id);
      setActiveRun(runResult);
      await loadInitialData();
    } catch (err) {
      setError(err.message || 'Xảy ra lỗi trong quá trình thực thi kiểm thử');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectHistoricalRun = async (runId) => {
    try {
      const runDetails = await api.getRunDetails(runId);
      setActiveRun(runDetails);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-black text-slate-950 shadow-lg">
              VR
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                VISUAL REGRESSION QA
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                  PRO v1.0
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Đồ án: Đánh giá và Kiểm định Chất lượng Phần mềm (Black-box UI Testing)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              FastAPI Swagger Docs
            </a>
            <a
              href="http://localhost:8000/demo/v1_baseline/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-emerald-400 hover:bg-slate-700 transition"
            >
              Demo Baseline (v1.0)
            </a>
            <a
              href="http://localhost:8000/demo/v2_regression/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-slate-700 transition"
            >
              Demo Bug (v2.0)
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full p-6 flex-1">
        {error && (
          <div className="mb-6 p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-xs text-rose-400 underline">Đóng</button>
          </div>
        )}

        {/* 1. Control Panel Form */}
        <TestRunnerForm
          onSubmit={handleStartRun}
          onCaptureBaseline={handleCaptureBaseline}
          isRunning={isRunning}
          isCapturingBaseline={isCapturingBaseline}
        />

        {/* Baseline Capture Progress State */}
        {isCapturingBaseline && (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-8 mb-8 text-center shadow-2xl">
            <div className="inline-block animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"></div>
            <h3 className="text-lg font-bold text-white mb-2">Đang Chụp Bộ Ảnh Chuẩn (Baseline Capture)...</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Playwright đang mở Chromium headless nạp trang gốc, đóng băng CSS animation, đồng bộ phông chữ và chụp ảnh quy chuẩn cho Desktop, Tablet, Mobile. Vui lòng chờ 2-4 giây!
            </p>
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
          <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-8 mb-8 text-center shadow-2xl">
            <div className="inline-block animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full mb-4"></div>
            <h3 className="text-lg font-bold text-white mb-2">Đang Thực Thi Kiểm Thử Tự Động...</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Playwright đang mở Chromium headless, tiêm mã Anti-Flakiness, chờ phông chữ tải hoàn tất, che vùng động và phân tích Perceptual Diff / SSIM. Vui lòng chờ 3-5 giây!
            </p>
          </div>
        )}

        {/* 2. Visual Regression Details */}
        {activeRun && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" />
                Kết Quả Kiểm Định Chi Tiết ({activeRun.suite_name})
              </h2>
              <span className="text-xs text-slate-500">Mã phiên: {activeRun.id}</span>
            </div>

            {activeRun.executive_summary && (
              <div className="mb-6 p-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl shadow-lg">
                <div className="flex items-center gap-2 mb-1.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Tóm Tắt Tương Đối Về Sự Thay Đổi (Executive Change Summary)</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {activeRun.executive_summary}
                </p>
              </div>
            )}

            <MetricsCard run={activeRun} />
            <DiffViewer run={activeRun} onApproveSuccess={loadInitialData} />
          </div>
        )}

        {/* 3. Execution History Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2 text-white font-bold">
              <History className="w-5 h-5 text-amber-400" />
              <span>Lịch Sử Các Lần Chạy Kiểm Thử (Execution Runs)</span>
            </div>
            <span className="text-xs text-slate-400">{runs.length} phiên đã lưu</span>
          </div>

          {runs.length === 0 ? (
            <p className="text-center text-slate-500 text-xs py-6">Chưa có lịch sử kiểm thử nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="py-3 px-4">Run ID</th>
                    <th className="py-3 px-4">Kịch bản</th>
                    <th className="py-3 px-4">Kết quả</th>
                    <th className="py-3 px-4">Viewports Đạt</th>
                    <th className="py-3 px-4">Thời gian chạy</th>
                    <th className="py-3 px-4">Thời lượng</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {runs.map((r) => {
                    const isPassed = r.overall_status === 'PASSED';
                    const isSelected = activeRun?.id === r.id;
                    return (
                      <tr key={r.id} className={`hover:bg-slate-800/50 ${isSelected ? 'bg-slate-800/70' : ''}`}>
                        <td className="py-3 px-4 font-mono text-cyan-400 font-semibold">{r.id}</td>
                        <td className="py-3 px-4 font-medium text-slate-200">{r.suite_name}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {isPassed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {r.overall_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {r.passed_viewports} / {r.total_viewports}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{r.started_at}</td>
                        <td className="py-3 px-4 text-slate-400">{r.duration_seconds}s</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleSelectHistoricalRun(r.id)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold text-[11px] transition"
                          >
                            Xem Chi Tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>Hệ Thống Tự Động Kiểm Thử Hồi Quy Giao Diện Web (Automated Visual Regression Testing Tool)</p>
        <p className="mt-1">Đề tài Báo cáo & Đồ án môn học: Đánh giá và Kiểm định Chất lượng Phần mềm (SQA).</p>
      </footer>
    </div>
  );
}
