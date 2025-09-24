const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
//const { get } = require("../routes");
const fs = require("fs");

const s3 = new S3Client({ region: "ap-southeast-2" });
const BUCKET = "a2-n11077417-bucket";

// upload a file stream to s3 and return the s3 url 
async function uploadToS3(key, fileStream) {
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: fileStream,
    });
    await s3.send(command);
    return key;
}

// generate a download url
async function getDownloadUrl(key) {
    const command = new GetObjectCommand({ 
        Bucket: BUCKET, 
        Key: key 
    });
    return await getSignedUrl(s3, command, { expiresIn:3600 }); // url valid for 1hr
}

async function downloadFromS3(key, localPath) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const data = await s3.send(command);

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(localPath);
    data.Body.pipe(writeStream)
      .on("finish", resolve)
      .on("error", reject);
  });
}

module.exports = { uploadToS3, getDownloadUrl, downloadFromS3, BUCKET };
