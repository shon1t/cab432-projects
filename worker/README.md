# Video Transcoding Worker Service

This is the worker service that processes video transcoding jobs from an SQS queue.

## Architecture

```
API Server (routes/video.js)
    ↓ (sends job)
SQS Queue (a2-group111-transcode-queue)
    ↓ (polls for jobs)
Worker Service (worker/worker.js)
    ↓ (updates status)
DynamoDB + S3
```

## How it Works

1. **API Server** receives transcode request from user
2. **API Server** sends job message to SQS queue with:
   - videoId
   - s3InputKey (input video location)
   - owner (username)
   - format (mp4/webm)
3. **Worker** continuously polls SQS queue
4. **Worker** downloads video from S3
5. **Worker** transcodes using FFmpeg
6. **Worker** uploads result to S3
7. **Worker** updates DynamoDB with status
8. **Worker** deletes message from queue

## Running the Worker

### Locally (for testing)
```bash
cd worker
npm install
node worker.js
```

### On EC2 Instance
```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-instance

# Clone/copy code
cd /home/ec2-user
# (copy worker directory)

# Install dependencies
cd worker
npm install

# Install ffmpeg (if not already installed)
sudo yum install -y ffmpeg

# Run worker
node worker.js

# Or use pm2 for persistent running
npm install -g pm2
pm2 start worker.js --name video-worker
pm2 save
pm2 startup
```

## Environment Setup

The worker uses the same AWS configuration as the main application:
- AWS credentials from EC2 instance role (or local AWS config)
- Region and queue URL from environment or defaults

## Monitoring

Worker logs include:
- Job received from queue
- Download progress
- FFmpeg transcoding progress
- Upload completion
- DynamoDB updates
- Errors and failures

## Status Flow

- `pending` → Video uploaded, not yet queued
- `processing` → Job sent to queue/being transcoded
- `completed` → Transcoding finished successfully
- `failed` → Error during transcoding
