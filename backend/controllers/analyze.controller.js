const { getRepoFiles } = require("../services/repo.service");
const { filterFiles } = require("../utils/fileFilter");
const runRules = require("../services/ruleEngine.service");
const runSecurityChecks = require("../services/security.service");
const geminiReview = require("../services/gemini.service");
const auditLog = require("../services/audit.service");

exports.analyzeRepo = async (req, res) => {
    try {
        const { repoUrl } = req.body;

        const files = await getRepoFiles(repoUrl);
        const validFiles = filterFiles(files);

        let results = [];

        for (const file of validFiles) {
            const { name, content } = file;

            const ruleIssues = runRules(content);
            const securityIssues = runSecurityChecks(content);
            const aiReview = await geminiReview(content);

            const allIssues = [...ruleIssues, ...securityIssues];

            const fileResult = {
                file: name,
                issues: [...ruleIssues, ...securityIssues],
                aiReview
            };

            auditLog(fileResult);
            results.push(fileResult);
        }

        const summary = {
            totalFiles: results.length,
            totalIssues: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        results.forEach(f => {
            f.issues.forEach(issue => {
                summary.totalIssues++;
                summary[issue.severity.toLowerCase()]++;
            });
        });


        res.json({ summary, files: results });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Analysis failed" });
    }
};