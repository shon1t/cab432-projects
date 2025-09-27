const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

// Configure the Secrets Manager client
const client = new SecretsManagerClient({ region: "ap-southeast-2" });

// In-memory cache for secrets to avoid repeated API calls
const secretsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Retrieve a secret from AWS Secrets Manager with caching
 * @param {string} secretName - The name or ARN of the secret
 * @returns {Promise<Object>} - Parsed secret object
 */
async function getSecret(secretName) {
  // Check cache first
  const cached = secretsCache.get(secretName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`Retrieved secret '${secretName}' from cache`);
    return cached.value;
  }

  try {
    console.log(`Fetching secret '${secretName}' from AWS Secrets Manager`);
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName
      })
    );

    if (!response.SecretString) {
      throw new Error(`Secret '${secretName}' has no SecretString value`);
    }

    // Parse the secret JSON
    const secretValue = JSON.parse(response.SecretString);
    
    // Cache the secret
    secretsCache.set(secretName, {
      value: secretValue,
      timestamp: Date.now()
    });

    console.log(`Successfully retrieved and cached secret '${secretName}'`);
    return secretValue;
    
  } catch (error) {
    console.error(`Error retrieving secret '${secretName}':`, error.message);
    throw new Error(`Failed to retrieve secret '${secretName}': ${error.message}`);
  }
}

/**
 * Get Cognito configuration from Secrets Manager
 * @param {string} secretName - The name of the Cognito secrets
 * @returns {Promise<Object>} - Cognito configuration object
 */
async function getCognitoSecrets(secretName) {
  const secrets = await getSecret(secretName);
  
  // Validate that required Cognito secrets are present
  const requiredKeys = ['CLIENT_SECRET', 'CLIENT_ID', 'USER_POOL_ID'];
  const missingKeys = requiredKeys.filter(key => !secrets[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required Cognito secrets: ${missingKeys.join(', ')}`);
  }
  
  return {
    CLIENT_SECRET: secrets.CLIENT_SECRET,
    CLIENT_ID: secrets.CLIENT_ID,
    USER_POOL_ID: secrets.USER_POOL_ID
  };
}

/**
 * Clear the secrets cache (useful for testing or forced refresh)
 */
function clearCache() {
  secretsCache.clear();
  console.log('Secrets cache cleared');
}

module.exports = {
  getSecret,
  getCognitoSecrets,
  clearCache
};