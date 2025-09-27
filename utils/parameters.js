const { SSMClient, GetParameterCommand, GetParametersCommand } = require("@aws-sdk/client-ssm");

// Configure the SSM client for Parameter Store
const client = new SSMClient({ region: "ap-southeast-2" });

// In-memory cache for parameters to avoid repeated API calls
const parametersCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Retrieve a single parameter from AWS Parameter Store with caching
 * @param {string} parameterName - The name of the parameter
 * @param {boolean} withDecryption - Whether to decrypt SecureString parameters
 * @returns {Promise<string>} - Parameter value
 */
async function getParameter(parameterName, withDecryption = false) {
  const cacheKey = `${parameterName}-${withDecryption}`;
  
  // Check cache first
  const cached = parametersCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`Retrieved parameter '${parameterName}' from cache`);
    return cached.value;
  }

  try {
    console.log(`Fetching parameter '${parameterName}' from Parameter Store`);
    const response = await client.send(
      new GetParameterCommand({
        Name: parameterName,
        WithDecryption: withDecryption
      })
    );

    if (!response.Parameter || response.Parameter.Value === undefined) {
      throw new Error(`Parameter '${parameterName}' has no value`);
    }

    const value = response.Parameter.Value;
    
    // Cache the parameter
    parametersCache.set(cacheKey, {
      value: value,
      timestamp: Date.now()
    });

    console.log(`Successfully retrieved and cached parameter '${parameterName}'`);
    return value;
    
  } catch (error) {
    console.error(`Error retrieving parameter '${parameterName}':`, error.message);
    throw new Error(`Failed to retrieve parameter '${parameterName}': ${error.message}`);
  }
}

/**
 * Retrieve multiple parameters from AWS Parameter Store with caching
 * @param {string[]} parameterNames - Array of parameter names
 * @param {boolean} withDecryption - Whether to decrypt SecureString parameters
 * @returns {Promise<Object>} - Object with parameter names as keys and values
 */
async function getParameters(parameterNames, withDecryption = false) {
  const result = {};
  const uncachedParams = [];
  
  // Check cache for each parameter
  for (const paramName of parameterNames) {
    const cacheKey = `${paramName}-${withDecryption}`;
    const cached = parametersCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      result[paramName] = cached.value;
      console.log(`Retrieved parameter '${paramName}' from cache`);
    } else {
      uncachedParams.push(paramName);
    }
  }
  
  // Fetch uncached parameters
  if (uncachedParams.length > 0) {
    try {
      console.log(`Fetching ${uncachedParams.length} parameters from Parameter Store`);
      const response = await client.send(
        new GetParametersCommand({
          Names: uncachedParams,
          WithDecryption: withDecryption
        })
      );

      // Process successful parameters
      if (response.Parameters) {
        for (const param of response.Parameters) {
          const cacheKey = `${param.Name}-${withDecryption}`;
          result[param.Name] = param.Value;
          
          // Cache the parameter
          parametersCache.set(cacheKey, {
            value: param.Value,
            timestamp: Date.now()
          });
        }
      }

      // Check for any parameters that weren't found
      if (response.InvalidParameters && response.InvalidParameters.length > 0) {
        throw new Error(`Parameters not found: ${response.InvalidParameters.join(', ')}`);
      }

      console.log(`Successfully retrieved and cached ${response.Parameters?.length || 0} parameters`);
      
    } catch (error) {
      console.error(`Error retrieving parameters:`, error.message);
      throw error;
    }
  }
  
  return result;
}

/**
 * Get application configuration from Parameter Store
 * @returns {Promise<Object>} - Configuration object with all app settings
 */
async function getAppConfig() {
  const parameterNames = [
    '/a2-group111/app/region',
    '/a2-group111/app/port', 
    '/a2-group111/app/dynamodb-table',
    '/a2-group111/app/s3-bucket'
  ];
  
  try {
    const parameters = await getParameters(parameterNames);
    
    return {
      AWS_REGION: parameters['/a2-group111/app/region'],
      PORT: parseInt(parameters['/a2-group111/app/port']) || 3000,
      DYNAMODB_TABLE: parameters['/a2-group111/app/dynamodb-table'],
      S3_BUCKET: parameters['/a2-group111/app/s3-bucket']
    };
    
  } catch (error) {
    console.error('Failed to load application configuration:', error.message);
    throw error;
  }
}

/**
 * Clear the parameters cache (useful for testing or forced refresh)
 */
function clearCache() {
  parametersCache.clear();
  console.log('Parameters cache cleared');
}

module.exports = {
  getParameter,
  getParameters, 
  getAppConfig,
  clearCache
};