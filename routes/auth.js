const express = require("express");
const { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand, ConfirmSignUpCommand, RespondToAuthChallengeCommand } = require("@aws-sdk/client-cognito-identity-provider");
const crypto = require("crypto");
const router = express.Router();

// Configure AWS Cognito
const cognito = new CognitoIdentityProviderClient({
  region: "ap-southeast-2"
});

const CLIENT_ID = "e2lgatu20g780tsmitg1usn5";
const CLIENT_SECRET = "p3190udi8jq16bd2jpgn2j74kqg807uga9hrh3qiun2bqo0c1gr";
const USER_POOL_ID = "ap-southeast-2_LoqVf6hsi";

// Helper to compute SECRET_HASH 
function secretHash(clientId, clientSecret, username) {
  const hasher = crypto.createHmac('sha256', clientSecret);
  hasher.update(`${username}${clientId}`);
  return hasher.digest('base64');
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
      SECRET_HASH: secretHash(CLIENT_ID, CLIENT_SECRET, username) 
    }
  });

  try {
    const response = await cognito.send(command);
    
    // Check if we got a challenge (temporary password case)
    if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      res.json({ 
        challenge: "NEW_PASSWORD_REQUIRED",
        session: response.Session,
        message: "Please set a new password",
        username: username
      });
      return;
    }
    
    // Check if AuthenticationResult exists
    if (!response.AuthenticationResult || !response.AuthenticationResult.IdToken) {
      console.error("No AuthenticationResult in response:", response);
      res.status(401).json({ error: "Authentication failed - no tokens returned" });
      return;
    }
    
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
    SecretHash: secretHash(CLIENT_ID, CLIENT_SECRET, username) 
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
    
    // Handle specific AWS Cognito errors
    if (err.name === 'LimitExceededException') {
      res.status(429).json({ 
        error: "Daily email limit exceeded. Please try again tomorrow or contact support." 
      });
    } else if (err.name === 'UsernameExistsException') {
      res.status(400).json({ 
        error: "Username already exists. Please choose a different username." 
      });
    } else {
      res.status(400).json({ error: err.message || "Registration failed" });
    }
  }
});

// Email confirmation route
router.post("/confirm", async (req, res) => {
  const { username, confirmationCode } = req.body;

  const command = new ConfirmSignUpCommand({
    ClientId: CLIENT_ID,
    SecretHash: secretHash(CLIENT_ID, CLIENT_SECRET, username),
    Username: username,
    ConfirmationCode: confirmationCode,
  });

  try {
    const response = await cognito.send(command);
    console.log("User confirmed:", username);
    res.json({ 
      message: "Email confirmed successfully! You can now log in.",
    });
  } catch (err) {
    console.error("Confirmation error:", err);
    
    // Handle specific AWS Cognito errors
    if (err.name === 'CodeMismatchException') {
      res.status(400).json({ 
        error: "Invalid confirmation code. Please check the code and try again." 
      });
    } else if (err.name === 'ExpiredCodeException') {
      res.status(400).json({ 
        error: "Confirmation code has expired. Please request a new code." 
      });
    } else if (err.name === 'UserNotFoundException') {
      res.status(400).json({ 
        error: "User not found." 
      });
    } else {
      res.status(400).json({ error: err.message || "Confirmation failed" });
    }
  }
});

// Route to handle password change challenge
router.post("/change-password", async (req, res) => {
  const { username, newPassword, session } = req.body;

  const command = new RespondToAuthChallengeCommand({
    ClientId: CLIENT_ID,
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    Session: session,
    ChallengeResponses: {
      USERNAME: username,
      NEW_PASSWORD: newPassword,
      SECRET_HASH: secretHash(CLIENT_ID, CLIENT_SECRET, username)
    }
  });

  try {
    const response = await cognito.send(command);
    const idToken = response.AuthenticationResult.IdToken;
    
    console.log("Password changed and login successful for user", username);
    res.json({ 
      authToken: idToken,
      message: "Password changed successfully! You are now logged in."
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(400).json({ error: err.message || "Failed to change password" });
  }
});

module.exports = router;