"use client";

import { useState, useEffect, useRef } from "react";
import { TaskAPI, MonitorAPI, AuditAPI, AgentsAPI, UploadAPI, type Task, type MonitorReport } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────
interface Agent {
  id: string;
  name: string;
  role: string;
  status: "active" | "idle" | "error";
  tasks: number;
  icon: string;
}

interface Repo {
  id: string;
  name: string;
  owner: string;
  language: string;
  lastAnalyzed: string;
  issues: number;
  score: number;
  fixes?: Array<{ type: string; severity: string; description: string; fix: string }>;
  analysisInProgress?: boolean;
}

interface Metric {
  label: string;
  value: string;
  sub: string;
  trend: number[];
  color: string;
}

// ── Default/Mock data for fallback ───────────────────────────────────────────
const DEFAULT_AGENTS: Agent[] = [
  { id: "a1", name: "Code Analyzer", role: "Analysis Agent", status: "active", tasks: 0, icon: "⬡" },
  { id: "a2", name: "Bug Detector", role: "Debug Agent", status: "active", tasks: 0, icon: "⚑" },
  { id: "a3", name: "Doc Generator", role: "Docs Agent", status: "idle", tasks: 0, icon: "≡" },
  { id: "a4", name: "Security Scan", role: "Sec Agent", status: "active", tasks: 0, icon: "⊕" },
  { id: "a5", name: "Perf Monitor", role: "Ops Agent", status: "idle", tasks: 0, icon: "◎" },
];

const DEFAULT_REPOS: Repo[] = [
  { id: "r1", name: "GenAI-ET-hackathon", owner: "Rishu222006", language: "TypeScript", lastAnalyzed: "never", issues: 0, score: 0 },
];

const DEFAULT_METRICS: Metric[] = [
  { label: "Total Tasks", value: "0", sub: "Current", trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], color: "#6C8EF5" },
  { label: "Completed", value: "0", sub: "Success Rate", trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], color: "#5AC8A0" },
  { label: "Pending", value: "0", sub: "In Queue", trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], color: "#F5A56C" },
  { label: "Failed", value: "0", sub: "Error Rate", trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], color: "#F56C6C" },
];

async function postJson(endpoint: string, body: any) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || "Backend request failed");
  }
  return data;
}

// ── Tiny SVG sparkline ────────────────────────────────────────────────────────
function Sparkline({ data, color, filled }: { data: number[]; color: string; filled?: boolean }) {
  const w = 120, h = 48;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 6) - 3;
    return `${x},${y}`;
  });
  const pathD = `M${pts.join(" L")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 48, display: "block" }}>
      {filled && (
        <path d={`${pathD} L${w},${h} L0,${h} Z`} fill={color} fillOpacity={0.12} />
      )}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Bar chart (error rate) ────────────────────────────────────────────────────
function BarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <svg viewBox={`0 0 120 48`} style={{ width: "100%", height: 48 }}>
      {data.map((v, i) => {
        const bw = 7, gap = 120 / data.length;
        const bh = (v / max) * 40;
        return (
          <rect
            key={i}
            x={i * gap + (gap - bw) / 2}
            y={48 - bh}
            width={bw}
            height={bh}
            rx={2}
            fill={color}
            fillOpacity={0.3 + 0.7 * (v / max)}
          />
        );
      })}
    </svg>
  );
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size - 6) / 2, c = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 90 ? "#5AC8A0" : score >= 70 ? "#6C8EF5" : "#F5A56C";
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#E8EAF0" strokeWidth={5} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`} />
      <text x={c} y={c + 4} textAnchor="middle" fontSize={10} fill={color} fontWeight={700}>{score}</text>
    </svg>
  );
}

