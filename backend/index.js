require("dotenv").config();
const express = require("express");
const cors = require("cors");

const analyzeRoute = require("./routes/analyze.route");
const auditRoute = require("./routes/audit.route");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/analyze", analyzeRoute);
app.use("/audit", auditRoute);

app.get("/", (req, res) => {
    res.send("De-Code Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})