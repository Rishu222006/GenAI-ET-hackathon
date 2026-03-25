const { v4: uuidv4 } = require("uuid");

exports.uploadZip = async (req, res) => {
    try {
        const repoId = uuidv4();
        res.json({ repoId });
    } catch (err) {
        res.status(500).json({ error: "ZIP upload failed" });
    }
};

exports.uploadCode = async (req, res) => {
    try {
        const { code } = req.body;
        const repoId = uuidv4();
        res.json({ repoId });
    } catch (err) {
        res.status(500).json({ error: "Code upload failed" });
    }
};

exports.uploadRepoUrl = async (req, res) => {
    try {
        const { url } = req.body;
        const repoId = uuidv4();
        res.json({ repoId });
    } catch (err) {
        res.status(500).json({ error: "Repo URL failed" });
    }
};