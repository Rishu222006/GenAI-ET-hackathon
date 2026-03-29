// API Service Layer for all backend integrations
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export interface Task {
    id: string;
    title: string;
    file?: string;
    type: string;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
    priority: "LOW" | "MEDIUM" | "HIGH";
    createdAt: string;
    progress: number;
}

export interface MonitorReport {
    success: boolean;
    report: {
        stalled: Task[];
        highRisk: Task[];
        slaRisk: Task[];
        summary: {
            total: number;
            stalled: number;
            highRisk: number;
            slaRisk: number;
        };
    };
}

export interface AuditLog {
    action: string;
    count?: number;
    timestamp: string;
}

export interface AnalysisResult {
    success: boolean;
    taskId?: string;
    error?: string;
    message?: string;
    tasks?: any[];
}

// Helper function for API calls
async function apiCall<T>(
    method: string,
    endpoint: string,
    body?: any
): Promise<T> {
    const options: RequestInit = {
        method,
        headers: { "Content-Type": "application/json" },
    };

    if (body && method !== "GET") {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(`${BACKEND_URL}${endpoint}`, options);

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || error.message || `Request failed: ${res.statusText}`);
    }

    return res.json();
}

// File upload helper
async function uploadFile(endpoint: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error.error || error.message || "Upload failed");
    }

    return res.json();
}

// ── Task APIs ──
export const TaskAPI = {
    getTasks: async (): Promise<{ success: boolean; summary?: string; overallStatus?: any; tasks?: Task[] }> => {
        return apiCall<{ success: boolean; summary?: string; overallStatus?: any; tasks?: Task[] }>("GET", "/tasks");
    },
};

// ── Monitor APIs ──
export const MonitorAPI = {
    getMonitoringData: async (): Promise<MonitorReport> => {
        return apiCall<MonitorReport>("GET", "/monitor");
    },
};

// ── Audit APIs ──
export const AuditAPI = {
    getLogs: async (): Promise<AuditLog[]> => {
        const data = await apiCall<{ logs?: AuditLog[] }>("GET", "/audit");
        return data.logs || [];
    },

    clearLogs: async (): Promise<void> => {
        await apiCall("DELETE", "/audit");
    },
};

// ── Upload APIs ──
export const UploadAPI = {
    uploadFile: async (file: File): Promise<AnalysisResult> => {
        return uploadFile("/api/upload/files", file);
    },

    uploadCode: async (code: string): Promise<AnalysisResult> => {
        return apiCall<AnalysisResult>("POST", "/api/upload/code", { code });
    },

    uploadUrl: async (url: string): Promise<{ success: boolean; repoId: string }> => {
        return apiCall("POST", "/api/upload/url", { url });
    },
};

// ── Analyze APIs ──
export const AnalyzeAPI = {
    analyzeCode: async (code: string): Promise<AnalysisResult> => {
        return apiCall<AnalysisResult>("POST", "/analyze", { code });
    },

    analyzeRepo: async (repoUrl: string): Promise<AnalysisResult> => {
        return apiCall<AnalysisResult>("POST", "/agents/run", { repoUrl });
    },
};

// ── Agents APIs ──
export const AgentsAPI = {
    runPipeline: async (repoUrl: string): Promise<AnalysisResult> => {
        return apiCall<AnalysisResult>("POST", "/agents/run", { repoUrl });
    },
};

export default {
    TaskAPI,
    MonitorAPI,
    AuditAPI,
    UploadAPI,
    AnalyzeAPI,
    AgentsAPI,
};