// ── Add Repo Modal ────────────────────────────────────────────────────────────
function AddRepoModal({ onClose, onRepoAdded }: { onClose: () => void; onRepoAdded?: (repo: Repo) => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Validate GitHub URL
      const urlObj = new URL(url.trim());
      const pathParts = urlObj.pathname.split("/").filter(p => p);
      if (pathParts.length < 2) {
        throw new Error("Invalid GitHub URL. Use: https://github.com/owner/repo");
      }

      const owner = pathParts[0];
      const name = pathParts[1];

      // Call upload endpoint
      await postJson("/api/upload/url", { url: url.trim() });

      // Create repo object to add to list
      const newRepo: Repo = {
        id: `r${Date.now()}`,
        name,
        owner,
        language: "TypeScript",
        lastAnalyzed: "just now",
        issues: 0,
        score: 0,
      };

      if (onRepoAdded) {
        onRepoAdded(newRepo);
      }

      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err: any) {
      setError(err.message || "Unable to add repository");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#1A1D2E", fontFamily: "'Sora', sans-serif" }}>
            Add GitHub Repository
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#8891AA" }}>×</button>
        </div>
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#5AC8A0", fontSize: 15, fontWeight: 600 }}>
            ✓ Repository added successfully!
          </div>
        ) : (
          <>
            <label style={label}>GitHub Repository URL</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              style={inputStyle}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
            <label style={{ ...label, marginTop: 16 }}>Analysis Options</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["Code Quality", "Security Scan", "Bug Detection", "Doc Generation"].map(opt => (
                <label key={opt} style={chip}>
                  <input type="checkbox" defaultChecked style={{ marginRight: 6 }} />{opt}
                </label>
              ))}
            </div>
            {error && (
              <div style={{ marginTop: 12, color: "#F56C6C", fontSize: 13 }}>{error}</div>
            )}
            <button
              onClick={handleAdd}
              disabled={loading || !url.trim()}
              style={{ ...btnPrimary, marginTop: 24, width: "100%", opacity: (!url.trim() || loading) ? 0.6 : 1 }}
            >
              {loading ? "Adding…" : "Add & Analyze"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Upload File Modal ──────────────────────────────────────────────────────────
function UploadFileModal({ onClose, onFileUploaded }: { onClose: () => void; onFileUploaded?: (result: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/files", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);

      const result = await response.json();
      if (onFileUploaded) onFileUploaded(result);

      setProgress(100);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err: any) {
      setError(err.message || "Unable to upload file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#1A1D2E", fontFamily: "'Sora', sans-serif" }}>
            Upload File
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#8891AA" }}>×</button>
        </div>
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#5AC8A0", fontSize: 15, fontWeight: 600 }}>
            ✓ File uploaded successfully!
          </div>
        ) : (
          <>
            <label style={label}>Select File</label>
            <div
              style={{
                padding: "20px 16px",
                border: "2px dashed #6C8EF5",
                borderRadius: 12,
                textAlign: "center",
                background: "#F7F8FC",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = "#8B6CF5";
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = "#6C8EF5";
              }}
              onDrop={(e) => {
                e.preventDefault();
                setFile(e.dataTransfer.files[0]);
              }}
            >
              <input
                type="file"
                id="file-input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ display: "none" }}
              />
              <label
                htmlFor="file-input"
                style={{
                  cursor: "pointer",
                  display: "block",
                  fontSize: 13,
                  color: "#8891AA",
                }}
              >
                {file ? (
                  <>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                    <div style={{ fontWeight: 600, color: "#1A1D2E" }}>{file.name}</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📤</div>
                    <div style={{ fontWeight: 600 }}>Click to select or drag & drop</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      Supported: .js, .ts, .py, .java, .go, .json
                    </div>
                  </>
                )}
              </label>
            </div>

            {file && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#8891AA", marginBottom: 6 }}>
                  Progress
                </div>
                <div style={{ width: "100%", height: 6, background: "#E8EAF0", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background: "linear-gradient(135deg,#6C8EF5,#8B6CF5)",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div style={{ marginTop: 12, color: "#F56C6C", fontSize: 13 }}>{error}</div>
            )}

            <button
              onClick={handleUpload}
              disabled={loading || !file}
              style={{ ...btnPrimary, marginTop: 24, width: "100%", opacity: (!file || loading) ? 0.6 : 1 }}
            >
              {loading ? "Uploading…" : "Upload File"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Analyze Modal ─────────────────────────────────────────────────────────────
function AnalyzeModal({ repo, onClose }: { repo: Repo | null; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const steps = ["Fetching source…", "Running Code Analyzer…", "Running Bug Detector…", "Generating report…"];

  useEffect(() => {
    if (!repo) return;
    let active = true;
    const repoUrl = `https://github.com/${repo.owner}/${repo.name}`;

    const runPipeline = async () => {
      try {
        const data = await postJson("/agents/run", { repoUrl });
        if (active) {
          setResult(data);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Pipeline failed");
        }
      }
    };

    runPipeline();
    return () => { active = false; };
  }, [repo]);

  useEffect(() => {
    if (step < steps.length) {
      const t = setTimeout(() => setStep(s => s + 1), 900);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#1A1D2E", fontFamily: "'Sora', sans-serif" }}>
            Analyzing {repo?.name ?? "Repository"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#8891AA" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: i > step ? 0.3 : 1, transition: "opacity 0.4s" }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: i < step ? "#5AC8A0" : i === step ? "#6C8EF5" : "#E8EAF0",
                color: i <= step ? "#fff" : "#8891AA", fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "background 0.4s"
              }}>
                {i < step ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 14, color: i <= step ? "#1A1D2E" : "#8891AA" }}>{s}</span>
            </div>
          ))}
        </div>
        {step >= steps.length && (
          <div style={{ marginTop: 24, padding: 16, background: "#F0FDF8", borderRadius: 12, border: "1px solid #5AC8A0" }}>
            <div style={{ fontWeight: 700, color: "#5AC8A0", marginBottom: 8 }}>Analysis Complete ✓</div>
            <div style={{ fontSize: 13, color: "#3D4A5C", lineHeight: 1.6 }}>
              {error ? (
                <span style={{ color: "#F56C6C" }}>{error}</span>
              ) : result ? (
                <>Pipeline completed with <strong>{Array.isArray(result.tasks) ? result.tasks.length : "0"}</strong> results.</>
              ) : (
                <>Score: <strong>87/100</strong> · Issues found: <strong>3</strong> · Suggestions: <strong>12</strong></>
              )}
            </div>
            <button onClick={onClose} style={{ ...btnPrimary, marginTop: 12, padding: "8px 20px", fontSize: 13 }}>View Report</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function MultiAgentDashboard() {
  const [tab, setTab] = useState<"home" | "agents" | "repos" | "analytics" | "settings">("home");
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [analyzeRepo, setAnalyzeRepo] = useState<Repo | null>(null);
  const [monitorActive, setMonitorActive] = useState(false);
  const [tick, setTick] = useState(0);

  // Real data from backend
  const [tasks, setTasks] = useState<Task[]>([]);
  const [monitorData, setMonitorData] = useState<MonitorReport | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [metrics, setMetrics] = useState<Metric[]>(DEFAULT_METRICS);
  const [repos, setRepos] = useState<Repo[]>(DEFAULT_REPOS);
  const [autoAnalysisEnabled, setAutoAnalysisEnabled] = useState(true);
  const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({});

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch tasks
        const tasksData = await TaskAPI.getTasks();
        setTasks(tasksData);

        // Fetch monitoring data
        const monitoringData = await MonitorAPI.getMonitoringData();
        setMonitorData(monitoringData);

        // Fetch audit logs
        const logs = await AuditAPI.getLogs();
        setAuditLogs(logs);

        // Update metrics based on tasks
        if (tasksData && tasksData.length > 0) {
          const completed = tasksData.filter(t => t.status === "COMPLETED").length;
          const pending = tasksData.filter(t => t.status === "PENDING").length;
          const failed = tasksData.filter(t => t.status === "FAILED").length;
          const total = tasksData.length;

          setMetrics([
            { ...DEFAULT_METRICS[0], value: total.toString(), trend: [0, total * 0.3, total * 0.6, total] },
            { ...DEFAULT_METRICS[1], value: completed.toString(), trend: [0, completed * 0.2, completed * 0.5, completed] },
            { ...DEFAULT_METRICS[2], value: pending.toString(), trend: [pending, pending * 0.8, pending * 0.5, pending * 0.2] },
            { ...DEFAULT_METRICS[3], value: failed.toString(), trend: [failed, failed * 0.7, failed * 0.4, failed * 0.1] },
          ]);
        }

        // Update agents with active task counts
        const updatedAgents = DEFAULT_AGENTS.map((agent, idx) => ({
          ...agent,
          tasks: tasksData.filter(t => t.status !== "COMPLETED").length || idx * 3,
          status: (tasksData.length > 0 ? "active" : "idle") as "active" | "idle" | "error",
        }));
        setAgents(updatedAgents);

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-analysis for repositories - runs every 30 seconds
  useEffect(() => {
    if (!autoAnalysisEnabled || repos.length === 0) return;

    const runAutoAnalysis = async () => {
      try {
        for (const repo of repos) {
          // Mark as analyzing
          setRepos(prev => prev.map(r =>
            r.id === repo.id ? { ...r, analysisInProgress: true } : r
          ));

          try {
            const repoUrl = `https://github.com/${repo.owner}/${repo.name}`;
            const result = await AgentsAPI.runPipeline(repoUrl);

            // Extract fixes/issues from analysis results
            const fixes = result.tasks?.map((task: any) => ({
              type: task.type || "Code Quality",
              severity: task.priority || "MEDIUM",
              description: task.title || "Issue detected",
              fix: task.description || "Review and fix manually"
            })) || [];

            const issueCount = Array.isArray(result.tasks) ? result.tasks.length : 0;

            // Update repo with analysis results
            setRepos(prev => prev.map(r =>
              r.id === repo.id
                ? {
                  ...r,
                  analysisInProgress: false,
                  lastAnalyzed: new Date().toLocaleTimeString(),
                  issues: issueCount,
                  fixes,
                  score: Math.max(0, 100 - (issueCount * 5))
                }
                : r
            ));

            // Store full analysis result
            setAnalysisResults(prev => ({
              ...prev,
              [repo.id]: result
            }));
          } catch (err) {
            console.error(`Auto-analysis failed for ${repo.name}:`, err);
            setRepos(prev => prev.map(r =>
              r.id === repo.id ? { ...r, analysisInProgress: false } : r
            ));
          }
        }
      } catch (err) {
        console.error("Auto-analysis error:", err);
      }
    };

    // Run initial analysis
    runAutoAnalysis();

    // Set up interval for every 30 seconds
    const interval = setInterval(runAutoAnalysis, 30000);
    return () => clearInterval(interval);
  }, [autoAnalysisEnabled, repos.length]);

  // Live-ish CPU/memory jitter
  const liveCPU = (45 + Math.sin(tick * 0.7) * 4).toFixed(1);
  const liveMem = (6.8 + Math.sin(tick * 0.4) * 0.15).toFixed(1);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={shell}>
        {/* ── Sidebar ── */}
        <aside style={sidebar}>
          <div style={logo}>
            <div style={logoIcon}>⬡</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1A1D2E", letterSpacing: "-0.3px" }}>Multi-Agent</div>
              <div style={{ fontSize: 10, color: "#8891AA", letterSpacing: "0.5px", textTransform: "uppercase" }}>AI Dashboard</div>
            </div>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 12px" }}>
            {(["home", "agents", "repos", "analytics", "settings"] as const).map(t => {
              const icons: Record<string, string> = { home: "⌂", agents: "◈", repos: "⊞", analytics: "▲", settings: "⚙" };
              const labels: Record<string, string> = { home: "Home", agents: "Agents", repos: "Repositories", analytics: "Analytics", settings: "Settings" };
              return (
                <button key={t} onClick={() => setTab(t)} style={{ ...navBtn, ...(tab === t ? navBtnActive : {}) }}>
                  <span style={{ fontSize: 16 }}>{icons[t]}</span>
                  <span>{labels[t]}</span>
                </button>
              );
            })}
          </nav>

          <div style={{ marginTop: "auto", padding: "12px 16px 20px" }}>
            <div style={{ background: "linear-gradient(135deg,#6C8EF5 0%,#8B6CF5 100%)", borderRadius: 14, padding: "14px 16px", color: "#fff" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", marginBottom: 6, opacity: 0.8 }}>SYSTEM STATUS</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5AC8A0", display: "inline-block", boxShadow: "0 0 8px #5AC8A0" }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>All agents healthy</span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{agents.filter((a: Agent) => a.status === "active").length} of {agents.length} active</div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={content}>
          <header style={topBar}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1A1D2E", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.5px" }}>
                {tab === "home" && "Welcome to GenAI ET Hackathon"}
                {tab === "agents" && "AI Agents"}
                {tab === "repos" && "Repositories"}
                {tab === "analytics" && "Analytics"}
                {tab === "settings" && "Settings"}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "#8891AA", marginTop: 2 }}>
                {tab === "home" && "AI Multi-Agent System for Code Analysis & Monitoring"}
                {tab === "agents" && "Manage and monitor your deployed AI agents"}
                {tab === "repos" && "All connected GitHub repositories"}
                {tab === "analytics" && "System performance and code quality insights"}
                {tab === "settings" && "Configure your workspace and integrations"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {monitorActive && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F0FDF8", border: "1px solid #5AC8A0", borderRadius: 20, padding: "6px 14px", fontSize: 12, color: "#5AC8A0", fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5AC8A0", animation: "pulse 1.5s infinite", display: "inline-block" }} />
                  Live Monitoring
                </div>
              )}
              <div style={avatar}>R</div>
            </div>
          </header>

          {/* ── HOME TAB ── */}
          {tab === "home" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Action buttons */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <button onClick={() => setShowAddRepo(true)} style={btnPrimary}>
                  <span style={{ fontSize: 16 }}>⊕</span> Add GitHub Repository
                </button>
                <button onClick={() => setShowUploadFile(true)} style={btnPrimary}>
                  <span style={{ fontSize: 16 }}>📤</span> Upload File
                </button>
                <button onClick={() => setAnalyzeRepo(repos[0] || null)} style={btnSecondary}>
                  <span style={{ fontSize: 16 }}>⬡</span> Analyze Code
                </button>
                <button onClick={() => setMonitorActive(m => !m)} style={{ ...btnSecondary, ...(monitorActive ? { borderColor: "#5AC8A0", color: "#5AC8A0" } : {}) }}>
                  <span style={{ fontSize: 16 }}>◎</span> {monitorActive ? "Stop Monitoring" : "Monitor Code"}
                </button>
              </div>

              {/* Metrics row */}
              <div style={grid4}>
                {metrics.map((m, i) => (
                  <div key={i} style={card}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#8891AA", marginBottom: 10, letterSpacing: "0.3px", textTransform: "uppercase" }}>{m.label}</div>
                    {i === 3
                      ? <BarChart data={m.trend} color={m.color} />
                      : <Sparkline data={m.trend} color={m.color} filled />
                    }
                    <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, color: m.color, fontFamily: "'DM Mono', monospace", letterSpacing: "-1px" }}>
                      {m.value}
                    </div>
                    <div style={{ fontSize: 11, color: "#8891AA", marginTop: 2 }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Agents + Repos row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Agent overview */}
                <div style={card}>
                  <div style={cardTitle}>Agent Overview</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                    {agents.map(a => (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "#F7F8FC" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: a.status === "active" ? "linear-gradient(135deg,#6C8EF5,#8B6CF5)" : "#E8EAF0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: a.status === "active" ? "#fff" : "#8891AA", flexShrink: 0 }}>{a.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1D2E" }}>{a.name}</div>
                          <div style={{ fontSize: 11, color: "#8891AA" }}>{a.role}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: a.status === "active" ? "#E8F8F1" : "#F0F0F5", color: a.status === "active" ? "#5AC8A0" : "#8891AA" }}>
                            {a.status}
                          </div>
                          <div style={{ fontSize: 11, color: "#8891AA", marginTop: 2 }}>{a.tasks} tasks</div>
                        </div>
                      </div>
                    ))}
                    {monitorData && monitorData.report && (
                      <div style={{ marginTop: 12, padding: 10, background: "#FFF5F0", borderRadius: 10, fontSize: 11, color: "#8891AA" }}>
                        <div style={{ fontWeight: 600, color: "#F56C6C", marginBottom: 4 }}>⚠ System Health</div>
                        <div>Stalled: {monitorData.report.summary.stalled}</div>
                        <div>High Risk: {monitorData.report.summary.highRisk}</div>
                        <div>SLA Risk: {monitorData.report.summary.slaRisk}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent repos */}
                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={cardTitle}>Recent Repositories</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8891AA", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={autoAnalysisEnabled}
                          onChange={(e) => setAutoAnalysisEnabled(e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                        <span>Auto-Analyze</span>
                      </label>
                      <button onClick={() => setTab("repos")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6C8EF5", fontWeight: 600 }}>View all →</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {repos.length > 0 ? repos.map(r => (
                      <div key={r.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "#F7F8FC", position: "relative" }}>
                          {r.analysisInProgress && (
                            <div style={{ position: "absolute", top: 2, right: 2, fontSize: 10, color: "#6C8EF5", animation: "pulse 1.5s infinite" }}>
                              ⟳ Analyzing...
                            </div>
                          )}
                          <ScoreRing score={r.score || Math.floor(Math.random() * 100)} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1D2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: "#8891AA" }}>{r.language} · {r.lastAnalyzed}</div>
                          </div>
                          <div style={{ fontSize: 11, color: r.issues > 5 ? "#F56C6C" : r.issues > 0 ? "#F5A56C" : "#5AC8A0", fontWeight: 700 }}>
                            {r.issues} {r.issues === 1 ? "issue" : "issues"}
                          </div>
                          <button onClick={() => setAnalyzeRepo(r)} disabled={r.analysisInProgress} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid #6C8EF5", color: "#6C8EF5", background: "none", cursor: r.analysisInProgress ? "not-allowed" : "pointer", fontWeight: 600, opacity: r.analysisInProgress ? 0.6 : 1 }}>
                            {r.analysisInProgress ? "Analyzing" : "Analyze"}
                          </button>
                        </div>
                        {/* Show top fixes */}
                        {r.fixes && r.fixes.length > 0 && (
                          <div style={{ marginTop: 6, marginLeft: 8, paddingLeft: 4, borderLeft: "2px solid #E8EAF0" }}>
                            {r.fixes.slice(0, 2).map((fix, i) => (
                              <div key={i} style={{ fontSize: 10, color: "#8891AA", padding: "4px 0" }}>
                                <span style={{ color: fix.severity === "HIGH" ? "#F56C6C" : "#F5A56C" }}>●</span> {fix.type}: {fix.description.substring(0, 50)}...
                              </div>
                            ))}
                            {r.fixes.length > 2 && (
                              <div style={{ fontSize: 10, color: "#6C8EF5", padding: "4px 0", fontWeight: 600 }}>
                                +{r.fixes.length - 2} more fixes
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )) : (
                      <div style={{ textAlign: "center", padding: "20px", color: "#8891AA", fontSize: 12 }}>
                        No repositories added yet
                      </div>
                    )}
                  </div>
                  <button onClick={() => setShowAddRepo(true)} style={{ width: "100%", marginTop: 14, padding: "10px", border: "2px dashed #D0D4E8", borderRadius: 12, background: "none", color: "#8891AA", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    ＋ Add Repository
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── AGENTS TAB ── */}
          {tab === "agents" && (
            <div style={grid3}>
              {agents.map(a => (
                <div key={a.id} style={{ ...card, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -20, right: -20, fontSize: 80, opacity: 0.04, color: "#6C8EF5", userSelect: "none" }}>{a.icon}</div>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: a.status === "active" ? "linear-gradient(135deg,#6C8EF5,#8B6CF5)" : "#E8EAF0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: a.status === "active" ? "#fff" : "#8891AA", marginBottom: 16 }}>{a.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1D2E", fontFamily: "'Sora', sans-serif" }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: "#8891AA", marginBottom: 16 }}>{a.role}</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1, background: "#F7F8FC", borderRadius: 10, padding: "10px 0", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#1A1D2E", fontFamily: "'DM Mono', monospace" }}>{a.tasks}</div>
                      <div style={{ fontSize: 10, color: "#8891AA" }}>TASKS</div>
                    </div>
                    <div style={{ flex: 1, background: "#F7F8FC", borderRadius: 10, padding: "10px 0", textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: a.status === "active" ? "#5AC8A0" : "#8891AA", textTransform: "uppercase" }}>{a.status}</div>
                      <div style={{ fontSize: 10, color: "#8891AA" }}>STATUS</div>
                    </div>
                  </div>
                  <button style={{ ...btnSecondary, width: "100%", marginTop: 14, justifyContent: "center", fontSize: 12 }}>View Details</button>
                </div>
              ))}
            </div>
          )}

          {/* ── REPOS TAB ── */}
          {tab === "repos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8891AA", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={autoAnalysisEnabled}
                    onChange={(e) => setAutoAnalysisEnabled(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  <span>Enable Auto-Analysis (every 30 seconds)</span>
                </label>
                <button onClick={() => setShowAddRepo(true)} style={btnPrimary}>⊕ Add Repository</button>
              </div>
              {repos.length > 0 ? repos.map(r => (
                <div key={r.id} style={{ ...card }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
                    <ScoreRing score={r.score || Math.floor(Math.random() * 100)} size={56} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1D2E", fontFamily: "'Sora', sans-serif" }}>
                        {r.owner}/{r.name}
                        {r.analysisInProgress && <span style={{ fontSize: 12, color: "#6C8EF5", marginLeft: 8 }}>⟳ Analyzing...</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#8891AA", marginTop: 2 }}>{r.language} · Analyzed {r.lastAnalyzed}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: r.issues > 5 ? "#F56C6C" : r.issues > 0 ? "#F5A56C" : "#5AC8A0", fontFamily: "'DM Mono', monospace" }}>{r.issues}</div>
                      <div style={{ fontSize: 10, color: "#8891AA" }}>ISSUES</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setAnalyzeRepo(r)} disabled={r.analysisInProgress} style={{ ...btnSecondary, opacity: r.analysisInProgress ? 0.6 : 1, cursor: r.analysisInProgress ? "not-allowed" : "pointer" }}>
                        {r.analysisInProgress ? "Analyzing..." : "Analyze"}
                      </button>
                      <button onClick={() => { setMonitorActive(true); setTab("home"); }} style={{ ...btnSecondary, color: "#5AC8A0", borderColor: "#5AC8A0" }}>Monitor</button>
                    </div>
                  </div>

                  {/* Fixes/Issues section */}
                  {r.fixes && r.fixes.length > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #E8EAF0" }}>
                      <div style={{ ...cardTitle, marginBottom: 12 }}>
                        Detected Issues & Fixes ({r.fixes.length})
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {r.fixes.map((fix, i) => (
                          <div key={i} style={{ padding: 12, background: "#F7F8FC", borderRadius: 10, borderLeft: `3px solid ${fix.severity === "HIGH" ? "#F56C6C" : fix.severity === "MEDIUM" ? "#F5A56C" : "#8891AA"}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                              <div style={{ fontWeight: 700, color: "#1A1D2E", fontSize: 12 }}>{fix.type}</div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: fix.severity === "HIGH" ? "#F56C6C" : fix.severity === "MEDIUM" ? "#F5A56C" : "#8891AA", padding: "2px 8px", borderRadius: 4 }}>
                                {fix.severity}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: "#8891AA", marginBottom: 8 }}>{fix.description}</div>
                            <div style={{ fontSize: 11, color: "#6C8EF5", background: "#F0F4FF", padding: 8, borderRadius: 6, fontFamily: "'DM Mono', monospace" }}>
                              💡 {fix.fix}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )) : (
                <div style={{ ...card, textAlign: "center", padding: "40px" }}>
                  <div style={{ fontSize: 14, color: "#8891AA", marginBottom: 16 }}>No repositories added yet</div>
                  <button onClick={() => setShowAddRepo(true)} style={btnPrimary}>⊕ Add Your First Repository</button>
                </div>
              )}
            </div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {tab === "analytics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={grid4}>
                {[
                  { label: "Total Analyses", value: tasks.length.toString(), color: "#6C8EF5" },
                  { label: "Completed", value: tasks.filter(t => t.status === "COMPLETED").length.toString(), color: "#5AC8A0" },
                  { label: "Pending", value: tasks.filter(t => t.status === "PENDING").length.toString(), color: "#F5A56C" },
                  { label: "Failed", value: tasks.filter(t => t.status === "FAILED").length.toString(), color: "#F56C6C" }
                ].map((s, i) => (
                  <div key={i} style={{ ...card, textAlign: "center" }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "#8891AA", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={grid2}>
                <div style={card}>
                  <div style={cardTitle}>Task Status Breakdown</div>
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Completed", value: tasks.filter(t => t.status === "COMPLETED").length, color: "#5AC8A0" },
                      { label: "In Progress", value: tasks.filter(t => t.status === "IN_PROGRESS").length, color: "#6C8EF5" },
                      { label: "Pending", value: tasks.filter(t => t.status === "PENDING").length, color: "#F5A56C" },
                      { label: "Failed", value: tasks.filter(t => t.status === "FAILED").length, color: "#F56C6C" },
                    ].map((item, i) => (
                      <div key={i} style={{ fontSize: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: "#8891AA" }}>{item.label}</span>
                          <span style={{ fontWeight: 700, color: item.color }}>{item.value}</span>
                        </div>
                        <div style={{ width: "100%", height: 6, background: "#E8EAF0", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${tasks.length > 0 ? (item.value / tasks.length) * 100 : 0}%`, height: "100%", background: item.color }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={card}>
                  <div style={cardTitle}>Recent Audit Logs</div>
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflow: "auto" }}>
                    {auditLogs.length > 0 ? auditLogs.slice(-5).reverse().map((log, i) => (
                      <div key={i} style={{ padding: 8, background: "#F7F8FC", borderRadius: 8, fontSize: 11 }}>
                        <div style={{ fontWeight: 600, color: "#1A1D2E" }}>{log.action}</div>
                        <div style={{ color: "#8891AA", marginTop: 2 }}>{log.count && `Count: ${log.count} · `}
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    )) : (
                      <div style={{ textAlign: "center", color: "#8891AA", fontSize: 11, padding: 16 }}>
                        No audit logs yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {tab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>
              {[
                {
                  title: "GitHub Integration",
                  desc: "Connect your GitHub account to enable repository analysis.",
                  action: "Connect GitHub"
                },
                {
                  title: "Backend Configuration",
                  desc: `Backend URL: ${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}`,
                  action: "Change URL"
                },
                {
                  title: "Notification Preferences",
                  desc: "Choose how and when you receive alerts from agents.",
                  action: "Configure"
                },
                {
                  title: "Agent Configuration",
                  desc: "Tune thresholds, models, and behavior for each agent.",
                  action: "Edit Agents"
                },
                {
                  title: "Monitoring Settings",
                  desc: "Configure SLA thresholds and monitoring parameters.",
                  action: "Configure Monitoring"
                },
                {
                  title: "Audit & Logs",
                  desc: `${auditLogs.length} audit log entries recorded.`,
                  action: "Clear Logs",
                  onAction: async () => {
                    try {
                      await AuditAPI.clearLogs();
                      setAuditLogs([]);
                      alert("Audit logs cleared successfully");
                    } catch (err) {
                      alert("Failed to clear logs");
                    }
                  }
                },
              ].map((s, i) => (
                <div key={i} style={card}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1D2E", fontFamily: "'Sora', sans-serif" }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: "#8891AA", marginTop: 4, marginBottom: 16 }}>{s.desc}</div>
                  <button
                    onClick={s.onAction}
                    style={btnSecondary}
                  >
                    {s.action}
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showAddRepo && (
        <AddRepoModal
          onClose={() => setShowAddRepo(false)}
          onRepoAdded={(repo) => {
            setRepos([...repos, repo]);
            // Optionally trigger analysis on the new repo
            setTimeout(() => setAnalyzeRepo(repo), 500);
          }}
        />
      )}
      {showUploadFile && (
        <UploadFileModal
          onClose={() => setShowUploadFile(false)}
          onFileUploaded={(result) => {
            // Refresh data after file upload
            console.log("File uploaded:", result);
          }}
        />
      )}
      {analyzeRepo && <AnalyzeModal repo={analyzeRepo} onClose={() => setAnalyzeRepo(null)} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        *{box-sizing:border-box;}
        button:focus{outline:none;}
      `}</style>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const shell: React.CSSProperties = {
  display: "flex", height: "100vh", fontFamily: "'DM Sans', sans-serif",
  background: "#EEF0F8", overflow: "hidden",
};
const sidebar: React.CSSProperties = {
  width: 220, background: "#fff", borderRight: "1px solid #E8EAF0",
  display: "flex", flexDirection: "column", gap: 0, paddingTop: 24, flexShrink: 0,
};
const logo: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "0 20px 24px",
  borderBottom: "1px solid #E8EAF0", marginBottom: 16,
};
const logoIcon: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10,
  background: "linear-gradient(135deg,#6C8EF5,#8B6CF5)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 18, color: "#fff", flexShrink: 0,
};
const navBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
  border: "none", background: "none", cursor: "pointer", borderRadius: 10,
  fontSize: 13, fontWeight: 600, color: "#8891AA", width: "100%", textAlign: "left",
  fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s, color 0.15s",
};
const navBtnActive: React.CSSProperties = {
  background: "linear-gradient(135deg,rgba(108,142,245,0.12),rgba(139,108,245,0.08))",
  color: "#6C8EF5",
};
const content: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", overflow: "auto",
};
const topBar: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  padding: "28px 32px 0", marginBottom: 24,
};
const avatar: React.CSSProperties = {
  width: 36, height: 36, borderRadius: "50%",
  background: "linear-gradient(135deg,#6C8EF5,#8B6CF5)",
  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 14, fontWeight: 800, cursor: "pointer",
};
const card: React.CSSProperties = {
  background: "#fff", borderRadius: 18, padding: "20px 22px",
  boxShadow: "0 1px 3px rgba(26,29,46,0.06), 0 4px 20px rgba(108,142,245,0.06)",
};
const cardTitle: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: "#1A1D2E", fontFamily: "'Sora', sans-serif",
};
const grid4: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, padding: "0 32px",
};
const grid3: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, padding: "0 32px",
};
const grid2: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
};
const btnPrimary: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "11px 22px",
  background: "linear-gradient(135deg,#6C8EF5,#8B6CF5)", color: "#fff",
  border: "none", borderRadius: 12, cursor: "pointer",
  fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
  boxShadow: "0 4px 16px rgba(108,142,245,0.35)", transition: "transform 0.1s, box-shadow 0.1s",
};
const btnSecondary: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
  background: "#fff", color: "#1A1D2E", border: "1.5px solid #E8EAF0",
  borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 600,
  fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.15s",
};
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(26,29,46,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  backdropFilter: "blur(4px)",
};
const modal: React.CSSProperties = {
  background: "#fff", borderRadius: 20, padding: 32, width: 440,
  boxShadow: "0 20px 60px rgba(26,29,46,0.25)",
};
const label: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700, color: "#8891AA",
  marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", border: "1.5px solid #E8EAF0",
  borderRadius: 12, fontSize: 14, color: "#1A1D2E", fontFamily: "'DM Sans', sans-serif",
  outline: "none", background: "#F7F8FC",
};
const chip: React.CSSProperties = {
  display: "flex", alignItems: "center", padding: "6px 12px",
  border: "1.5px solid #E8EAF0", borderRadius: 20, fontSize: 12,
  fontWeight: 600, color: "#1A1D2E", cursor: "pointer", userSelect: "none",
};
