"use client";

import React, { useEffect, useState } from "react";
import { CircularProgress, Card, CardContent, Typography } from "@mui/material";
import { getAnalysis } from "../api/api";
import { AnalysisResultType } from "../index";

interface AnalysisResultProps {
    repoId: string;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ repoId }) => {
    const [result, setResult] = useState<AnalysisResultType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalysis = async () => {
            setLoading(true);
            try {
                const data = await getAnalysis(repoId);
                setResult(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [repoId]);

    if (loading) return <CircularProgress />;
    if (!result) return <Typography>No analysis found.</Typography>;

    return (
        <Card sx={{ mt: 3 }}>
            <CardContent>
                <Typography variant="h6">Analysis Result</Typography>
                {result.issues.map((issue, idx) => (
                    <div key={idx} style={{ marginTop: 8 }}>
                        <strong>{issue.severity.toUpperCase()}</strong> - {issue.file} (line {issue.line}): {issue.message}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

export default AnalysisResult;