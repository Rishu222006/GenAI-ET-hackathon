const express = require("express");
const router = express.Router();

const { getLogs } = require("../services/audit.service");

router.get("/", (req, res) => {
    res.json(getLogs());
});

module.exports = router;