"use client";

import { useState, useRef } from "react";
import {
  UploadAPI,
  AnalyzeAPI,
  AgentsAPI,
  TaskAPI,
  MonitorAPI,
  type Task,
  type MonitorReport
} from "@/lib/api";

interface TabItem {
  id: string;
  label: string;
  icon: string;
}

interface JsonViewerProps {
  data: any;
  level?: number;
}

const ResponseCard: React.FC<{ data: any }> = ({ data }) => {
  if (!data) return null;

  // Handle error responses
  if (data.error) {
    return (
      <div style={styles.errorCard}>
        <div style={styles.errorCardContent}>
          <h4 style={styles.errorTitle}>⚠️ Error</h4>
          <p style={styles.errorMessage}>{data.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.responseBody}>
      {/* Summary Section */}
      {(data.summary || data.analysis?.summary) && (
        <div style={styles.summarySection}>
          <h3 style={styles.sectionHeading}>📋 Summary</h3>
          <p style={styles.summaryParagraph}>{data.summary || data.analysis?.summary}</p>
        </div>
      )}

      {/* Language Section */}
      {(data.language || data.analysis?.language) && (
        <div style={styles.infoSection}>
          <p style={styles.infoText}>
            <strong>Detected Language:</strong> {data.language || data.analysis?.language}
          </p>
        </div>
      )}

      {/* Issues Section */}
      {data.issues && data.issues.length > 0 && (
        <div style={styles.issuesSection}>
          <h3 style={styles.sectionHeading}>🔴 Issues Found ({data.issues.length})</h3>
          {data.issues.map((issue: any, idx: number) => (
            <div key={idx} style={styles.issueLine}>
              <div style={styles.issueNumber}>{idx + 1}.</div>
              <div>
                <h4 style={styles.issueHeading}>
                  {issue.title || issue.message || issue.type}
                  {issue.severity && (
                    <span
                      style={{
                        ...styles.severityLabel,
                        background: getSeverityColor(issue.severity),
                      }}
                    >
                      {issue.severity}
                    </span>
                  )}
                </h4>
                <p style={styles.issueText}>{issue.description || issue.details || ""}</p>
                {issue.line && <p style={styles.lineNum}>Line: {issue.line}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations Section */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div style={styles.recommendationsSection}>
          <h3 style={styles.sectionHeading}>💡 Recommendations ({data.recommendations.length})</h3>
          <ul style={styles.recList}>
            {data.recommendations.map((rec: any, idx: number) => (
              <li key={idx} style={styles.recItem}>
                {typeof rec === "string" ? rec : rec.title || JSON.stringify(rec)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quality Score */}
      {(data.qualityScore || data.analysis?.qualityScore) && (
        <div style={styles.scoreSection}>
          <h3 style={styles.sectionHeading}>🎯 Quality Score</h3>
          <div style={styles.scoreBig}>{data.qualityScore || data.analysis?.qualityScore}</div>
        </div>
      )}

      {/* Security Section */}
      {data.security && (
        <div style={styles.securitySection}>
          <h3 style={styles.sectionHeading}>🔒 Security Analysis</h3>
          {data.security.vulnerabilities && data.security.vulnerabilities.length > 0 ? (
            <div>
              <p style={styles.vulnCount}>
                Found {data.security.vulnerabilities.length} vulnerabilities
              </p>
              {data.security.vulnerabilities.map((vuln: any, idx: number) => (
                <div key={idx} style={styles.vulnItem}>
                  <div style={styles.vulnHeader}>
                    <span style={styles.vulnSev}>{vuln.severity}</span>
                    <span style={styles.vulnTit}>{vuln.title || vuln.name}</span>
                  </div>
                  <p style={styles.vulnDesc}>{vuln.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.passText}>✓ No vulnerabilities detected</p>
          )}
        </div>
      )}

      {/* Status Section */}
      {data.status && (
        <div style={styles.statusSection}>
          <h3 style={styles.sectionHeading}>Status</h3>
          <p style={styles.statusText}>{data.status}</p>
        </div>
      )}

      {/* Overall Status */}
      {data.overallStatus && (
        <div style={styles.statusSection}>
          <h3 style={styles.sectionHeading}>Overall Status</h3>
          {Object.entries(data.overallStatus).map(([key, value]: [string, any]) => (
            <p key={key} style={styles.statusLine}>
              <strong>{key}:</strong> {String(value)}
            </p>
          ))}
        </div>
      )}

      {/* Tasks List (Agents results) */}
      {data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0 && (
        <div style={styles.tasksSection}>
          <h3 style={styles.sectionHeading}>🧾 Agent Tasks ({data.tasks.length})</h3>
          <div style={styles.taskList}>
            {data.tasks.map((task: any, idx: number) => (
              <div key={idx} style={styles.taskItem}>
                <p style={styles.taskTitle}>
                  <strong>{idx + 1}.</strong> {task.title || task.message || "Unnamed task"}
                </p>
                <p style={styles.taskMeta}>
                  {task.file && <>File: {task.file}</>}
                  {task.line && <> | Line: {task.line}</>}
                  {task.priority && <> | Priority: {task.priority}</>}
                  {task.status && <> | Status: {task.status}</>}
                </p>
                {task.executionPlan && <p style={styles.taskPlan}>{task.executionPlan}</p>}
                {task.decision && <p style={styles.taskPlan}>Decision: {task.decision}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Details (if different structure) */}
      {data.analysis && !data.summary && (
        <div style={styles.analysisSection}>
          <h3 style={styles.sectionHeading}>Analysis Details</h3>
          {data.analysis.status && (
            <p style={styles.analysisText}>
              <strong>Status:</strong> {data.analysis.status}
            </p>
          )}
          {data.analysis.summary && (
            <p style={styles.analysisText}>{data.analysis.summary}</p>
          )}
        </div>
      )}
    </div>
  );
};

const getSeverityColor = (severity: string): string => {
  const colors: { [key: string]: string } = {
    high: "#f44336",
    medium: "#ff9800",
    low: "#4CAF50",
    critical: "#c41c3b",
  };
  return colors[severity?.toLowerCase()] || "#999";
};

const tabs: TabItem[] = [
  { id: "upload", label: "Upload", icon: "📤" },
  { id: "analyze", label: "Analyze", icon: "🔍" },
  { id: "agents", label: "Agents", icon: "🤖" },
  { id: "monitor", label: "Monitor", icon: "📊" },
  { id: "tasks", label: "Tasks", icon: "✓" },
];

export default function GenAIFrontend() {
  const [tab, setTab] = useState("upload");
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeEndpoint, setActiveEndpoint] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRequest = async (
    apiCall: () => Promise<any>,
    endpoint: string
  ) => {
    setLoading(true);
    setResult(null);
    setActiveEndpoint(endpoint);

    try {
      let data = await apiCall();

      //  FIX: parse if string
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error("Invalid JSON:", e);
        }
      }

      //  ALSO handle cases like: { response: "json {...}" }
      if (data?.response && typeof data.response === "string") {
        try {
          const cleaned = data.response.replace(/^json\s*/i, "");
          data = JSON.parse(cleaned);
        } catch (e) {
          console.error("Failed parsing nested response:", e);
        }
      }

      setResult(data);
    } catch (err: any) {
      console.error(err);
      setResult({ error: err.message || "Request failed" });
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <style jsx>{`
        ${globalStyles}
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>GenAI Dashboard</h1>
            <p style={styles.subtitle}>Intelligent Code Analysis & Management</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Navigation Tabs */}
        <nav style={styles.nav}>
          <div style={styles.tabContainer}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  ...styles.tabButton,
                  ...(tab === t.id ? styles.tabButtonActive : styles.tabButtonInactive),
                }}
              >
                <span style={styles.tabIcon}>{t.icon}</span>
                <span style={styles.tabLabel}>{t.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content Area */}
        <div style={styles.contentWrapper}>
          {/* Upload Tab */}
          {tab === "upload" && (
            <div style={styles.content}>
              <h2 style={styles.sectionTitle}>📤 Upload Content</h2>
              <p style={styles.sectionDescription}>Choose how you'd like to provide your code</p>

              <div style={styles.cardsGrid}>
                {/* Upload File Card */}
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>📁 Upload File</h3>
                  </div>
                  <div style={styles.cardContent}>
                    <p style={styles.cardDescription}>Upload a code file from your computer</p>
                    <div
                      style={styles.fileDropZone}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.background = "#e3f2fd";
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.style.background = "#f5f5f5";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.background = "#f5f5f5";
                        const droppedFile = e.dataTransfer.files?.[0];
                        if (droppedFile) setFile(droppedFile);
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        style={styles.hiddenInput}
                      />
                      <div style={styles.fileInputContent}>
                        <span style={styles.fileInputIcon}>📂</span>
                        {file ? (
                          <p style={styles.fileName}>{file.name}</p>
                        ) : (
                          <>
                            <p style={styles.fileInputText}>Drag & drop your file here</p>
                            <p style={styles.fileInputHint}>or click to browse</p>
                          </>
                        )}
                      </div>
                      <button
                        style={styles.browseButton}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Browse Files
                      </button>
                    </div>
                    <button
                      onClick={() =>
                        file && handleRequest(() => UploadAPI.uploadFile(file), "/api/upload/files")
                      }
                      disabled={loading || !file}
                      style={{
                        ...styles.primaryButton,
                        ...(loading || !file ? styles.primaryButtonDisabled : {}),
                      }}
                    >
                      {loading ? "Uploading..." : "Upload File"}
                    </button>
                  </div>
                </div>

                {/* Upload Code Card */}
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>💻 Upload Code</h3>
                  </div>
                  <div style={styles.cardContent}>
                    <p style={styles.cardDescription}>Paste your code directly</p>
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Paste your code here..."
                      style={styles.textarea}
                    />
                    <button
                      onClick={() =>
                        handleRequest(() => UploadAPI.uploadCode(code), "/api/upload/code")
                      }
                      disabled={loading || !code}
                      style={{
                        ...styles.primaryButton,
                        ...(loading || !code ? styles.primaryButtonDisabled : {}),
                      }}
                    >
                      {loading ? "Uploading..." : "Upload Code"}
                    </button>
                  </div>
                </div>

                {/* Upload Repo URL Card */}
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>🔗 Upload Repository</h3>
                  </div>
                  <div style={styles.cardContent}>
                    <p style={styles.cardDescription}>Provide a GitHub repository URL</p>
                    <input
                      type="text"
                      placeholder="https://github.com/user/repo"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      style={styles.input}
                    />
                    <button
                      onClick={() =>
                        handleRequest(() => UploadAPI.uploadUrl(repoUrl), "/api/upload/url")
                      }
                      disabled={loading || !repoUrl}
                      style={{
                        ...styles.primaryButton,
                        ...(loading || !repoUrl ? styles.primaryButtonDisabled : {}),
                      }}
                    >
                      {loading ? "Processing..." : "Upload Repository"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analyze Tab */}
          {tab === "analyze" && (
            <div style={styles.content}>
              <h2 style={styles.sectionTitle}>🔍 Code Analysis</h2>
              <p style={styles.sectionDescription}>Analyze your code for insights and recommendations</p>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Analyze Code</h3>
                </div>
                <div style={styles.cardContent}>
                  <p style={styles.cardDescription}>Paste your code to run analysis</p>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste your code here..."
                    style={styles.textarea}
                  />
                  <button
                    onClick={() =>
                      handleRequest(() => AnalyzeAPI.analyzeCode(code), "/analyze")
                    }
                    disabled={loading || !code}
                    style={{
                      ...styles.primaryButton,
                      ...(loading || !code ? styles.primaryButtonDisabled : {}),
                    }}
                  >
                    {loading ? "Analyzing..." : "Run Analysis"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Agents Tab */}
          {tab === "agents" && (
            <div style={styles.content}>
              <h2 style={styles.sectionTitle}>🤖 Multi-Agent Pipeline</h2>
              <p style={styles.sectionDescription}>Run the intelligent multi-agent pipeline on your repository</p>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Pipeline Configuration</h3>
                </div>
                <div style={styles.cardContent}>
                  <p style={styles.cardDescription}>Enter your GitHub repository URL</p>
                  <input
                    type="text"
                    placeholder="https://github.com/user/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    style={styles.input}
                  />
                  <button
                    onClick={() =>
                      handleRequest(() => AgentsAPI.runPipeline(repoUrl), "/agents/run")
                    }
                    disabled={loading || !repoUrl}
                    style={{
                      ...styles.primaryButton,
                      ...(loading || !repoUrl ? styles.primaryButtonDisabled : {}),
                    }}
                  >
                    {loading ? "Running Pipeline..." : "Run Multi-Agent Pipeline"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Monitor Tab */}
          {tab === "monitor" && (
            <div style={styles.content}>
              <h2 style={styles.sectionTitle}>📊 System Monitoring</h2>
              <p style={styles.sectionDescription}>View real-time system monitoring data</p>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Monitoring Data</h3>
                </div>
                <div style={styles.cardContent}>
                  <p style={styles.cardDescription}>Fetch current system monitoring metrics</p>
                  <button
                    onClick={() =>
                      handleRequest(() => MonitorAPI.getMonitoringData(), "/monitor")
                    }
                    disabled={loading}
                    style={{
                      ...styles.primaryButton,
                      ...(loading ? styles.primaryButtonDisabled : {}),
                    }}
                  >
                    {loading ? "Fetching..." : "Get Monitoring Data"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {tab === "tasks" && (
            <div style={styles.content}>
              <h2 style={styles.sectionTitle}>✓ Task Status</h2>
              <p style={styles.sectionDescription}>View all active and completed tasks</p>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Task List</h3>
                </div>
                <div style={styles.cardContent}>
                  <p style={styles.cardDescription}>Retrieve all task statuses</p>
                  <button
                    onClick={() =>
                      handleRequest(() => TaskAPI.getTasks(), "/tasks")
                    }
                    disabled={loading}
                    style={{
                      ...styles.primaryButton,
                      ...(loading ? styles.primaryButtonDisabled : {}),
                    }}
                  >
                    {loading ? "Loading..." : "Get Tasks"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Processing your request...</p>
              <p style={styles.loadingEndpoint}>{activeEndpoint}</p>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div style={styles.resultContainer}>
              <div style={styles.resultHeader}>
                <h3 style={styles.resultTitle}>Analysis Results</h3>
                <button
                  onClick={() => setResult(null)}
                  style={styles.closeButton}
                  title="Clear results"
                >
                  ✕
                </button>
              </div>
              <div style={styles.resultContent}>
                <ResponseCard data={result} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#333",
  } as React.CSSProperties,
  header: {
    background: "rgba(255, 255, 255, 0.95)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
  } as React.CSSProperties,
  headerContent: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "30px 20px",
  } as React.CSSProperties,
  title: {
    fontSize: "32px",
    fontWeight: "700",
    margin: "0 0 8px 0",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  } as React.CSSProperties,
  subtitle: {
    fontSize: "16px",
    color: "#666",
    margin: 0,
    fontWeight: "500",
  } as React.CSSProperties,
  main: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "40px 20px",
  } as React.CSSProperties,
  nav: {
    marginBottom: "40px",
  } as React.CSSProperties,
  tabContainer: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    background: "rgba(255, 255, 255, 0.95)",
    padding: "16px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  } as React.CSSProperties,
  tabButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.3s ease",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  tabButtonActive: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
  } as React.CSSProperties,
  tabButtonInactive: {
    background: "#f0f0f0",
    color: "#333",
  } as React.CSSProperties,
  tabIcon: {
    fontSize: "16px",
  } as React.CSSProperties,
  tabLabel: {
    fontSize: "14px",
  } as React.CSSProperties,
  contentWrapper: {
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
  } as React.CSSProperties,
  content: {
    padding: "40px",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: "28px",
    fontWeight: "700",
    margin: "0 0 12px 0",
    color: "#333",
  } as React.CSSProperties,
  sectionDescription: {
    fontSize: "16px",
    color: "#666",
    margin: "0 0 30px 0",
  } as React.CSSProperties,
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
    gap: "24px",
  } as React.CSSProperties,
  card: {
    background: "#f8f9fa",
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    overflow: "hidden",
    transition: "all 0.3s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
  } as React.CSSProperties,
  cardHeader: {
    padding: "20px",
    borderBottom: "1px solid #e0e0e0",
    background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
  } as React.CSSProperties,
  cardTitle: {
    fontSize: "18px",
    fontWeight: "700",
    margin: 0,
    color: "#333",
  } as React.CSSProperties,
  cardContent: {
    padding: "24px",
  } as React.CSSProperties,
  cardDescription: {
    fontSize: "14px",
    color: "#666",
    margin: "0 0 16px 0",
  } as React.CSSProperties,
  textarea: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontFamily: "monospace",
    fontSize: "13px",
    fontColor: "#333",
    marginBottom: "16px",
    minHeight: "120px",
    resize: "vertical",
    boxSizing: "border-box",
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    marginBottom: "16px",
    boxSizing: "border-box",
  } as React.CSSProperties,
  fileDropZone: {
    border: "2px dashed #ddd",
    borderRadius: "8px",
    padding: "32px 20px",
    textAlign: "center",
    background: "#f5f5f5",
    cursor: "pointer",
    transition: "all 0.3s ease",
    marginBottom: "16px",
  } as React.CSSProperties,
  fileInputContent: {
    marginBottom: "16px",
  } as React.CSSProperties,
  fileInputIcon: {
    fontSize: "32px",
    display: "block",
    marginBottom: "8px",
  } as React.CSSProperties,
  fileInputText: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
    margin: "0 0 4px 0",
  } as React.CSSProperties,
  fileInputHint: {
    fontSize: "12px",
    color: "#999",
    margin: 0,
  } as React.CSSProperties,
  fileName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#667eea",
    margin: 0,
    wordBreak: "break-all",
  } as React.CSSProperties,
  hiddenInput: {
    display: "none",
  } as React.CSSProperties,
  browseButton: {
    padding: "8px 16px",
    background: "#667eea",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    transition: "all 0.3s ease",
  } as React.CSSProperties,
  primaryButton: {
    width: "100%",
    padding: "12px 24px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
  } as React.CSSProperties,
  primaryButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    boxShadow: "none",
  } as React.CSSProperties,
  loadingContainer: {
    textAlign: "center",
    padding: "60px 40px",
  } as React.CSSProperties,
  loadingText: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
    margin: "24px 0 8px 0",
  } as React.CSSProperties,
  loadingEndpoint: {
    fontSize: "13px",
    color: "#999",
    margin: 0,
    fontFamily: "monospace",
  } as React.CSSProperties,
  spinner: {
    border: "4px solid #f0f0f0",
    borderTop: "4px solid #667eea",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    animation: "spin 1s linear infinite",
    margin: "0 auto",
  } as React.CSSProperties,
  resultContainer: {
    marginTop: "32px",
    background: "#f8f9fa",
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
  } as React.CSSProperties,
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
    borderBottom: "1px solid #e0e0e0",
  } as React.CSSProperties,
  resultTitle: {
    fontSize: "16px",
    fontWeight: "700",
    margin: 0,
    color: "#333",
  } as React.CSSProperties,
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#999",
    transition: "color 0.3s ease",
    padding: "0",
  } as React.CSSProperties,
  resultMeta: {
    fontSize: "12px",
    color: "#999",
    margin: 0,
    fontFamily: "monospace",
  } as React.CSSProperties,
  resultContent: {
    padding: "24px",
    background: "#f8f9fa",
  } as React.CSSProperties,
  responseBody: {
    color: "#333",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  } as React.CSSProperties,
  sectionHeading: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#333",
    marginTop: 0,
    marginBottom: "16px",
    paddingBottom: "8px",
    borderBottom: "2px solid #667eea",
  } as React.CSSProperties,
  summarySection: {
    marginBottom: "28px",
    paddingBottom: "20px",
    borderBottom: "1px solid #e0e0e0",
  } as React.CSSProperties,
  summaryParagraph: {
    fontSize: "15px",
    lineHeight: "1.7",
    color: "#555",
    margin: 0,
  } as React.CSSProperties,
  infoSection: {
    marginBottom: "20px",
    padding: "12px 16px",
    background: "#e3f2fd",
    borderRadius: "8px",
    borderLeft: "4px solid #667eea",
  } as React.CSSProperties,
  infoText: {
    fontSize: "14px",
    color: "#333",
    margin: 0,
  } as React.CSSProperties,
  issuesSection: {
    marginBottom: "28px",
  } as React.CSSProperties,
  issueLine: {
    display: "flex",
    gap: "16px",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "1px solid #e0e0e0",
  } as React.CSSProperties,
  issueNumber: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#667eea",
    minWidth: "24px",
    paddingTop: "2px",
  } as React.CSSProperties,
  issueHeading: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#d32f2f",
    margin: "0 0 8px 0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  } as React.CSSProperties,
  severityLabel: {
    padding: "2px 8px",
    borderRadius: "4px",
    color: "white",
    fontSize: "11px",
    fontWeight: "700",
  } as React.CSSProperties,
  issueText: {
    fontSize: "14px",
    color: "#666",
    margin: "0 0 8px 0",
    lineHeight: "1.6",
  } as React.CSSProperties,
  lineNum: {
    fontSize: "12px",
    color: "#999",
    margin: 0,
    fontFamily: "monospace",
  } as React.CSSProperties,
  recommendationsSection: {
    marginBottom: "28px",
  } as React.CSSProperties,
  recList: {
    margin: 0,
    paddingLeft: "24px",
  } as React.CSSProperties,
  recItem: {
    fontSize: "14px",
    color: "#555",
    lineHeight: "1.6",
    marginBottom: "10px",
  } as React.CSSProperties,
  scoreSection: {
    marginBottom: "28px",
    padding: "20px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "8px",
    color: "white",
    textAlign: "center",
  } as React.CSSProperties,
  scoreBig: {
    fontSize: "48px",
    fontWeight: "700",
    margin: 0,
  } as React.CSSProperties,
  securitySection: {
    marginBottom: "28px",
  } as React.CSSProperties,
  vulnCount: {
    fontSize: "14px",
    color: "#d32f2f",
    fontWeight: "600",
    marginBottom: "12px",
  } as React.CSSProperties,
  vulnItem: {
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e0e0e0",
  } as React.CSSProperties,
  vulnHeader: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    marginBottom: "8px",
  } as React.CSSProperties,
  vulnSev: {
    padding: "4px 10px",
    background: "#d32f2f",
    color: "white",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "700",
  } as React.CSSProperties,
  vulnTit: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#333",
  } as React.CSSProperties,
  vulnDesc: {
    fontSize: "13px",
    color: "#666",
    margin: "8px 0 0 0",
    lineHeight: "1.5",
  } as React.CSSProperties,
  passText: {
    fontSize: "14px",
    color: "#4CAF50",
    fontWeight: "600",
    margin: 0,
  } as React.CSSProperties,
  statusSection: {
    marginBottom: "28px",
    paddingBottom: "20px",
    borderBottom: "1px solid #e0e0e0",
  } as React.CSSProperties,
  statusText: {
    fontSize: "14px",
    color: "#555",
    margin: 0,
  } as React.CSSProperties,
  statusLine: {
    fontSize: "14px",
    color: "#555",
    margin: "8px 0",
  } as React.CSSProperties,
  analysisSection: {
    marginBottom: "28px",
  } as React.CSSProperties,
  analysisText: {
    fontSize: "14px",
    color: "#555",
    margin: "8px 0",
    lineHeight: "1.6",
  } as React.CSSProperties,
  tasksSection: {
    marginBottom: "28px",
  } as React.CSSProperties,
  taskList: {
    display: "grid",
    gap: "10px",
  } as React.CSSProperties,
  taskItem: {
    padding: "12px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    background: "#fff",
  } as React.CSSProperties,
  taskTitle: {
    fontSize: "14px",
    color: "#333",
    margin: "0 0 8px 0",
    fontWeight: "700",
  } as React.CSSProperties,
  taskMeta: {
    fontSize: "12px",
    color: "#555",
    margin: "0 0 6px 0",
  } as React.CSSProperties,
  taskPlan: {
    fontSize: "13px",
    color: "#444",
    margin: "0",
  } as React.CSSProperties,
  errorCard: {
    background: "#ffebee",
    border: "1px solid #f44336",
    borderRadius: "8px",
    padding: "16px",
    marginTop: "20px",
  } as React.CSSProperties,
  errorCardContent: {
    margin: 0,
  } as React.CSSProperties,
  errorTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#c41c3b",
    margin: "0 0 8px 0",
  } as React.CSSProperties,
  errorMessage: {
    fontSize: "13px",
    color: "#d32f2f",
    margin: 0,
  } as React.CSSProperties,
  jsonFallback: {
    background: "#1e1e1e",
    color: "#d4d4d4",
    borderRadius: "8px",
    padding: "16px",
    overflow: "auto",
    maxHeight: "500px",
  } as React.CSSProperties,
};

const globalStyles = `
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  * {
    box-sizing: border-box;
  }

  textarea {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
  }

  input[type="text"]:focus,
  textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5) !important;
  }

  button:active:not(:disabled) {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    [style*="maxWidth: 1400px"] {
      padding: 20px 12px !important;
    }
  }
`;