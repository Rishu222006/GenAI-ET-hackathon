const rules = [
    {
        id: "NO_CONSOLE",
        severity: "LOW",
        check: (code) => code.includes("console.log"),
        message: "Avoid console.log in production",
        fix: "Remove console.log or use a logger",
    },
    {
        id: "NO_VAR",
        severity: "MEDIUM",
        check: (code) => code.includes("var "),
        message: "Use let/const instead of var",
        fix: "Replace var with let or const",
    }
];

module.exports = (code) => {
    let issues = [];

    rules.forEach(rule => {
        if (rule.check(code)) {
            issues.push({
                type: "QUALITY",
                severity: rule.severity,
                message: rule.message,
                fix: rule.fix,
                ruleId: rule.id
            });
        }
    });

    return issues;
};