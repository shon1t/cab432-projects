const { getAppConfig } = require("../utils/parameters");

// Cache for configuration
let appConfig = null;

// Get application configuration from Parameter Store
async function getConfig() {
  if (!appConfig) {
    try {
      appConfig = await getAppConfig();
      console.log("Application configuration loaded from Parameter Store");
    } catch (error) {
      console.error("Failed to load configuration from Parameter Store:", error.message);
      console.log("Falling back to default configuration");
      
      // Fallback to default values if Parameter Store is not available
      appConfig = {
        AWS_REGION: "ap-southeast-2",
        PORT: 3000,
        DYNAMODB_TABLE: "a2-n11077417-videodata", 
        S3_BUCKET: "a2-n11077417-bucket"
      };
    }
  }
  return appConfig;
}

// Legacy exports for backwards compatibility
module.exports = {
  PORT: 3000,
  TOKEN_SECRET: "amazing-spiderman",
  getConfig
};