const express = require("express");
const JWT = require("../jwt.js");
const path = require("path");
const router = express.Router();

// Main page where users log in from (publicly available)
router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Video page accessable to EVERYONE
router.get("/video", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/upload.html"));
});

// Admin page only accessible for users with admin role
router.get("/admin", JWT.authenticateToken, (req, res) => {
    console.log("Authorization header:", req.headers["authorization"]);
    if (req.user.username !== "admin") return res.sendStatus(403);
    res.sendFile(path.join(__dirname, "../public/admin.html"));
});

module.exports = router;