const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const client = jwksClient({
  jwksUri: "https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_LoqVf6hsi/.well-known/jwks.json"
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, getKey, {
    algorithms: ["RS256"],
    issuer: "https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_LoqVf6hsi"
  }, (err, decoded) => {
    if (err) return res.sendStatus(401);
    req.user = decoded;
    next();
  });
}

module.exports = { authenticateToken };