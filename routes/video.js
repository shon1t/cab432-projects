const express = require("express");
const multer = require("multer");
const JWT = require("../jwt.js");

const path = require("path");
const fs = require("fs");
const { uploadToS3, getDownloadUrl, downloadFromS3, getBucketName } = require("../utils/s3.js");
const { saveVideoMetadata, updateVideoMetadata, getUserVideos, getDbClient } = require("../utils/db.js");
const { sendTranscodeJob } = require("../utils/queue.js");

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

        const owner = req.user.username; // get user from JWT middleware
        // save metadata to DynamoDB
        let videoId;
        try {
            videoId = await saveVideoMetadata({ 
                s3Key, 
                owner // get user from JWT middleware 
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

// Transcode endpoint - Queue job for worker processing
router.post("/transcode", JWT.authenticateToken, async (req, res) => {
    const inputKey = req.body.s3Key;
    const format = req.body.format || "mp4";
    const videoId = req.body.videoId;
    const owner = req.user.username;

    console.log("Transcode request body:", req.body);

    try {
        // Validate inputs
        if (!inputKey || !videoId) {
            return res.status(400).json({ error: "Missing required fields: s3Key or videoId" });
        }

        // Update video status to "processing"
        await updateVideoMetadata(owner, videoId, {
            status: "processing"
        });

        // Send job to SQS queue for worker to process
        await sendTranscodeJob({
            videoId: videoId,
            s3InputKey: inputKey,
            owner: owner,
            format: format
        });

        console.log(`Transcoding job queued for video ${videoId}`);

        res.json({ 
            message: "Video queued for transcoding", 
            videoId: videoId,
            status: "processing"
        });

    } catch (err) {
        console.error("Error queueing transcoding job:", err);
        res.status(500).json({ error: "Could not queue video for transcoding" });
    }
});

// Get all videos for logged-in user
router.get("/videos", JWT.authenticateToken, async (req, res) => {
    try {
        const videos = await getUserVideos(req.user.username);
        console.log("Videos fetched:", videos); // debug
        res.json({ videos });
    } catch (err) {
        console.error("Error fetching videos:", err);
        res.status(500).json({ error: "Could not fetch videos" });
    }
});

// Generate pre-signed URL for video download
router.get("/download/:videoId", JWT.authenticateToken, async (req, res) => {
    try {
        const videos = await getUserVideos(req.user.username);
        const video = videos.find(v => v.videoId === req.params.videoId);
        
        if (!video || !video.s3OutputKey) {
            return res.status(404).json({ error: "Video not found or not ready for download" });
        }
        
        const downloadUrl = await getDownloadUrl(video.s3OutputKey);
        res.json({ downloadUrl });
    } catch (err) {
        console.error("Error generating download URL:", err);
        res.status(500).json({ error: "Could not generate download URL" });
    }
});

// Admin-only: Get all videos from all users
router.get("/admin/all-videos", JWT.authenticateToken, async (req, res) => {
    // Check if user is admin
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
    }

    try {
        // For now, we'll scan the entire table (in production, you'd want pagination)
        const { client, config } = await getDbClient();
        const { ScanCommand } = require("@aws-sdk/client-dynamodb");
        
        const command = new ScanCommand({
            TableName: config.DYNAMODB_TABLE
        });
        
        const result = await client.send(command);
        console.log("DynamoDB scan result:", result.Items);
        
        const videos = result.Items?.map(item => ({
            videoId: item.videoId.S,
            owner: item.owner.S,
            s3InputKey: item.s3Key.S,
            s3OutputKey: item.s3OutputKey?.S,
            videoFormat: item.videoFormat?.S,
            status: item.status.S,
            createdAt: item.createdAt.S
        })) || [];
        
        res.json({ videos });
    } catch (err) {
        console.error("Error fetching all videos:", err);
        res.status(500).json({ error: "Could not fetch all videos" });
    }
});

// Admin-only: Delete any video
router.delete("/admin/video/:videoId", JWT.authenticateToken, async (req, res) => {
    // Check if user is admin
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
    }

    try {
        const { videoId } = req.params;
        
        // Get video details first to find the owner and S3 keys
        const { client, config } = await getDbClient();
        const { QueryCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
        
        // Find the video by scanning (in production, you'd want a GSI)
        const scanCommand = new (require("@aws-sdk/client-dynamodb").ScanCommand)({
            TableName: config.DYNAMODB_TABLE,
            FilterExpression: "videoId = :vid",
            ExpressionAttributeValues: {
                ":vid": { S: videoId }
            }
        });
        
        const scanResult = await client.send(scanCommand);
        const video = scanResult.Items?.[0];
        
        if (!video) {
            return res.status(404).json({ error: "Video not found" });
        }
        
        // Delete from DynamoDB
        const deleteCommand = new DeleteItemCommand({
            TableName: config.DYNAMODB_TABLE,
            Key: {
                owner: { S: video.owner.S },
                videoId: { S: videoId }
            }
        });
        
        await client.send(deleteCommand);
        
        // TODO: Also delete from S3 if needed
        // This would require deleting both input and output files
        
        console.log(`Admin ${req.user.username} deleted video ${videoId} owned by ${video.owner.S}`);
        res.json({ 
            message: `Video ${videoId} successfully deleted`,
            deletedVideo: {
                videoId: videoId,
                owner: video.owner.S
            }
        });
        
    } catch (err) {
        console.error("Error deleting video:", err);
        res.status(500).json({ error: "Could not delete video" });
    }
});

// User: Delete own video only
router.delete("/video/:videoId", JWT.authenticateToken, async (req, res) => {
    try {
        const { videoId } = req.params;
        
        // Users can only delete their own videos
        const videos = await getUserVideos(req.user.username);
        const video = videos.find(v => v.videoId === videoId);
        
        if (!video) {
            return res.status(404).json({ error: "Video not found or access denied" });
        }
        
        const { client, config } = await getDbClient();
        const { DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
        
        const deleteCommand = new DeleteItemCommand({
            TableName: config.DYNAMODB_TABLE,
            Key: {
                owner: { S: req.user.username },
                videoId: { S: videoId }
            }
        });
        
        await client.send(deleteCommand);
        
        console.log(`User ${req.user.username} deleted their video ${videoId}`);
        res.json({ 
            message: `Video ${videoId} successfully deleted`
        });
        
    } catch (err) {
        console.error("Error deleting video:", err);
        res.status(500).json({ error: "Could not delete video" });
    }
});

module.exports = router;