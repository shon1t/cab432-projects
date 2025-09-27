const express = require("express");
const { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand, ConfirmSignUpCommand, RespondToAuthChallengeCommand, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand, AdminListGroupsForUserCommand } = require("@aws-sdk/client-cognito-identity-provider");
const crypto = require("crypto");
const { getCognitoSecrets } = require("../utils/secrets");
const JWT = require("../jwt");
const router = express.Router();

// Configure AWS Cognito
const cognito = new CognitoIdentityProviderClient({
  region: "ap-southeast-2"
});

// Secret name in AWS Secrets Manager
const COGNITO_SECRET_NAME = "a2-group111-secret";

// Cache for Cognito configuration
let cognitoConfig = null;

// Get Cognito configuration from Secrets Manager
async function getCognitoConfig() {
  if (!cognitoConfig) {
    try {
      cognitoConfig = await getCognitoSecrets(COGNITO_SECRET_NAME);
      console.log("Cognito configuration loaded from Secrets Manager");
    } catch (error) {
      console.error("Failed to load Cognito configuration:", error.message);
      throw error;
    }
  }
  return cognitoConfig;
}

// Helper to compute SECRET_HASH 
function secretHash(clientId, clientSecret, username) {
  const hasher = crypto.createHmac('sha256', clientSecret);
  hasher.update(`${username}${clientId}`);
  return hasher.digest('base64');
}

// User login with Cognito
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Get Cognito configuration from Secrets Manager
    const config = await getCognitoConfig();

    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: config.CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: secretHash(config.CLIENT_ID, config.CLIENT_SECRET, username) 
      }
    });

    const response = await cognito.send(command);
    
    // Check if challenged
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

  try {
    // Get Cognito configuration from Secrets Manager
    const config = await getCognitoConfig();

    const command = new SignUpCommand({
      ClientId: config.CLIENT_ID,
      Username: username,
      Password: password,
      UserAttributes: [
        {
          Name: "email",
          Value: email
        }
      ],
      SecretHash: secretHash(config.CLIENT_ID, config.CLIENT_SECRET, username) 
    });

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

  try {
    // Get Cognito configuration from Secrets Manager
    const config = await getCognitoConfig();

    const command = new ConfirmSignUpCommand({
      ClientId: config.CLIENT_ID,
      SecretHash: secretHash(config.CLIENT_ID, config.CLIENT_SECRET, username),
      Username: username,
      ConfirmationCode: confirmationCode,
    });

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

  try {
    // Get Cognito configuration from Secrets Manager
    const config = await getCognitoConfig();

    const command = new RespondToAuthChallengeCommand({
      ClientId: config.CLIENT_ID,
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      Session: session,
      ChallengeResponses: {
        USERNAME: username,
        NEW_PASSWORD: newPassword,
        SECRET_HASH: secretHash(config.CLIENT_ID, config.CLIENT_SECRET, username)
      }
    });

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

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.groups || !req.user.groups.includes('Admin')) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Add user to group (Admin only)
router.post("/assign-group", JWT.authenticateToken, requireAdmin, async (req, res) => {
  const { username, groupName } = req.body;

  if (!username || !groupName) {
    return res.status(400).json({ error: "Username and groupName are required" });
  }

  try {
    const config = await getCognitoConfig();

    const command = new AdminAddUserToGroupCommand({
      UserPoolId: config.USER_POOL_ID,
      Username: username,
      GroupName: groupName
    });

    await cognito.send(command);
    console.log(`User ${username} added to group ${groupName} by admin ${req.user.username}`);
    
    res.json({ 
      message: `User ${username} successfully added to ${groupName} group`
    });
  } catch (err) {
    console.error("Add to group error:", err);
    res.status(400).json({ error: err.message || "Failed to add user to group" });
  }
});

// Remove user from group (Admin only)
router.post("/remove-group", JWT.authenticateToken, requireAdmin, async (req, res) => {
  const { username, groupName } = req.body;

  if (!username || !groupName) {
    return res.status(400).json({ error: "Username and groupName are required" });
  }

  try {
    const config = await getCognitoConfig();

    const command = new AdminRemoveUserFromGroupCommand({
      UserPoolId: config.USER_POOL_ID,
      Username: username,
      GroupName: groupName
    });

    await cognito.send(command);
    console.log(`User ${username} removed from group ${groupName} by admin ${req.user.username}`);
    
    res.json({ 
      message: `User ${username} successfully removed from ${groupName} group`
    });
  } catch (err) {
    console.error("Remove from group error:", err);
    res.status(400).json({ error: err.message || "Failed to remove user from group" });
  }
});

// Get user's groups
router.get("/user-groups/:username", JWT.authenticateToken, async (req, res) => {
  const { username } = req.params;

  // Users can only check their own groups, admins can check anyone's
  if (req.user.username !== username && (!req.user.groups || !req.user.groups.includes('Admin'))) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const config = await getCognitoConfig();

    const command = new AdminListGroupsForUserCommand({
      UserPoolId: config.USER_POOL_ID,
      Username: username
    });

    const response = await cognito.send(command);
    const groups = response.Groups?.map(group => ({
      name: group.GroupName,
      description: group.Description,
      precedence: group.Precedence
    })) || [];

    res.json({ 
      username: username,
      groups: groups
    });
  } catch (err) {
    console.error("Get user groups error:", err);
    res.status(400).json({ error: err.message || "Failed to get user groups" });
  }
});

module.exports = router;