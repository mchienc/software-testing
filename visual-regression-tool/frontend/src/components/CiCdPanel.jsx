import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Terminal,
  GitBranch,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Copy,
  Check,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  FolderGit2,
} from 'lucide-react';

function parseGitHubRepo(inputUrl = '') {
  const trimmed = inputUrl.trim().replace(/\.git$/i, '').replace(/\/+$/, '');
  const match = trimmed.match(/github\.com\/([^/]+\/[^/]+)/i);
  if (match) return match[1];
  if (/^[^/]+\/[^/]+$/.test(trimmed)) return trimmed;
  return null;
}

export default function CiCdPanel({ onRunCreated }) {
  const [repoUrl, setRepoUrl] = useState('https://github.com/mchienc/software-testing.git');
  const [repoSlug, setRepoSlug] = useState('mchienc/software-testing');
  const [ghRuns, setGhRuns] = useState([]);
  const [selectedGhRun, setSelectedGhRun] = useState(null);
  const [ghJobs, setGhJobs] = useState([]);
  const [isLoadingGh, setIsLoadingGh] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [ghError, setGhError] = useState(null);

  // Interactive Web CLI Gatekeeper Simulator
  const [simMode, setSimMode] = useState('regression'); // 'regression' | 'pass'
  const [isSimulating, setIsSimulating] = useState(false);
  const [simOutput, setSimOutput] = useState(null);
  const [copiedCmd, setCopiedCmd] = useState(null);

  const fetchGitHubActions = async (targetUrl = repoUrl) => {
    const slug = parseGitHubRepo(targetUrl);
    if (!slug) {
      setGhError('Đường dẫn GitHub không hợp lệ. Ví dụ đúng: https://github.com/mchienc/software-testing.git');
      return;
    }
    setRepoSlug(slug);
    setIsLoadingGh(true);
    setGhError(null);

    try {
      const res = await fetch(`https://api.github.com/repos/${slug}/actions/runs?per_page=8`);
      if (!res.ok) {
        throw new Error(`Không tìm thấy dữ liệu GitHub Actions cho repo "${slug}" (HTTP ${res.status}).`);
      }
      const data = await res.json();
      const runsList = data.workflow_runs || [];
      setGhRuns(runsList);
      if (runsList.length > 0) {
        handleSelectGhRun(runsList[0], slug);
      } else {
        setSelectedGhRun(null);
        setGhJobs([]);
      }
    } catch (err) {
      setGhError(err.message || 'Lỗi khi kết nối tới GitHub API.');
    } finally {
      setIsLoadingGh(false);
    }
  };

  const handleSelectGhRun = async (runItem, slug = repoSlug) => {
    setSelectedGhRun(runItem);
    setIsLoadingJobs(true);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${slug}/actions/runs/${runItem.id}/jobs`
      );
      if (res.ok) {
        const data = await res.json();
        setGhJobs(data.jobs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchGitHubActions('https://github.com/mchienc/software-testing.git');
  }, []);

  const handleRunWebCliSimulation = async () => {
    setIsSimulating(true);
    setSimOutput(null);
    try {
      const isPassMode = simMode === 'pass';
      const suitePayload = {
        name: isPassMode
          ? 'CI/CD Gatekeeper Check (v1.0 vs v1.0)'
          : 'CI/CD Gatekeeper Check (v1.0 vs v2.0)',
        baseline_url: 'http://localhost:8000/demo/v1_baseline/index.html',
        url: isPassMode
          ? 'http://localhost:8000/demo/v1_baseline/index.html'
          : 'http://localhost:8000/demo/v2_regression/index.html',
        viewports: ['desktop', 'tablet', 'mobile'],
        threshold: 0.05,
        color_threshold: 0.1,
        mask_selectors: ['.timestamp', '#live-visitors-counter'],
      };

      const suite = await api.createSuite(suitePayload);
      await api.captureBaseline(suite.id, {
        url_override: suitePayload.baseline_url,
      });
      const runRecord = await api.runSuite(suite.id);

      const exitCode = runRecord.overall_status === 'PASSED' ? 0 : 1;
      const lines = [
        `$ python cli.py --mode ${simMode} --reset-baseline --viewports desktop,tablet,mobile --threshold 0.05`,
        `========================================================================================`,
        ` PIXELPULSE QA - AUTOMATED VISUAL REGRESSION CLI & CI/CD GATEKEEPER`,
        `========================================================================================`,
        ` Suite Name      : ${runRecord.suite_name} (ID: ${runRecord.suite_id})`,
        ` Target URL      : ${runRecord.target_url}`,
        ` Duration        : ${runRecord.duration_seconds}s`,
        ` Overall Status  : [${runRecord.overall_status}] (${runRecord.passed_viewports}/${runRecord.total_viewports} Viewports Passed)`,
        `----------------------------------------------------------------------------------------`,
        ` VIEWPORT   | RESOLUTION    | STATUS   | DIFF RATIO   | SSIM     | DEFECT CLUSTERS`,
        `----------------------------------------------------------------------------------------`,
      ];

      (runRecord.results || []).forEach((r) => {
        const vp = (r.viewport || '').toUpperCase().padEnd(10, ' ');
        const dim = `${r.viewport_width}x${r.viewport_height}`.padEnd(13, ' ');
        const st = (r.status || '').padEnd(8, ' ');
        const dr = `${(r.diff_ratio || 0).toFixed(4)}%`.padEnd(12, ' ');
        const ssim = `${(r.ssim_score || 0).toFixed(4)}`.padEnd(8, ' ');
        const boxes = `${(r.bounding_boxes || []).length} vùng lỗi`;
        lines.push(` ${vp} | ${dim} | ${st} | ${dr} | ${ssim} | ${boxes}`);
      });

      lines.push(`----------------------------------------------------------------------------------------`);
      if (exitCode === 0) {
        lines.push(`[CI/CD GATE] KẾT LUẬN: ĐẠT CHUẨN (Exit Code 0) -> CHO PHÉP GỘP CODE (MERGE PR)!`);
      } else {
        lines.push(`[CI/CD GATE] KẾT LUẬN: PHÁT HIỆN LỖI HỒI QUY (Exit Code 1) -> CHẶN PULL REQUEST!`);
      }

      setSimOutput({
        exitCode,
        runRecord,
        consoleText: lines.join('\n'),
      });

      if (onRunCreated) onRunCreated(runRecord);
    } catch (err) {
      setSimOutput({
        exitCode: 2,
        consoleText: `[FATAL ERROR] ${err.message}`,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const copyCommand = (id, cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  return (
    <div className="space-y-6 mb-8">
      {/* SECTION 1: LIVE GITHUB ACTIONS REPOSITORY INSPECTOR */}
      <div className="bg-surface-panel border border-line-subtle rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-elevated border-b border-line-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="w-4 h-4 text-blue-500" aria-hidden="true" />
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-primary">
                01 / Kết Nối &amp; Theo Dõi Trực Tiếp GitHub Actions CI/CD Trên Link GitHub Của Bạn
              </h2>
              <p className="text-[11px] text-ink-secondary mt-0.5">
                Nhập link GitHub của dự án để xem trực tiếp các phiên kiểm thử tự động đã chạy trên máy chủ đám mây GitHub mỗi khi bạn <code className="font-mono">git push</code>
              </p>
            </div>
          </div>

          <a
            href={`https://github.com/${repoSlug}/actions`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-semibold transition-colors"
          >
            <span>Mở Trang GitHub Actions</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="p-5 space-y-5">
          {/* Input Bar for GitHub Repo Link */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchGitHubActions(repoUrl);
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <div className="flex-1 relative">
              <GitBranch
                className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/mchienc/software-testing.git"
                aria-label="Đường dẫn GitHub Repository"
                className="w-full bg-surface-inset border border-line-subtle focus:border-blue-500 rounded-md pl-9 pr-3 py-2 text-xs font-mono text-ink-primary"
              />
            </div>
            <button
              type="submit"
              disabled={isLoadingGh}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-surface-elevated hover:bg-surface-inset text-ink-primary border border-line-strong rounded-md text-xs font-mono font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-blue-500 ${isLoadingGh ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isLoadingGh ? 'Đang tải từ GitHub...' : 'Kiểm Tra CI/CD Trên Link Này'}</span>
            </button>
          </form>

          {ghError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-xs text-rose-500">
              {ghError}
            </div>
          )}

          {/* Live GitHub Workflow Runs + Step Details Split View */}
          {ghRuns.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left 7 cols: Workflow Runs List */}
              <div className="lg:col-span-7 border border-line-subtle rounded-lg overflow-hidden">
                <div className="px-3.5 py-2 bg-surface-elevated border-b border-line-subtle flex items-center justify-between text-[11px] font-mono text-ink-secondary">
                  <span>LỊCH SỬ CHẠY TỰ ĐỘNG TRÊN GITHUB ({repoSlug})</span>
                  <span>{ghRuns.length} phiên gần nhất</span>
                </div>
                <div className="divide-y divide-line-subtle bg-surface-panel max-h-[360px] overflow-y-auto">
                  {ghRuns.map((run) => {
                    const isSuccess = run.conclusion === 'success';
                    const isRunningGh = run.status !== 'completed';
                    const isSelected = selectedGhRun?.id === run.id;

                    return (
                      <div
                        key={run.id}
                        onClick={() => handleSelectGhRun(run)}
                        className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                          isSelected ? 'bg-blue-500/10' : 'hover:bg-surface-elevated/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {isRunningGh ? (
                              <Loader2
                                className="w-4 h-4 text-amber-500 animate-spin shrink-0"
                                aria-hidden="true"
                              />
                            ) : isSuccess ? (
                              <CheckCircle2
                                className="w-4 h-4 text-emerald-500 shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <XCircle
                                className="w-4 h-4 text-rose-500 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <span className="text-xs font-semibold text-ink-primary truncate">
                              {run.display_title || run.name}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono text-ink-muted">
                            <span>Run #{run.run_number}</span>
                            <span>&middot;</span>
                            <span className="text-blue-500">{run.head_branch}</span>
                            <span>&middot;</span>
                            <span>Commit: {run.head_sha?.slice(0, 7)}</span>
                            <span>&middot;</span>
                            <span>{new Date(run.created_at).toLocaleString('vi-VN')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              isRunningGh
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                : isSuccess
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                            }`}
                          >
                            {isRunningGh ? 'ĐANG CHẠY' : isSuccess ? 'THÀNH CÔNG' : 'THẤT BẠI'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-ink-muted" aria-hidden="true" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 5 cols: Step-by-Step Pipeline Breakdown */}
              <div className="lg:col-span-5 border border-line-subtle rounded-lg overflow-hidden bg-surface-panel flex flex-col justify-between">
                <div>
                  <div className="px-3.5 py-2 bg-surface-elevated border-b border-line-subtle flex items-center justify-between text-[11px] font-mono text-ink-secondary">
                    <span>CHI TIẾT CÁC BƯỚC CHẠY TRÊN GITHUB</span>
                    {selectedGhRun && (
                      <a
                        href={selectedGhRun.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <span>Xem Log Gốc</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  {isLoadingJobs ? (
                    <div className="p-8 text-center text-xs font-mono text-ink-muted flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" aria-hidden="true" />
                      <span>Đang tải chi tiết các bước...</span>
                    </div>
                  ) : ghJobs.length > 0 && ghJobs[0].steps ? (
                    <div className="p-3 space-y-1.5 max-h-[300px] overflow-y-auto">
                      {ghJobs[0].steps.map((step) => {
                        const stepOk = step.conclusion === 'success';
                        return (
                          <div
                            key={step.number}
                            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-surface-elevated/60 border border-line-subtle text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {stepOk ? (
                                <CheckCircle2
                                  className="w-3.5 h-3.5 text-emerald-500 shrink-0"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Clock
                                  className="w-3.5 h-3.5 text-ink-muted shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                              <span className="truncate text-ink-primary font-mono text-[11px]">
                                {step.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-500 shrink-0 uppercase">
                              {step.conclusion || step.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-ink-muted">
                      Chọn một phiên chạy bên trái để xem chi tiết các bước kiểm thử.
                    </div>
                  )}
                </div>

                {selectedGhRun && (
                  <div className="p-3 bg-surface-elevated border-t border-line-subtle text-[11px] text-ink-secondary flex items-center justify-between">
                    <span>Tải gói ảnh Diff &amp; Báo cáo HTML từ GitHub:</span>
                    <a
                      href={selectedGhRun.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-semibold text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <span>Mở Run #{selectedGhRun.run_number}</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: INTERACTIVE WEB CLI GATEKEEPER SIMULATOR */}
      <div className="bg-surface-panel border border-line-subtle rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-elevated border-b border-line-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-primary">
                02 / Chạy Thử Cổng Kiểm Duyệt CI/CD (CLI Gatekeeper) Trực Tiếp Trên Web
              </h3>
              <p className="text-[11px] text-ink-secondary mt-0.5">
                Mô phỏng chính xác cách máy chủ CI/CD gọi lệnh <code className="font-mono">python cli.py</code> và quyết định Cho phép gộp code (<code className="font-mono">Exit Code 0</code>) hay Chặn code lỗi (<code className="font-mono">Exit Code 1</code>)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-surface-panel p-0.5 rounded border border-line-subtle text-xs font-mono">
              <button
                type="button"
                onClick={() => setSimMode('regression')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  simMode === 'regression'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                Kịch bản LỖI (v1.0 vs v2.0)
              </button>
              <button
                type="button"
                onClick={() => setSimMode('pass')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  simMode === 'pass'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                Kịch bản ĐẠT (v1.0 vs v1.0)
              </button>
            </div>

            <button
              type="button"
              disabled={isSimulating}
              onClick={handleRunWebCliSimulation}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-mono font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSimulating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              )}
              <span>{isSimulating ? 'Đang chạy CLI...' : 'Chạy Cổng Kiểm Duyệt Ngay'}</span>
            </button>
          </div>
        </div>

        <div className="p-5">
          {isSimulating && (
            <div className="p-6 bg-[#090a0f] border border-slate-800 rounded-lg font-mono text-xs text-slate-300 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" aria-hidden="true" />
              <span>
                Đang thực thi lệnh: <code className="text-emerald-400">python cli.py --mode {simMode} --reset-baseline</code> ... Vui lòng chờ 3–5 giây!
              </span>
            </div>
          )}

          {simOutput && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  simOutput.exitCode === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-mono font-bold">
                  {simOutput.exitCode === 0 ? (
                    <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {simOutput.exitCode === 0
                      ? 'MÃ THOÁT: EXIT CODE 0 — Giao diện đạt chuẩn 100%, CI/CD cho phép gộp code (Merge Pull Request)!'
                      : 'MÃ THOÁT: EXIT CODE 1 — Phát hiện vỡ giao diện, CI/CD tự động khóa và chặn Pull Request!'}
                  </span>
                </div>
              </div>

              <pre className="p-4 bg-[#090a0f] text-slate-200 border border-slate-800 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
                {simOutput.consoleText}
              </pre>
            </div>
          )}

          {!isSimulating && !simOutput && (
            <div className="p-4 bg-surface-elevated border border-line-subtle rounded-lg text-xs text-ink-secondary flex items-center justify-between">
              <span>
                Bấm nút <strong>"Chạy Cổng Kiểm Duyệt Ngay"</strong> ở góc phải phía trên để xem màn hình Terminal xuất kết quả kiểm duyệt và mã thoát <code className="font-mono">Exit Code</code> trực tiếp tại đây.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: CLI QUICK REFERENCE CARDS */}
      <div className="bg-surface-panel border border-line-subtle rounded-lg overflow-hidden">
        <div className="px-5 py-3 bg-surface-elevated border-b border-line-subtle">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-primary">
            03 / Các Câu Lệnh Chạy Trong Terminal Máy Tính Của Bạn
          </h3>
        </div>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            {
              id: 'cmd-pass',
              title: 'Lệnh 1: Kiểm tra Chuẩn Zero-Diff (Trả về Exit Code 0 - ĐẠT)',
              desc: 'So sánh bản v1.0 Gốc với chính v1.0 trên 3 màn hình để kiểm chứng tỷ lệ báo động giả = 0.0000%.',
              cmd: 'python cli.py --mode pass --reset-baseline --output-html ci_reports/pass_report.html',
            },
            {
              id: 'cmd-reg',
              title: 'Lệnh 2: Phát hiện Lỗi Hồi quy Giao diện (Trả về Exit Code 1 - LỖI)',
              desc: 'So sánh bản v1.0 Gốc với bản v2.0 bị vỡ CSS, tự động xuất báo cáo HTML + JSON.',
              cmd: 'python cli.py --mode regression --reset-baseline --output-html ci_reports/regression_report.html --output-json ci_reports/result.json',
            },
            {
              id: 'cmd-base',
              title: 'Lệnh 3: Chụp Mới Bộ Ảnh Chuẩn Gốc (Capture Baseline)',
              desc: 'Mở trình duyệt ngầm chụp lại toàn bộ ảnh chuẩn gốc (v1.0) trên các độ phân giải.',
              cmd: 'python cli.py --capture-baseline',
            },
            {
              id: 'cmd-approve',
              title: 'Lệnh 4: Duyệt Kết Quả Mới Nhất Làm Baseline Chuẩn',
              desc: 'Thăng cấp bộ ảnh của lần chạy gần nhất thành bộ ảnh gốc Baseline mới ngay từ cửa sổ dòng lệnh.',
              cmd: 'python cli.py --approve-latest',
            },
          ].map((item) => (
            <div
              key={item.id}
              className="p-4 bg-surface-elevated border border-line-subtle rounded-lg flex flex-col justify-between"
            >
              <div>
                <h4 className="text-xs font-mono font-bold text-ink-primary mb-1">{item.title}</h4>
                <p className="text-xs text-ink-secondary mb-3">{item.desc}</p>
              </div>
              <div className="flex items-center justify-between gap-2 bg-surface-inset border border-line-subtle rounded px-3 py-2 font-mono text-[11px] text-ink-primary">
                <code className="truncate">{item.cmd}</code>
                <button
                  type="button"
                  onClick={() => copyCommand(item.id, item.cmd)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-panel hover:bg-surface-elevated text-ink-secondary hover:text-ink-primary border border-line-subtle shrink-0 cursor-pointer transition-colors"
                >
                  {copiedCmd === item.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
