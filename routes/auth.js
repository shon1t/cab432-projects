const express = require("express");
const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand
} = require("@aws-sdk/client-cognito-identity-provider");
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
  const { username, password, newPassword } = req.body;

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

    // Normal login flow
    if (response.AuthenticationResult) {
      return res.json({ authToken: response.AuthenticationResult.IdToken });
    }

    // Handle NEW_PASSWORD_REQUIRED
    if (response.ChallengeName === "NEW_PASSWORD_REQUIRED") {
      if (!newPassword) {
        // client must provide new password on next request
        return res.status(403).json({
          error: "NEW_PASSWORD_REQUIRED",
          message: "User must set a new password",
          session: response.Session // needed to continue
        });
      }

      const challengeResponse = new RespondToAuthChallengeCommand({
        ClientId: CLIENT_ID,
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        Session: response.Session,
        ChallengeResponses: {
          USERNAME: username,
          NEW_PASSWORD: newPassword,
          ...(CLIENT_SECRET ? { SECRET_HASH: getSecretHash(username) } : {})
        }
      });

      const finalResponse = await cognito.send(challengeResponse);
      return res.json({ authToken: finalResponse.AuthenticationResult.IdToken });
    }

    // Unknown case
    return res.status(401).json({ error: "Login failed", details: response });
  } catch (err) {
    console.error("Cognito login error:", err);
    res.status(401).json({ error: err.message || JSON.stringify(err) });
  }
});

module.exports = router;
