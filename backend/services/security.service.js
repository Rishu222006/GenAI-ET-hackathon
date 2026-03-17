module.exports = (code) => {
    let issues = [];

    if (code.includes("eval(")) {
        issues.push({
            type: "SECURITY",
            severity: "HIGH",
            message: "Use of eval is dangerous",
            fix: "Avoid eval; use safer alternatives"
        });
    }

    if (code.includes("API_KEY")) {
        issues.push({
            type: "SECURITY",
            severity: "HIGH",
            message: "Possible hardcoded secret detected",
            fix: "Avoid eval; use safer alternatives"
        });
    }

    return issues;
};