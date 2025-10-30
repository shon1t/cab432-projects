const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const { uploadToS3, downloadFromS3 } = require("../utils/s3.js");
const { updateVideoMetadata } = require("../utils/db.js");
const { receiveTranscodeJobs, deleteTranscodeJob } = require("../utils/queue.js");

/**
 * Process a single transcoding job
 * @param {Object} job - Job details from SQS message
 */
async function processTranscodeJob(job) {
  const { videoId, s3InputKey, owner, format = "mp4" } = job;
  
  const outputFile = `transcoded-${Date.now()}.${format}`;
  const inputPath = path.join("/tmp", `input-temp-${Date.now()}`);
  const outputPath = path.join("/tmp", outputFile);
  
  console.log(`Starting transcoding job for video ${videoId} (owner: ${owner})`);
  
  try {
    // Download input from S3 to /tmp
    console.log(`Downloading from S3: ${s3InputKey}`);
    await downloadFromS3(s3InputKey, inputPath);
    
    // Transcode the video
    await transcodeVideo(inputPath, outputPath, format);
    
    // Upload transcoded file to S3
    console.log(`Uploading transcoded file to S3`);
    const fileStream = fs.createReadStream(outputPath);
    const s3OutputKey = `output/${outputFile}`;
    await uploadToS3(s3OutputKey, fileStream);
    
    // Update metadata in DynamoDB
    console.log(`Updating metadata for video ${videoId}`);
    await updateVideoMetadata(owner, videoId, {
      s3OutputKey: s3OutputKey,
      format: format,
      status: "completed"
    });
    
    // Cleanup local files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    
    console.log(`Successfully completed transcoding job for video ${videoId}`);
    return { success: true, s3OutputKey };
    
  } catch (error) {
    console.error(`Error processing transcoding job for video ${videoId}:`, error);
    
    // Clean up files if they exist
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }
    
    // Update status to failed in DynamoDB
    try {
      await updateVideoMetadata(owner, videoId, {
        status: "failed"
      });
    } catch (dbError) {
      console.error("Error updating failed status in DynamoDB:", dbError);
    }
    
    throw error;
  }
}

/**
 * Transcode video using FFmpeg
 * @param {string} inputPath - Local path to input file
 * @param {string} outputPath - Local path for output file
 * @param {string} format - Output format (mp4, webm)
 */
function transcodeVideo(inputPath, outputPath, format) {
  return new Promise((resolve, reject) => {
    const ffmpegCommand = ffmpeg(inputPath).output(outputPath);
    
    if (format === "webm") {
      ffmpegCommand.videoCodec("libvpx-vp9").audioCodec("libopus");
    } else {
      ffmpegCommand.videoCodec("libx264").audioCodec("aac");
    }
    
    ffmpegCommand
      .size("1280x720")
      .format(format)
      .on("start", (commandLine) => {
        console.log("FFmpeg command:", commandLine);
      })
      .on("progress", (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      })
      .on("end", () => {
        console.log("FFmpeg transcoding completed");
        resolve();
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        reject(err);
      })
      .run();
  });
}

/**
 * Main worker loop - continuously polls SQS for jobs
 */
async function startWorker() {
  console.log("Transcoding worker started");
  console.log("Polling for transcoding jobs...");
  
  while (true) {
    try {
      // Receive messages from queue (long polling for 20 seconds)
      const messages = await receiveTranscodeJobs(1, 20);
      
      if (messages.length === 0) {
        console.log("No messages in queue, continuing to poll...");
        continue;
      }
      
      for (const message of messages) {
        try {
          // Parse job from message body
          const job = JSON.parse(message.Body);
          console.log("Received job:", job);
          
          // Process the transcoding job
          await processTranscodeJob(job);
          
          // Delete message from queue after successful processing
          await deleteTranscodeJob(message.ReceiptHandle);
          console.log("Job completed and removed from queue");
          
        } catch (error) {
          console.error("Error processing message:", error);
          // Message will become visible again after visibility timeout
          // You could implement retry logic or send to DLQ here
        }
      }
      
    } catch (error) {
      console.error("Error in worker loop:", error);
      // Wait a bit before retrying to avoid rapid error loops
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  startWorker().catch(error => {
    console.error("Fatal error in worker:", error);
    process.exit(1);
  });
}

module.exports = {
  processTranscodeJob,
  transcodeVideo,
  startWorker
};
