require("dotenv").config();
const express = require("express");
const cors = require("cors");

const analyzeRoute = require("./routes/analyze.route");
const uploadRoute = require("./routes/upload.route");
const app = express();
app.use(cors());
app.use(express.json());

app.use("/analyze", analyzeRoute);
app.use("/api/upload", uploadRoute);
app.use("/tasks", require("./routes/task.route"));
app.use("/agents", require("./routes/agent.route"));
app.use("/monitor", require("./routes/monitor.route"));
app.use("/audit", require("./routes/audit.route"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});