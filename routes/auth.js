const express = require("express");
const crypto = require("crypto");

const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const router = express.Router();

const cognito = new CognitoIdentityProviderClient({
  region: "ap-southeast-2",
});

const CLIENT_ID = "e2lgatu20g780tsmitg1usn5";
const CLIENT_SECRET = "p3190udi8jq16bd2jpgn2j74kqg807uga9hrh3qiun2bqo0c1gr";
const USER_POOL_ID = "ap-southeast-2_LoqVf6hsi";

// Helper to compute SECRET_HASH 
function getSecretHash(username) {
  return crypto
    .createHmac("SHA256", CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest("base64");
}

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
      SECRET_HASH: getSecretHash(username),
    },
  };

  try {
    const command = new InitiateAuthCommand(params);
    const response = await cognito.send(command);

    res.json({ authToken: response.AuthenticationResult.IdToken });
  } catch (err) {
    console.error("Cognito login error:", err);
    res.status(401).json({ error: err.message || JSON.stringify(err) });
  }
});

module.exports = router;
