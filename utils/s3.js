const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { getAppConfig } = require("./parameters");
const fs = require("fs");

// Initialize S3 client and configuration
let s3 = null;
let s3Config = null;

// Get S3 configuration and client
async function getS3Client() {
  if (!s3 || !s3Config) {
    try {
      s3Config = await getAppConfig();
      s3 = new S3Client({ region: s3Config.AWS_REGION });
      console.log(`S3 client initialized with region: ${s3Config.AWS_REGION}`);
    } catch (error) {
      console.error("Failed to initialize S3 client:", error.message);
      // Fallback configuration
      s3Config = { 
        AWS_REGION: "ap-southeast-2", 
        S3_BUCKET: "a2-n11077417-bucket" 
      };
      s3 = new S3Client({ region: s3Config.AWS_REGION });
    }
  }
  return { client: s3, config: s3Config };
}

// upload a file stream to s3 and return the s3 url 
async function uploadToS3(key, fileStream) {
    const { client, config } = await getS3Client();
    const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
        Body: fileStream,
    });
    await client.send(command);
    return key;
}

// generate a download url
async function getDownloadUrl(key) {
    const { client, config } = await getS3Client();
    const command = new GetObjectCommand({ 
        Bucket: config.S3_BUCKET, 
        Key: key 
    });
    return await getSignedUrl(client, command, { expiresIn:3600 }); // url valid for 1hr
}

async function downloadFromS3(key, localPath) {
  const { client, config } = await getS3Client();
  const command = new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key });
  const data = await client.send(command);

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(localPath);
    data.Body.pipe(writeStream)
      .on("finish", resolve)
      .on("error", reject);
  });
}

// Export functions and a helper to get bucket name
async function getBucketName() {
  const { config } = await getS3Client();
  return config.S3_BUCKET;
}

module.exports = { uploadToS3, getDownloadUrl, downloadFromS3, getBucketName };
