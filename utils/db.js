const { DynamoDBClient, PutItemCommand, UpdateItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

const db = new DynamoDBClient({ region: "ap-southeast-2" });
const TABLE = "a2-n11077417-videodata"; 

// Save metadata for a new upload
async function saveVideoMetadata({ s3Key, owner }) {
    const videoId = uuidv4();
    const command = new PutItemCommand({
        TableName: TABLE,
        Item: {
            videoId: { S: videoId },
            s3Key: { S: s3Key },
            status: { S: "uploaded" },
            owner: { S: owner },
            createdAt: { S: new Date().toISOString() }
        }
    });
    await db.send(command);
    return videoId;
}

// Update metadata after transcoding
async function updateVideoMetadata(owner, videoId, { s3OutputKey, format, status }) {
    const command = new UpdateItemCommand({
        TableName: TABLE,
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
    await db.send(command);
}

// Query all videos for a user
async function getUserVideos(owner) {
    const command = new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "#own = :o", 
        ExpressionAttributeValues: {
            ":o": { S: owner }
        }
    });

    const result = await db.send(command);

    // Convert DynamoDB’s raw format to plain JS objects
    return result.Items.map(item => ({
        videoId: item.videoId.S,
        s3InputKey: item.s3InputKey?.S,
        s3OutputKey: item.s3OutputKey?.S || null,
        videoFormat: item.videoFormat?.S || null,
        status: item.status.S,
        createdAt: item.createdAt.S
    }));
}


module.exports = { saveVideoMetadata, updateVideoMetadata, getUserVideos };
