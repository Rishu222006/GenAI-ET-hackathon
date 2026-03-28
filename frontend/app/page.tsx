"use client";

import { useState } from "react";
import {
  UploadAPI,
  AnalyzeAPI,
  AgentsAPI,
  TaskAPI,
  MonitorAPI,
  type Task,
  type MonitorReport
} from "@/lib/api";

export default function GenAIFrontend() {
  const [tab, setTab] = useState("upload");
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeEndpoint, setActiveEndpoint] = useState("");

  const handleRequest = async (
    apiCall: () => Promise<any>,
    endpoint: string
  ) => {
    setLoading(true);
    setResult(null);
    setActiveEndpoint(endpoint);

    try {
      const data = await apiCall();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setResult({ error: err.message || "Request failed" });
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>GenAI Dashboard 🚀</h1>

      {/* Tabs */}
      <div style={{ marginBottom: 20 }}>
        {["upload", "analyze", "agents", "monitor", "tasks"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            style={{
              marginRight: 10,
              background: tab === t ? "#3498db" : "#eee",
              color: tab === t ? "#fff" : "#000",
              padding: "6px 15px",
              border: "none",
              borderRadius: 5,
              cursor: "pointer",
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Upload */}
      {tab === "upload" && (
        <div>
          <h2>Upload File</h2>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button
            onClick={() =>
              file && handleRequest(() => UploadAPI.uploadFile(file), "/api/upload/files")
            }
            disabled={loading || !file}
          >
            Upload File
          </button>

          <h2>Upload Code</h2>
          <textarea
            rows={5}
            cols={40}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <br />
          <button
            onClick={() =>
              handleRequest(() => UploadAPI.uploadCode(code), "/api/upload/code")
            }
            disabled={loading || !code}
          >
            Upload Code
          </button>

          <h2>Upload Repo URL</h2>
          <input
            type="text"
            placeholder="https://github.com/user/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          <button
            onClick={() =>
              handleRequest(() => UploadAPI.uploadUrl(repoUrl), "/api/upload/url")
            }
            disabled={loading || !repoUrl}
          >
            Upload Repo URL
          </button>
        </div>
      )}
      {/* Analyze */}
      {tab === "analyze" && (
        <div>
          <h2>Analyze Code</h2>
          <textarea
            rows={5}
            cols={40}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here..."
          />
          <br />
          <button
            onClick={() =>
              handleRequest(() => AnalyzeAPI.analyzeCode(code), "/analyze")
            }
            disabled={loading || !code}
          >
            Run Analysis
          </button>
        </div>
      )}

      {/* Agents */}
      {tab === "agents" && (
        <div>
          <h2>Run Multi-Agent Pipeline</h2>
          <input
            type="text"
            placeholder="https://github.com/user/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 10 }}
          />
          <button
            onClick={() =>
              handleRequest(() => AgentsAPI.runPipeline(repoUrl), "/agents/run")
            }
            disabled={loading || !repoUrl}
          >
            Run Multi-Agent Pipeline
          </button>
        </div>
      )}

      {/* Monitor */}
      {tab === "monitor" && (
        <div>
          <h2>System Monitoring</h2>
          <button
            onClick={() =>
              handleRequest(() => MonitorAPI.getMonitoringData(), "/monitor")
            }
            disabled={loading}
          >
            Get Monitoring Data
          </button>
        </div>
      )}

      {/* Tasks */}
      {tab === "tasks" && (
        <div>
          <h2>Task Status</h2>
          <button
            onClick={() =>
              handleRequest(() => TaskAPI.getTasks(), "/tasks")
            }
            disabled={loading}
          >
            Get Tasks
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <div className="spinner" />
          <p>⏳ Calling {activeEndpoint}...</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <pre
          style={{
            background: "#111",
            color: "#0f0",
            padding: 15,
            marginTop: 20,
            maxHeight: 300,
            overflow: "auto",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      {/* Styles */}
      <style jsx>{`
        .spinner {
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: auto;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}