Assignment 2 - Cloud Services Exercises - Response to Criteria
================================================

Instructions
------------------------------------------------
- Keep this file named A2_response_to_criteria.md, do not change the name
- Upload this file along with your code in the root directory of your project
- Upload this file in the current Markdown format (.md extension)
- Do not delete or rearrange sections.  If you did not attempt a criterion, leave it blank
- Text inside [ ] like [eg. S3 ] are examples and should be removed



Overview
------------------------------------------------

- **Name:** Luis Torres 
- **Student number:** n11591510
- **Partner name (if applicable):** Sean de Lemos n11077417
- **Application name:** Video Transcoder
- **Two line description:** A web app for uploading, transcoding, and downloading video files using AWS cloud services. Users can log in, upload videos, and receive transcoded files securely.
- **EC2 instance name or ID:** i-03d3c837279d5352d

------------------------------------------------


### Core - First data persistence service

- **AWS service name:** S3
- **What data is being stored?:** Video files
- **Why is this service suited to this data?:** S3 is designed for large, unstructured files and provides scalable, durable storage.
- **Why are the other services used not suitable for this data?:** DynamoDB and RDS are not optimized for large binary files.
- **Bucket/instance/table name:** a2-n11077417-bucket
- **Video timestamp:** 0:07
- **Relevant files:**
    - utils/s3.js
    - routes/video.js


### Core - Second data persistence service

- **AWS service name:** DynamoDB
- **What data is being stored?:** Video metadata (owner, S3 key, status, format)
- **Why is this service suited to this data?:** DynamoDB is a fast, scalable NoSQL database ideal for structured metadata.
- **Why are the other services used not suitable for this data?:** S3 is not suitable for structured queries; RDS is more complex for simple key-value metadata.
- **Bucket/instance/table name:** a2-n11077417-videodata
- **Video timestamp:** 1:00
- **Relevant files:**
    - utils/db.js
    - routes/video.js


### Third data service

(not attempted)


### S3 Pre-signed URLs

- **S3 Bucket names:** a2-n11077417-bucket
- **Video timestamp:** 1:34
- **Relevant files:**
    - utils/s3.js
    - routes/video.js
    - public/js/app.js


### In-memory cache

(not attempted)


### Core - Statelessness

- **What data is stored within your application that is not stored in cloud data services?:** Only temporary files during upload/transcoding, which are deleted after use.
- **Why is this data not considered persistent state?:** Temporary files are recreated as needed and do not affect persistent state.
- **How does your application ensure data consistency if the app suddenly stops?:** All persistent data is stored in S3 and DynamoDB; uploads and transcoding are atomic and recoverable.
- **Relevant files:**
    - routes/video.js
    - utils/s3.js
    - utils/db.js


### Graceful handling of persistent connections

(not attempted)




### Core - Authentication with Cognito

- **User pool name:** n11077417-a2-userpool
- **How are authentication tokens handled by the client?:** After login, the server returns a JWT token which is stored in localStorage on the client and sent in the Authorization header for all protected requests.
- **Video timestamp:** 1:55
- **Relevant files:**
    - routes/auth.js
    - jwt.js
    - public/js/app.js


### Cognito multi-factor authentication

(not attempted)


### Cognito federated identities

(not attempted)



### Cognito groups

- **How are groups used to set permissions?:** The application uses Cognito groups to organise user permissions. For example, users in the 'admin' group have access to admin-only features, such as deleting videos or managing other users. Group membership is checked in the backend to control access to protected routes.
- **Video timestamp:** 3:30
- **Relevant files:**
    - routes/auth.js
    - jwt.js
    - public/admin.html
    - routes/video.js


### Core - DNS with Route53

- **Subdomain**: a2-group111.cab432.com
- **Video timestamp:** 4:36



### Parameter store

- **Parameter names:** /a2-group111/app/port, /a2-group111/app/region, /a2-group111/app/s3-bucket, /a2-group111/app/dynamodb-table
- **Video timestamp:** 4:57
- **Relevant files:**
    - utils/parameters.js
    - utils/s3.js
    - utils/db.js



### Secrets manager

- **Secrets names:** a2-group111-secret
- **Video timestamp:** 5:37
- **Relevant files:**
    - utils/secrets.js
    - routes/auth.js
    - jwt.js


### Infrastructure as code

(not attempted)


### Other (with prior approval only)

(not attempted)


### Other (with prior permission only)

(not attempted)
