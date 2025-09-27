const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

// Configure JWKS client for Cognito
const client = jwksClient({
  jwksUri: "https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_LoqVf6hsi/.well-known/jwks.json"
});

// Function to get signing key for JWT verification
function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// Middleware to verify Cognito JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log("JWT token missing.");
    return res.sendStatus(401);
  }

  // Verify the Cognito JWT token
  jwt.verify(token, getKey, {
    algorithms: ["RS256"],
    issuer: "https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_LoqVf6hsi",
    audience: "e2lgatu20g780tsmitg1usn5"
  }, (err, decoded) => {
    if (err) {
      console.log(`JWT verification failed at URL ${req.url}:`, err.message);
      return res.sendStatus(401);
    }

    console.log(`Cognito token verified for user: ${decoded["cognito:username"]} at URL ${req.url}`);
    
    // Add user info to the request for the next handler
    req.user = {
      username: decoded["cognito:username"],
      email: decoded.email,
      sub: decoded.sub,
      ...decoded
    };
    next();
  });
};

module.exports = { authenticateToken };
