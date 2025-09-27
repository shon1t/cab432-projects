const express = require("express");
const { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");
const crypto = require("crypto");
const router = express.Router();

// Configure AWS Cognito
const cognito = new CognitoIdentityProviderClient({
  region: "ap-southeast-2"
});

const CLIENT_ID = "e2lgatu20g780tsmitg1usn5";
const CLIENT_SECRET = "p3190udi8jq16bd2jpgn2j74kqg807uga9hrh3qiun2bqo0c1gr"; // If your app client has a secret
const USER_POOL_ID = "ap-southeast-2_LoqVf6hsi";

// Helper to compute SECRET_HASH (only if your app client has a secret)
function getSecretHash(username) {
  return crypto
    .createHmac("SHA256", CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest("base64");
}

// User login with Cognito
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
      SECRET_HASH: getSecretHash(username) // Include if your app client has a secret
    }
  });

  try {
    const response = await cognito.send(command);
    const idToken = response.AuthenticationResult.IdToken;
    
    console.log("Successful login by user", username);
    res.json({ authToken: idToken });
  } catch (err) {
    console.error("Login error:", err);
    res.status(401).json({ error: err.message || "Authentication failed" });
  }
});

// User registration with Cognito
router.post("/register", async (req, res) => {
  const { username, password, email } = req.body;

  const command = new SignUpCommand({
    ClientId: CLIENT_ID,
    Username: username,
    Password: password,
    UserAttributes: [
      {
        Name: "email",
        Value: email
      }
    ],
    SecretHash: getSecretHash(username) // Include if your app client has a secret
  });

  try {
    const response = await cognito.send(command);
    console.log("User registered:", username);
    res.json({ 
      message: "Registration successful! Please check your email for verification.",
      userSub: response.UserSub
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(400).json({ error: err.message || "Registration failed" });
  }
});

module.exports = router;