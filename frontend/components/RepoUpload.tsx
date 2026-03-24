"use client";

import React, { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import { uploadRepo } from "../api/api";

interface RepoUploadProps {
    onUploaded: (repoId: string) => void;
}

const RepoUpload: React.FC<RepoUploadProps> = ({ onUploaded }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        if (!file) return alert("Select a repo zip file first!");
        setLoading(true);

        try {
            const data = await uploadRepo(file);
            onUploaded(data.repoId);
        } catch (err) {
            console.error(err);
            alert("Upload failed!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <input
                type="file"
                accept=".zip"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <Button variant="contained" onClick={handleUpload} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : "Upload Repo"}
            </Button>
        </div>
    );
};

export default RepoUpload;