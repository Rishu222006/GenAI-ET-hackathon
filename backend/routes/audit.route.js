const express = require("express");
const router = express.Router();

const { getLogs, clearLogs } = require("../services/audit.service");

// Get all audit logs
router.get("/", (req, res) => {
    try {
        const logs = getLogs();
        res.json({
            success: true,
            logs: logs
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to retrieve audit logs" });
    }
});

// Clear audit logs
router.delete("/", (req, res) => {
    try {
        clearLogs();
        res.json({
            success: true,
            message: "Audit logs cleared"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to clear audit logs" });
    }
});

module.exports = router;
