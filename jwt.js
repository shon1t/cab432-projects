const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { getCognitoSecrets } = require("./utils/secrets");

// Secret name in AWS Secrets Manager (should match the one in auth.js)
const COGNITO_SECRET_NAME = "a2-group111-secret";

// Cache for verifiers
let verifiers = null;

// Initialize JWT verifiers from Secrets Manager
async function getVerifiers() {
  if (!verifiers) {
    try {
      const config = await getCognitoSecrets(COGNITO_SECRET_NAME);
      
      verifiers = {
        idVerifier: CognitoJwtVerifier.create({
          userPoolId: config.USER_POOL_ID,
          tokenUse: "id",
          clientId: config.CLIENT_ID,
        }),
        accessVerifier: CognitoJwtVerifier.create({
          userPoolId: config.USER_POOL_ID,
          tokenUse: "access", 
          clientId: config.CLIENT_ID,
        })
      };
      
      console.log("JWT verifiers initialized from Secrets Manager");
    } catch (error) {
      console.error("Failed to initialize JWT verifiers:", error.message);
      throw error;
    }
  }
  return verifiers;
}

// Middleware to verify Cognito JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log("JWT token missing.");
    return res.sendStatus(401);
  }

  try {
    // Get verifiers from Secrets Manager
    const { idVerifier, accessVerifier } = await getVerifiers();
    
    // Try to verify as ID token first 
    const decoded = await idVerifier.verify(token);
    
    console.log(`Cognito ID token verified for user: ${decoded["cognito:username"]} at URL ${req.url}`);
    
    // Add user info to the request for the next handler
    req.user = {
      username: decoded["cognito:username"],
      email: decoded.email,
      sub: decoded.sub,
      ...decoded
    };
    next();
  } catch (err) {
    try {
      // If ID token fails, try access token
      const { accessVerifier } = await getVerifiers();
      const decoded = await accessVerifier.verify(token);
      
      console.log(`Cognito access token verified for user: ${decoded.username} at URL ${req.url}`);
      
      req.user = {
        username: decoded.username,
        sub: decoded.sub,
        ...decoded
      };
      next();
    } catch (accessErr) {
      console.log(`JWT verification failed at URL ${req.url}:`, err.message);
      return res.sendStatus(401);
    }
  };
};

module.exports = { authenticateToken };
