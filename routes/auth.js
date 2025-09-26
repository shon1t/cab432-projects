const express = require("express");
const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand
} = require("@aws-sdk/client-cognito-identity-provider");

const router = express.Router();

const client = new CognitoIdentityProviderClient({ region: "ap-southeast-2" });
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;   // your App Client ID
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID; // your Pool ID

// Signup endpoint
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const command = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: username,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email }
      ]
    });
    await client.send(command);
    res.json({ message: "Signup successful, please confirm via email" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(400).json({ error: err.message });
  }
});

// Confirm signup (with code from email)
router.post("/confirm", async (req, res) => {
  const { username, code } = req.body;
  try {
    const command = new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: username,
      ConfirmationCode: code
    });
    await client.send(command);
    res.json({ message: "User confirmed" });
  } catch (err) {
    console.error("Confirm error:", err);
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      }
    });
    const response = await client.send(command);
    res.json({
      idToken: response.AuthenticationResult.IdToken,
      accessToken: response.AuthenticationResult.AccessToken,
      refreshToken: response.AuthenticationResult.RefreshToken
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(401).json({ error: err.message });
  }
});

module.exports = router;
