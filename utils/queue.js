const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const { getAppConfig } = require("./parameters");

// Initialize SQS client
let sqsClient = null;
let queueConfig = null;

// Get SQS client and configuration
async function getSQSClient() {
  if (!sqsClient || !queueConfig) {
    try {
      const config = await getAppConfig();
      sqsClient = new SQSClient({ region: config.AWS_REGION });
      queueConfig = {
        QUEUE_URL: process.env.QUEUE_URL || "https://sqs.ap-southeast-2.amazonaws.com/901444280953/a3-group111-transcode-queue"
      };
      console.log(`SQS client initialized with queue: ${queueConfig.QUEUE_URL}`);
    } catch (error) {
      console.error("Failed to initialize SQS client:", error.message);
      // Fallback configuration
      queueConfig = {
        QUEUE_URL: "https://sqs.ap-southeast-2.amazonaws.com/901444280953/a3-group111-transcode-queue"
      };
      sqsClient = new SQSClient({ region: "ap-southeast-2" });
    }
  }
  return { client: sqsClient, config: queueConfig };
}

/**
 * Send a transcoding job to the SQS queue
 * @param {Object} job - Job details
 * @param {string} job.videoId - Video ID
 * @param {string} job.s3InputKey - S3 key for input video
 * @param {string} job.owner - Username of video owner
 * @param {string} job.format - Output format (mp4, webm)
 */
async function sendTranscodeJob(job) {
  try {
    const { client, config } = await getSQSClient();
    
    const command = new SendMessageCommand({
      QueueUrl: config.QUEUE_URL,
      MessageBody: JSON.stringify(job),
      MessageAttributes: {
        "JobType": {
          DataType: "String",
          StringValue: "transcode"
        }
      }
    });
    
    const response = await client.send(command);
    console.log("Job sent to queue:", job.videoId, "MessageId:", response.MessageId);
    return response;
  } catch (error) {
    console.error("Error sending job to queue:", error);
    throw error;
  }
}

/**
 * Receive messages from the SQS queue
 * @param {number} maxMessages - Maximum number of messages to receive (1-10)
 * @param {number} waitTimeSeconds - Long polling wait time (0-20)
 */
async function receiveTranscodeJobs(maxMessages = 1, waitTimeSeconds = 20) {
  try {
    const { client, config } = await getSQSClient();
    
    const command = new ReceiveMessageCommand({
      QueueUrl: config.QUEUE_URL,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds,
      MessageAttributeNames: ["All"],
      VisibilityTimeout: 300 // 5 minutes to process the job
    });
    
    const response = await client.send(command);
    return response.Messages || [];
  } catch (error) {
    console.error("Error receiving messages from queue:", error);
    throw error;
  }
}

/**
 * Delete a message from the queue after successful processing
 * @param {string} receiptHandle - Receipt handle from received message
 */
async function deleteTranscodeJob(receiptHandle) {
  try {
    const { client, config } = await getSQSClient();
    
    const command = new DeleteMessageCommand({
      QueueUrl: config.QUEUE_URL,
      ReceiptHandle: receiptHandle
    });
    
    await client.send(command);
    console.log("Job deleted from queue");
  } catch (error) {
    console.error("Error deleting message from queue:", error);
    throw error;
  }
}

module.exports = {
  sendTranscodeJob,
  receiveTranscodeJobs,
  deleteTranscodeJob,
  getSQSClient
};
