const express = require("express");
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");
const crypto = require("crypto");

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

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
      ...(CLIENT_SECRET ? { SECRET_HASH: getSecretHash(username) } : {})
    }
  };

  try {
    const command = new InitiateAuthCommand(params);
    const response = await cognito.send(command);

    if (response.AuthenticationResult) {
      res.json({ authToken: response.AuthenticationResult.IdToken });
    } else if (response.ChallengeName) {
      res.status(401).json({
        error: `Challenge required: ${response.ChallengeName}`,
        details: response
      });
    } else {
      res.status(401).json({ error: "Login failed, unknown response", details: response });
    }
  } catch (err) {
    console.error("Cognito login error:", err);
    res.status(401).json({ error: err.message || JSON.stringify(err) });
  }
});

module.exports = router;
