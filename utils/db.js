const { DynamoDBClient, PutItemCommand, UpdateItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { getAppConfig } = require("./parameters");

// Initialize database client and configuration
let db = null;
let dbConfig = null;

// Get database configuration and client
async function getDbClient() {
  if (!db || !dbConfig) {
    try {
      dbConfig = await getAppConfig();
      db = new DynamoDBClient({ region: dbConfig.AWS_REGION });
      console.log(`Database client initialized with region: ${dbConfig.AWS_REGION}`);
    } catch (error) {
      console.error("Failed to initialize database client:", error.message);
      // Fallback configuration
      dbConfig = { 
        AWS_REGION: "ap-southeast-2", 
        DYNAMODB_TABLE: "a2-n11077417-videodata" 
      };
      db = new DynamoDBClient({ region: dbConfig.AWS_REGION });
    }
  }
  return { client: db, config: dbConfig };
} 

// Save metadata for a new upload
async function saveVideoMetadata({ s3Key, owner }) {
    const { client, config } = await getDbClient();
    const videoId = uuidv4();
    const command = new PutItemCommand({
        TableName: config.DYNAMODB_TABLE,
        Item: {
            videoId: { S: videoId },
            s3Key: { S: s3Key },
            status: { S: "uploaded" },
            owner: { S: owner },
            createdAt: { S: new Date().toISOString() }
        }
    });
    await client.send(command);
    return videoId;
}

// Update metadata after transcoding
async function updateVideoMetadata(owner, videoId, { s3OutputKey, format, status }) {
    const { client, config } = await getDbClient();
    const command = new UpdateItemCommand({
        TableName: config.DYNAMODB_TABLE,
        Key: { 
            owner: { S: owner },
            videoId: { S: videoId } 
        },
        UpdateExpression: "SET s3OutputKey = :o, videoFormat = :f, #st = :s",
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: {
            ":o": { S: s3OutputKey },
            ":f": { S: format },
            ":s": { S: status }
        }
    });
    await client.send(command);
}

// Query all videos for a user
async function getUserVideos(owner) {
    const { client, config } = await getDbClient();
    const command = new QueryCommand({
        TableName: config.DYNAMODB_TABLE,
        KeyConditionExpression: "#own = :o",
        ExpressionAttributeNames: {
            "#own": "owner"   // alias for the reserved keyword
        },
        ExpressionAttributeValues: {
            ":o": { S: owner }
        }
    });

    const result = await client.send(command);
    console.log("DynamoDB scan result:", result.Items);  // debug
    // Convert DynamoDB’s raw format to plain JS objects
    return result.Items.map(item => ({
        videoId: item.videoId.S,
        s3InputKey: item.s3Key?.S,
        s3OutputKey: item.s3OutputKey?.S || null,
        videoFormat: item.videoFormat?.S || null,
        status: item.status.S,
        createdAt: item.createdAt.S
    }));
}


module.exports = { saveVideoMetadata, updateVideoMetadata, getUserVideos };
