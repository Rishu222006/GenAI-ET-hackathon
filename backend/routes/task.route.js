const express = require("express");
const router = express.Router();

const { getTasks } = require("../services/taskStore.service");

router.get("/", (req, res) => {
    const tasks = getTasks();

    res.json({
        success: true,
        summary: "Task status retrieved",
        overallStatus: {
            totalTasks: tasks.length,
            pending: tasks.filter(t => t.status === "PENDING").length,
            inProgress: tasks.filter(t => t.status === "IN_PROGRESS").length,
            completed: tasks.filter(t => t.status === "COMPLETED").length,
            failed: tasks.filter(t => t.status === "FAILED").length,
        },
        tasks,
    });
});

module.exports = router;