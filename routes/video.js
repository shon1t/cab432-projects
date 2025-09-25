const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const JWT = require("../jwt.js");

const path = require("path");
const fs = require("fs");
const { uploadToS3, getDownloadUrl, downloadFromS3, BUCKET } = require("../utils/s3.js");
const { saveVideoMetadata, updateVideoMetadata, getUserVideos } = require("../utils/db.js");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Upload to s3 endpoint, requires authentication
router.post("/upload", JWT.authenticateToken, upload.single("video"), async (req, res) => {
    //res.json( { message: "Video uploaded successfully", file: req.file });
    try {
        const fileStream = fs.createReadStream(req.file.path);
        const s3Key = `input/${req.file.originalname}`;
        await uploadToS3(s3Key, fileStream);

        // cleanup local temp file
        fs.unlinkSync(req.file.path);

        console.log("JWT user:", req.user); // check if req.user exists

        // save metadata to DynamoDB
        let videoId;
        try {
            videoId = await saveVideoMetadata({ 
                s3Key, 
                owner: req.user.username // get user from JWT middleware 
            });
        } catch (err) {
            console.error("Error saving metadata to DynamoDB:", err);
            return res.status(500).json({ error: "Failed to save video metadata" });
        }

        console.log("Updating DynamoDB:", { owner, videoId, s3Key }); // debug dynamodb

        res.json({ 
            message: "Upload to S3 successful", 
            s3Key: s3Key,
            videoId: videoId
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({error: "Upload to S3 failed" })
    }
});

// Transcode endpoint, requires authentication
router.post("/transcode", JWT.authenticateToken, async (req, res) => {
    const inputKey = req.body.s3Key;
    const format = req.body.format || "mp4";
    const outputFile = `transcoded-${Date.now()}.${format}`;
    const inputPath = path.join("/tmp", `input-temp-${Date.now()}`);
    const outputPath = path.join("/tmp", outputFile); // safe temp dir in EC2

    console.log("Transcode request body:", req.body);

    try {
        // Download input from S3 to /tmp
        await downloadFromS3(inputKey, inputPath);

        // Run FFmpeg
        const ffmpegCommand = ffmpeg(inputPath).output(outputPath);

        if (format === "webm") {
            ffmpegCommand.videoCodec("libvpx-vp9").audioCodec("libopus");
        } else {
            ffmpegCommand.videoCodec("libx264").audioCodec("aac");
        }

        ffmpegCommand
            .size("1280x720")
            .format(format)
            .on("end", async () => {
                // Upload transcoded file to S3
                const fileStream = fs.createReadStream(outputPath);
                const s3Key = `output/${outputFile}`;
                await uploadToS3(s3Key, fileStream);

                // Cleanup
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);


                // update metadata in dyanamo
                await updateVideoMetadata(req.body.videoId, {
                    s3OutputKey: s3Key,
                    format: format,
                    status: "done"
                })

                console.log("Updating DynamoDB:", { owner, videoId: req.body.videoId, format }); // debug dynamodb

                // Generate signed URL
                const url = await getDownloadUrl(s3Key);
                res.json({ message: "Video transcoded successfully", downloadUrl: url });
            })
            .on("error", (err) => {
                console.error("Error during transcoding:", err);
                res.status(500).json({ error: "Transcoding failed" });
            })
            .run();

    } catch (err) {
        console.error("Transcoding error:", err);
        res.status(500).json({ error: "Could not process video" });
    }
});

// Get all videos for logged-in user
router.get("/videos", JWT.authenticateToken, async (req, res) => {
    try {
        const videos = await getUserVideos(req.user.username);
        res.json({ videos });
    } catch (err) {
        console.error("Error fetching videos:", err);
        res.status(500).json({ error: "Could not fetch videos" });
    }
});

module.exports = router;