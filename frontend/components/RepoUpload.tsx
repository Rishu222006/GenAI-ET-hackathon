"use client";

import React, { useState } from "react";

export default function TestUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [code, setCode] = useState("");
    const [url, setUrl] = useState("");

    // ZIP upload
    const handleZipUpload = async () => {
        if (!file) return alert("Select file");

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("http://localhost:5000/api/upload/zip", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        console.log(data);
        alert("ZIP uploaded: " + data.repoId);
    };

    // Code upload
    const handleCodeUpload = async () => {
        const res = await fetch("http://localhost:5000/api/upload/code", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ code }),
        });

        const data = await res.json();
        console.log(data);
        alert("Code uploaded: " + data.repoId);
    };

    // URL upload
    const handleUrlUpload = async () => {
        const res = await fetch("http://localhost:5000/api/upload/url", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url }),
        });

        const data = await res.json();
        console.log(data);
        alert("URL uploaded: " + data.repoId);
    };

    return (
        <div style={{ padding: 20 }}>
            <h2>Test Backend APIs</h2>

            {/* ZIP */}
            <div style={{ marginBottom: 20 }}>
                <h3>Upload ZIP</h3>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <br />
                <button onClick={handleZipUpload}>Upload ZIP</button>
            </div>

            {/* CODE */}
            <div style={{ marginBottom: 20 }}>
                <h3>Paste Code</h3>
                <textarea
                    rows={6}
                    cols={50}
                    placeholder="Paste code here"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                />
                <br />
                <button onClick={handleCodeUpload}>Upload Code</button>
            </div>

            {/* URL */}
            <div style={{ marginBottom: 20 }}>
                <h3>Repo URL</h3>
                <input
                    type="text"
                    placeholder="https://github.com/user/repo"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
                <br />
                <button onClick={handleUrlUpload}>Upload URL</button>
            </div>
        </div>
    );
}