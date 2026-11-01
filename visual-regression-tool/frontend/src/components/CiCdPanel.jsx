import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Terminal,
  GitBranch,
  GitCommit,
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
  Eye,
} from 'lucide-react';

function parseGitHubRepo(inputUrl = '') {
  const trimmed = inputUrl.trim().replace(/\.git$/i, '').replace(/\/+$/, '');
  const match = trimmed.match(/github\.com\/([^/]+\/[^/]+)/i);
  if (match) return match[1];
  if (/^[^/]+\/[^/]+$/.test(trimmed)) return trimmed;
  return null;
}

export default function CiCdPanel({ onRunRecorded, onOpenInWorkbench }) {
  const [repoUrl, setRepoUrl] = useState('https://github.com/mchienc/Foundational_project');
  const [repoSlug, setRepoSlug] = useState('mchienc/Foundational_project');
  const [repoMeta, setRepoMeta] = useState(null);
  const [ghRuns, setGhRuns] = useState([]);
  const [ghCommits, setGhCommits] = useState([]);
  const [selectedGhRun, setSelectedGhRun] = useState(null);
  const [ghJobs, setGhJobs] = useState([]);
  const [isLoadingGh, setIsLoadingGh] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [ghError, setGhError] = useState(null);

  // Target GitHub Repo Visual Regression Runner State (Box 02)
  const [testMode, setTestMode] = useState('inject_regression'); // 'inject_regression' | 'compare_commits'
  const [baselineCommit, setBaselineCommit] = useState('');
  const [currentCommit, setCurrentCommit] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simOutput, setSimOutput] = useState(null);
  const [previewViewport, setPreviewViewport] = useState('desktop');
  const [copiedCmd, setCopiedCmd] = useState(null);

  const fetchGitHubRepoData = async (targetUrl = repoUrl) => {
    const slug = parseGitHubRepo(targetUrl);
    if (!slug) {
      setGhError('Đường dẫn GitHub không hợp lệ. Ví dụ đúng: https://github.com/mchienc/Foundational_project');
      return;
    }
    setRepoSlug(slug);
    setIsLoadingGh(true);
    setGhError(null);

    try {
      const [metaRes, runsRes, commitsRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${slug}`),
        fetch(`https://api.github.com/repos/${slug}/actions/runs?per_page=8`),
        fetch(`https://api.github.com/repos/${slug}/commits?per_page=10`),
      ]);

      if (!metaRes.ok) {
        throw new Error(`Không tìm thấy kho mã nguồn GitHub "${slug}" (HTTP ${metaRes.status}).`);
      }

      const metaData = await metaRes.json();
      setRepoMeta(metaData);

      const runsData = runsRes.ok ? await runsRes.json() : { workflow_runs: [] };
      const runsList = runsData.workflow_runs || [];
      setGhRuns(runsList);
      if (runsList.length > 0) {
        handleSelectGhRun(runsList[0], slug);
      } else {
        setSelectedGhRun(null);
        setGhJobs([]);
      }

      const commitsData = commitsRes.ok ? await commitsRes.json() : [];
      const commitsList = Array.isArray(commitsData) ? commitsData : [];
      setGhCommits(commitsList);
      if (commitsList.length > 0) {
        setCurrentCommit(commitsList[0].sha.slice(0, 7));
        setBaselineCommit(
          commitsList.length > 1 ? commitsList[1].sha.slice(0, 7) : commitsList[0].sha.slice(0, 7)
        );
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
    fetchGitHubRepoData('https://github.com/mchienc/Foundational_project');
  }, []);

  const handleRunTargetGitHubRepoTest = async () => {
    const slug = parseGitHubRepo(repoUrl) || repoSlug;
    setIsSimulating(true);
    setSimOutput(null);
    setGhError(null);

    try {
      const isInject = testMode === 'inject_regression';
      const runRecord = await api.runGitHubRepo({
        repo_url: `https://github.com/${slug}`,
        baseline_commit: isInject ? currentCommit || null : baselineCommit || null,
        current_commit: currentCommit || null,
        inject_regression: isInject,
        viewports: ['desktop', 'tablet', 'mobile'],
        threshold: 0.05,
      });

      const exitCode = runRecord.overall_status === 'PASSED' ? 0 : 1;
      const ghMeta = runRecord.github_meta || {};
      const cliCmd = isInject
        ? `$ python cli.py --github-repo https://github.com/${slug} --inject-regression --viewports desktop,tablet,mobile`
        : `$ python cli.py --github-repo https://github.com/${slug} --baseline-commit ${
            ghMeta.baseline_commit || baselineCommit
          } --current-commit ${ghMeta.current_commit || currentCommit}`;

      const lines = [
        cliCmd,
        `========================================================================================`,
        ` PIXELPULSE QA - KIỂM THỬ HỒI QUY GIAO DIỆN TRỰC TIẾP TRÊN KHO MÃ NGUỒN GITHUB`,
        `========================================================================================`,
        ` Kho GitHub (Repo)    : https://github.com/${ghMeta.repo_slug || slug}`,
        ` Giao diện phát hiện  : ${ghMeta.served_web_root || 'frontend/dist/index.html'}`,
        ` Phiên bản so sánh    : ${
          isInject
            ? `Commit [${ghMeta.current_commit || 'HEAD'}] (Gốc) vs [${ghMeta.current_commit || 'HEAD'} + Lỗi CSS Hồi Quy]`
            : `Commit Gốc [${ghMeta.baseline_commit}] vs Commit Hiện Tại [${ghMeta.current_commit}]`
        }`,
        ` Thời gian thực thi   : ${runRecord.duration_seconds}s`,
        ` Kết quả tổng thể     : [${runRecord.overall_status}] (${runRecord.passed_viewports}/${runRecord.total_viewports} Màn hình Đạt chuẩn)`,
        `----------------------------------------------------------------------------------------`,
        ` MÀN HÌNH   | ĐỘ PHÂN GIẢI  | KẾT QUẢ  | SAI LỆCH (%) | SSIM     | SỐ VÙNG LỖI`,
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
        lines.push(
          `[CI/CD GATE] KẾT LUẬN CHO [${slug}]: ĐẠT CHUẨN (Exit Code 0) -> CHO PHÉP GỘP CODE (MERGE PR)!`
        );
      } else {
        lines.push(
          `[CI/CD GATE] KẾT LUẬN CHO [${slug}]: PHÁT HIỆN LỖI GIAO DIỆN (Exit Code 1) -> CHẶN PULL REQUEST!`
        );
      }

      setSimOutput({
        exitCode,
        runRecord,
        consoleText: lines.join('\n'),
      });
      setPreviewViewport('desktop');

      if (onRunRecorded) onRunRecorded(runRecord);
    } catch (err) {
      setSimOutput({
        exitCode: 2,
        runRecord: null,
        consoleText: `[LỖI THỰC THI KHO GITHUB] ${err.message}\n(Lưu ý: Hãy đảm bảo máy chủ Backend FastAPI đã được khởi động lại với bản cập nhật mới nhất).`,
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

  const activePreviewResult =
    simOutput?.runRecord?.results?.find((r) => r.viewport === previewViewport) ||
    simOutput?.runRecord?.results?.[0];

  return (
    <div className="space-y-6 mb-8">
      {/* SECTION 1: GITHUB REPOSITORY SELECTOR & ACTIONS INSPECTOR */}
      <div className="bg-surface-panel border border-line-subtle rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-elevated border-b border-line-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="w-4 h-4 text-blue-500" aria-hidden="true" />
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-primary">
                01 / Nhập Link Kho Mã Nguồn GitHub Cần Kiểm Thử Giao Diện
              </h2>
              <p className="text-[11px] text-ink-secondary mt-0.5">
                Nhập bất kỳ kho GitHub dự án web nào của bạn (ví dụ <code className="font-mono">Foundational_project</code>) để tải lịch sử Commit và chạy kịch bản kiểm thử giao diện trực tiếp bên dưới
              </p>
            </div>
          </div>

          <a
            href={`https://github.com/${repoSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-panel hover:bg-surface-inset text-ink-primary border border-line-strong text-xs font-mono font-semibold transition-colors"
          >
            <span>Mở Kho {repoSlug} Trên GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="p-5 space-y-4">
          {/* Input Bar for GitHub Repo Link */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchGitHubRepoData(repoUrl);
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
                placeholder="https://github.com/mchienc/Foundational_project"
                aria-label="Đường dẫn GitHub Repository"
                className="w-full bg-surface-inset border border-line-subtle focus:border-blue-500 rounded-md pl-9 pr-3 py-2 text-xs font-mono text-ink-primary"
              />
            </div>
            <button
              type="submit"
              disabled={isLoadingGh}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-mono font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoadingGh ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isLoadingGh ? 'Đang tải kho GitHub...' : 'Nạp Dự Án GitHub Này'}</span>
            </button>
          </form>

          {/* Quick-Select Repo Presets */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-ink-muted">Chọn nhanh dự án của bạn:</span>
            <button
              type="button"
              onClick={() => {
                const url = 'https://github.com/mchienc/Foundational_project';
                setRepoUrl(url);
                fetchGitHubRepoData(url);
              }}
              className={`px-2.5 py-1 rounded border cursor-pointer transition-colors ${
                repoSlug.toLowerCase() === 'mchienc/foundational_project'
                  ? 'bg-blue-500/15 text-blue-500 border-blue-500/40 font-semibold'
                  : 'bg-surface-elevated text-ink-secondary border-line-subtle hover:text-ink-primary'
              }`}
            >
              mchienc/Foundational_project
            </button>
            <button
              type="button"
              onClick={() => {
                const url = 'https://github.com/mchienc/software-testing.git';
                setRepoUrl(url);
                fetchGitHubRepoData(url);
              }}
              className={`px-2.5 py-1 rounded border cursor-pointer transition-colors ${
                repoSlug.toLowerCase() === 'mchienc/software-testing'
                  ? 'bg-blue-500/15 text-blue-500 border-blue-500/40 font-semibold'
                  : 'bg-surface-elevated text-ink-secondary border-line-subtle hover:text-ink-primary'
              }`}
            >
              mchienc/software-testing (Có sẵn GitHub Actions)
            </button>
          </div>

          {ghError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-xs text-rose-500">
              {ghError}
            </div>
          )}

          {/* Repo Status Summary Strip */}
          {repoMeta && (
            <div className="p-3.5 bg-surface-elevated border border-line-subtle rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-ink-primary">{repoMeta.full_name}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/30 text-[10px]">
                    Nhánh mặc định: {repoMeta.default_branch}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-[10px]">
                    Đã tải {ghCommits.length} commit gần nhất
                  </span>
                </div>
                <p className="text-ink-secondary">
                  {ghRuns.length > 0
                    ? `Kho này đã tích hợp GitHub Actions (${ghRuns.length} phiên chạy tự động trên đám mây).`
                    : `Kho "${repoSlug}" chưa gắn file .github/workflows trên đám mây, nhưng hệ thống đã nạp xong toàn bộ lịch sử Commit để bạn chạy kiểm thử trực tiếp ở Mục 02 ngay bên dưới!`}
                </p>
              </div>
            </div>
          )}

          {/* Live GitHub Workflow Runs + Step Details Split View (if the repo has GitHub Actions runs) */}
          {ghRuns.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 border border-line-subtle rounded-lg overflow-hidden">
                <div className="px-3.5 py-2 bg-surface-elevated border-b border-line-subtle flex items-center justify-between text-[11px] font-mono text-ink-secondary">
                  <span>LỊCH SỬ CHẠY TỰ ĐỘNG TRÊN ĐÁM MÂY GITHUB ({repoSlug})</span>
                  <span>{ghRuns.length} phiên gần nhất</span>
                </div>
                <div className="divide-y divide-line-subtle bg-surface-panel max-h-[280px] overflow-y-auto">
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
                    <div className="p-3 space-y-1.5 max-h-[240px] overflow-y-auto">
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: DIRECT VISUAL REGRESSION RUNNER ON THE SELECTED GITHUB REPOSITORY */}
      <div className="bg-surface-panel border-2 border-blue-500/40 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-elevated border-b border-line-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-primary">
                02 / Chạy Kịch Bản Kiểm Thử Giao Diện Trực Tiếp Trên Dự Án: {repoSlug}
              </h3>
              <p className="text-[11px] text-ink-secondary mt-0.5">
                Hệ thống sẽ tự động <code className="font-mono">git clone</code> kho{' '}
                <strong className="text-ink-primary font-mono">{repoSlug}</strong>, khởi chạy giao diện web thực tế của dự án đó và chụp ảnh kiểm định đa màn hình (Desktop, Tablet, Mobile)
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSimulating}
            onClick={handleRunTargetGitHubRepoTest}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-mono font-bold cursor-pointer transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSimulating ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            )}
            <span>
              {isSimulating
                ? `Đang clone & chụp giao diện ${repoSlug}...`
                : `Chạy Kiểm Thử Dự Án ${repoSlug} Ngay`}
            </span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode Selector for Target GitHub Repo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div
              onClick={() => setTestMode('inject_regression')}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                testMode === 'inject_regression'
                  ? 'bg-rose-500/10 border-rose-500/50'
                  : 'bg-surface-elevated border-line-subtle hover:border-line-strong'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-ink-primary">
                  Chế độ 1: Giả lập Lỗi Hồi quy CSS trực tiếp trên giao diện {repoSlug}
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-500 text-[10px] font-mono font-bold">
                  Kỳ vọng: EXIT CODE 1 (CHẶN PR)
                </span>
              </div>
              <p className="text-xs text-ink-secondary">
                Chụp giao diện gốc của <code className="font-mono">{repoSlug}</code> làm chuẩn Baseline, sau đó tự động tiêm biến đổi CSS (đổi màu &amp; xô lệch nút bấm, tiêu đề) vào chính giao diện của <code className="font-mono">{repoSlug}</code> để chứng minh Cổng CI/CD phát hiện đúng vùng lỗi.
              </p>
            </div>

            <div
              onClick={() => setTestMode('compare_commits')}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                testMode === 'compare_commits'
                  ? 'bg-emerald-500/10 border-emerald-500/50'
                  : 'bg-surface-elevated border-line-subtle hover:border-line-strong'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-ink-primary">
                  Chế độ 2: So sánh trực tiếp giữa 2 Commit của {repoSlug}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 text-[10px] font-mono font-bold">
                  So sánh Lịch sử Git
                </span>
              </div>
              <p className="text-xs text-ink-secondary">
                Lần lượt <code className="font-mono">git checkout</code> 2 bản Commit trong lịch sử của dự án <code className="font-mono">{repoSlug}</code>, dựng giao diện từng bản và đo tỷ lệ sai lệch điểm ảnh thực tế giữa 2 Commit.
              </p>
            </div>
          </div>

          {/* Commit Dropdown Pickers when in compare_commits mode */}
          {testMode === 'compare_commits' && ghCommits.length > 0 && (
            <div className="p-3.5 bg-surface-elevated border border-line-subtle rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-ink-secondary mb-1">
                  Commit Chuẩn Gốc (Baseline Commit của {repoSlug})
                </label>
                <select
                  value={baselineCommit}
                  onChange={(e) => setBaselineCommit(e.target.value)}
                  className="w-full bg-surface-inset border border-line-subtle rounded px-3 py-1.5 text-xs font-mono text-ink-primary"
                >
                  {ghCommits.map((c) => {
                    const shortSha = c.sha.slice(0, 7);
                    const msg = (c.commit?.message || '').split('\n')[0];
                    return (
                      <option key={`base-${c.sha}`} value={shortSha}>
                        [{shortSha}] {msg.slice(0, 65)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-ink-secondary mb-1">
                  Commit Hiện Tại Cần Kiểm Định (Current Commit của {repoSlug})
                </label>
                <select
                  value={currentCommit}
                  onChange={(e) => setCurrentCommit(e.target.value)}
                  className="w-full bg-surface-inset border border-line-subtle rounded px-3 py-1.5 text-xs font-mono text-ink-primary"
                >
                  {ghCommits.map((c) => {
                    const shortSha = c.sha.slice(0, 7);
                    const msg = (c.commit?.message || '').split('\n')[0];
                    return (
                      <option key={`curr-${c.sha}`} value={shortSha}>
                        [{shortSha}] {msg.slice(0, 65)}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          {/* Running Progress Indicator */}
          {isSimulating && (
            <div className="p-6 bg-[#090a0f] border border-slate-800 rounded-lg font-mono text-xs text-slate-300 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" aria-hidden="true" />
              <div className="space-y-1">
                <span className="block text-emerald-400 font-bold">
                  Đang thực thi kiểm thử hồi quy giao diện trên kho GitHub [{repoSlug}]...
                </span>
                <span className="block text-slate-400">
                  Hệ thống đang clone mã nguồn {repoSlug}, khởi chạy giao diện web cục bộ, chụp 6 bức ảnh (Desktop, Tablet, Mobile) và chạy thuật toán Perceptual Diff + SSIM (khoảng 10–15 giây).
                </span>
              </div>
            </div>
          )}

          {/* Terminal Result + Live Captured Screenshots of the Target GitHub Repo */}
          {simOutput && (
            <div className="space-y-4">
              <div
                className={`p-3.5 rounded-lg border flex flex-wrap items-center justify-between gap-3 ${
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
                      ? `DỰ ÁN [${repoSlug}] — EXIT CODE 0: Giao diện đạt chuẩn 100%, CI/CD cho phép gộp code (Merge PR)!`
                      : `DỰ ÁN [${repoSlug}] — EXIT CODE 1: Phát hiện lỗi hồi quy giao diện trên dự án ${repoSlug}, CI/CD chặn Pull Request!`}
                  </span>
                </div>

                {simOutput.runRecord && (
                  <button
                    type="button"
                    onClick={() => onOpenInWorkbench && onOpenInWorkbench(simOutput.runRecord)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-semibold cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Mở Soi Kính Lúp &amp; Thanh Trượt Trên Bàn Kiểm Định (Tab 01)</span>
                  </button>
                )}
              </div>

              <pre className="p-4 bg-[#090a0f] text-slate-200 border border-slate-800 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
                {simOutput.consoleText}
              </pre>

              {/* Inline Visual Proof of the Cloned GitHub Project */}
              {activePreviewResult && (
                <div className="p-4 bg-surface-elevated border border-line-subtle rounded-lg space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-mono font-bold uppercase text-ink-primary">
                        Ảnh Chụp Thực Tế Giao Diện Dự Án [{repoSlug}] Vừa Kiểm Định
                      </h4>
                      <p className="text-[11px] text-ink-secondary">
                        Sai lệch điểm ảnh: <strong className="font-mono text-rose-500">{activePreviewResult.diff_ratio?.toFixed(4)}%</strong> &middot; Điểm cấu trúc SSIM: <strong className="font-mono text-blue-500">{activePreviewResult.ssim_score?.toFixed(4)}</strong> &middot; Phát hiện <strong className="font-mono">{activePreviewResult.bounding_boxes?.length || 0} vùng lỗi</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-surface-panel p-0.5 rounded border border-line-subtle text-xs font-mono">
                      {['desktop', 'tablet', 'mobile'].map((vp) => (
                        <button
                          key={vp}
                          type="button"
                          onClick={() => setPreviewViewport(vp)}
                          className={`px-2.5 py-1 rounded uppercase cursor-pointer transition-colors ${
                            previewViewport === vp
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'text-ink-secondary hover:text-ink-primary'
                          }`}
                        >
                          {vp}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border border-line-subtle rounded bg-surface-panel overflow-hidden">
                      <div className="px-3 py-1.5 bg-surface-inset border-b border-line-subtle text-[11px] font-mono font-semibold text-emerald-500">
                        1. ẢNH GỐC ({repoSlug} - Baseline)
                      </div>
                      <div className="max-h-[320px] overflow-y-auto p-2">
                        <img
                          src={`${api.getImageUrl(activePreviewResult.baseline_image_url)}?t=${Date.now()}`}
                          alt="Baseline của dự án GitHub"
                          className="w-full h-auto rounded border border-line-subtle"
                        />
                      </div>
                    </div>

                    <div className="border border-line-subtle rounded bg-surface-panel overflow-hidden">
                      <div className="px-3 py-1.5 bg-surface-inset border-b border-line-subtle text-[11px] font-mono font-semibold text-amber-500">
                        2. ẢNH HIỆN TẠI ({repoSlug} - Current)
                      </div>
                      <div className="max-h-[320px] overflow-y-auto p-2">
                        <img
                          src={`${api.getImageUrl(activePreviewResult.current_image_url)}?t=${Date.now()}`}
                          alt="Current của dự án GitHub"
                          className="w-full h-auto rounded border border-line-subtle"
                        />
                      </div>
                    </div>

                    <div className="border border-line-subtle rounded bg-surface-panel overflow-hidden">
                      <div className="px-3 py-1.5 bg-surface-inset border-b border-line-subtle text-[11px] font-mono font-semibold text-rose-500">
                        3. BẢN ĐỒ NHIỆT LỖI ({activePreviewResult.bounding_boxes?.length || 0} vùng lỗi)
                      </div>
                      <div className="max-h-[320px] overflow-y-auto p-2">
                        <img
                          src={`${api.getImageUrl(activePreviewResult.diff_image_url)}?t=${Date.now()}`}
                          alt="Diff Heatmap của dự án GitHub"
                          className="w-full h-auto rounded border border-line-subtle"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isSimulating && !simOutput && (
            <div className="p-4 bg-surface-elevated border border-line-subtle rounded-lg text-xs text-ink-secondary flex items-center justify-between">
              <span>
                Bấm nút <strong>"Chạy Kiểm Thử Dự Án {repoSlug} Ngay"</strong> ở góc phải phía trên để hệ thống tự động tải kho GitHub <code className="font-mono text-ink-primary">{repoSlug}</code>, dựng giao diện web của dự án đó và xuất ảnh kết quả kiểm định ngay tại đây.
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
