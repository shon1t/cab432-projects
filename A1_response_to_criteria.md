Assignment 1 - REST API Project - Response to Criteria
================================================

Overview
------------------------------------------------

- **Name:** Sean de Lemos
- **Student number:** n11077417
- **Application name:** transcode-app
- **Two line description:** A video transcoding application using REST API. Users can upload a videofile of any type and choose to transcode the video to mp4, WebM, avi or mov. User can then download the transcoded video.


Core criteria
------------------------------------------------

### Containerise the app

- **ECR Repository name:**: n11077417-transcode-app
- **Video timestamp:**: 0:00
- **Relevant files:**
    - /Dockerfile

### Deploy the container

- **EC2 instance ID:**: i-05caff2d9917bd667
- **Video timestamp:**: 0:30

### User login

- **One line description:**: Hard-coded username/password list. Using JWTs for sessions. Admin role boolean.
- **Video timestamp:**: 2:26
- **Relevant files:**
    - /routes/auth.js

### REST API

- **One line description:**: REST API with endpoints and HTTP methods (GET, POST) with appropriate status codes
- **Video timestamp:**: 1:15
- **Relevant files:**
    - /public/js/app.js
    - /routes/auth.js
    - /routes/index.js
    - /routes/video.js

### Data types

- **One line description:**: Different video data types are stored when a user uploads a video for transcoding.
- **Video timestamp:**: n/a
- **Relevant files:**
    - /uploads
    - /outputs

#### First kind

- **One line description:**: uploaded video files
- **Type:**: Unstructured
- **Rationale:**
- **Video timestamp:**: n/a
- **Relevant files:**
    - /uploads
    - /outputs

#### Second kind

- **One line description:**: n/a
- **Type:**: n/a
- **Rationale:**: n/a
- **Video timestamp:**: n/a
- **Relevant files:**: n/a
  - : n/a

### CPU intensive task

 **One line description:**: Video transcoding with ffmpeg
- **Video timestamp:**: 3:00
- **Relevant files:**
    - /routes/video.js

### CPU load testing

 **One line description:**: Manual CPU load testing with HTOP command and the AWS CPU utilisation monitoring
- **Video timestamp:**: 3:40 and 4:40
- **Relevant files:**
    - n/a

Additional criteria
------------------------------------------------

### Extensive REST API features

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### External API(s)

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### Additional types of data

- **One line description:**: Multiple video file formats are able for transcoding 
- **Video timestamp:**: 3:00
- **Relevant files:**
    - /routes/video.js

### Custom processing

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### Infrastructure as code

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### Web client

- **One line description:**: Simple web client is implemented and all endpoints are met
- **Video timestamp:**: 1:03
- **Relevant files:**
    - /public/admin.html
    - /public/index.html
    - /public/upload.html
    - /public/js/app.js

### Upon request

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 