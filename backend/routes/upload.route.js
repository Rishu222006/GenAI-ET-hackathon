const express = require("express");
const router = express.Router();

const {
    uploadZip,
    uploadCode,
    uploadRepoUrl,
} = require("../controllers/update.controller");

const multer = require("multer");
const upload = multer({ dest: "uploads/" });

router.post("/zip", upload.single("file"), uploadZip);
router.post("/code", uploadCode);
router.post("/url", uploadRepoUrl);

module.exports = router;