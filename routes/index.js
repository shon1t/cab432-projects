const express = require("express");
const JWT = require("../jwt.js");
const path = require("path");
const router = express.Router();

// Main page is protected by authentication middleware
router.get("/", JWT.authenticaticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Admin page only accessible for users with admin role
router.get("/about", JWT.authenticateToken, (req, res) => {
    if (req.user.username !== "admin") return res.sendStatus(403);
    res.sendFile(path.join(__dirname, "../public/admin.html"));
});

module.exports = router;