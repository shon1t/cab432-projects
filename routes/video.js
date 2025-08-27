const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const JWT = require("../jwt.js");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload", JWT.authenticateToken, upload.single("video"), (req, res) => {
    res.json( { message: "Video uploaded successfully", file: req.file });
});

router.post("/transcode", JWT.authenticateToken, (req, res) => {
    const inputPath = "uploads/" + req.body.filename;
    const format = req.body.format || "mp4"; //default to mp4
    const outputPath = "outputs/" + `transcoded_vedeo.${format}`;

    ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec("libx264")
        .size("1280x720")
        .on("end", () => {
            res.json({ message: "Video transcoded successfully", output: outputPath });
        })
        .on("error", (err) => {
            console.error("Error during transcoding:", err);
            res.status(500).json({ error: "Transcoding failed" });
        })
        .run();

})

module.exports = router;