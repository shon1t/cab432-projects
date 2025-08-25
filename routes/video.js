const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const JWT = require("../jwt.js");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload", JWT.authenticaticateToken, upload.single("video"), (req, res) => {
    res.json( { message: "Video uploaded successfully", file: req.file });
});

router.post("/transcode", JWT.authenticateToken, (req, res) => {
    const inputPath = "uploads/" + req.body.filename;
    const outputPath = "outputs/" + "output.mp4";

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