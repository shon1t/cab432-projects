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
    const inputPath = "uploads/" + req.body.filename; //save uploaded video ni /uploads
    const format = req.body.format || "mp4"; //default to mp4
    const outputPath = "outputs/" + `transcoded.${format}`; //save transcoded video in /outputs

    const command = ffmpeg(inputPath).output(outputPath);

    // change codecs depending on format
    if (format === "webm") {
        command.videoCodec("libvpx-vp9").audioCodec("libopus");
    } else{
        command.videoCodec("libx264").audioCodec("aac");
    }
    
    command
        .size("1280x720") // resize and default to 720p
        .format(format)
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