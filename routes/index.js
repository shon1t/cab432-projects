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

// Admin page only accessible for users with Admin group
router.get("/admin", JWT.authenticateToken, (req, res) => {
    // Check if user is in Admin group
    if (!req.user.isAdmin) {
        console.log(`Access denied for user ${req.user.username}. Groups: ${req.user.groups || 'none'}`);
        return res.sendStatus(403);
    }
    console.log(`Admin access granted for user ${req.user.username}`);
    res.sendFile(path.join(__dirname, "../public/admin.html"));
});

module.exports = router;