const { getTasks } = require("../services/taskStore.service");
const { runHealthMonitor } = require("../services/monitor.service");

exports.monitorWorkflow = (req, res) => {
    try {
        const tasks = getTasks();

        const report = runHealthMonitor(tasks);

        res.json({
            success: true,
            summary: "System monitoring summary",
            overallStatus: {
                totalTasks: report.summary.total,
                stalledTasks: report.summary.stalled,
                highRiskTasks: report.summary.highRisk,
                slaRiskTasks: report.summary.slaRisk,
            },
            report,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Monitoring failed" });
    }
};