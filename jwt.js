const { CognitoJwtVerifier } = require("aws-jwt-verify");

// Configure JWT verifiers for Cognito
const userPoolId = "ap-southeast-2_LoqVf6hsi";
const clientId = "e2lgatu20g780tsmitg1usn5";

const idVerifier = CognitoJwtVerifier.create({
  userPoolId: userPoolId,
  tokenUse: "id",
  clientId: clientId,
});

const accessVerifier = CognitoJwtVerifier.create({
  userPoolId: userPoolId,
  tokenUse: "access", 
  clientId: clientId,
});

// Middleware to verify Cognito JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log("JWT token missing.");
    return res.sendStatus(401);
  }

  try {
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
