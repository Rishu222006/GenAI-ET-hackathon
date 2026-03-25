import axios from "axios";

const API_BASE = "http://localhost:5000/analyze";

export const uploadRepo = async (file: File) => {
    const formData = new FormData();
    formData.append("repo", file);

    const response = await axios.post(`${API_BASE}/upload-repo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
};

export const uploadCode = (code: string) => {
    return fetch("/api/upload/code", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
    }).then(res => res.json());
};

export const uploadRepoUrl = (url: string) => {
    return fetch("/api/upload/url", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
    }).then(res => res.json());
};

export const getAnalysis = async (repoId: string) => {
    const response = await axios.get(`${API_BASE}/analysis/${repoId}`);
    return response.data;
};