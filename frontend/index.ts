export interface AnalysisResultType {
    repoId: string;
    status: string;
    issues: {
        file: string;
        line: number;
        message: string;
        severity: "low" | "medium" | "high";
    }[];
}