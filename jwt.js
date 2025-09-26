const { CognitoJwtVerifier } = require("cognito-jwt-verifier");

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "access", // or "id"
  clientId: process.env.COGNITO_CLIENT_ID,
});

async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  try {
    const payload = await verifier.verify(token);
    req.user = payload; // contains username, sub, email, etc.
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    res.sendStatus(403);
  }
}

module.exports = { authenticateToken };
