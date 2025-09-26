const express = require("express");
const { CognitoUserPool, CognitoUser, AuthenticationDetails } = require("amazon-cognito-identity-js");

const router = express.Router();

const poolData = {
  UserPoolId: "ap-southeast-2_LoqVf6hsi", 
  ClientId: "1lfahjkrfk5roqd51oo6fmc2va", 
};
const userPool = new CognitoUserPool(poolData);

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const userData = { Username: username, Pool: userPool };
  const cognitoUser = new CognitoUser(userData);
  const authDetails = new AuthenticationDetails({ Username: username, Password: password });

  cognitoUser.authenticateUser(authDetails, {
    onSuccess: (result) => {
      const idToken = result.getIdToken().getJwtToken();
      res.json({ authToken: idToken });
    },
    onFailure: (err) => {
      res.status(401).json({ error: err.message || JSON.stringify(err) });
    },
  });
});

module.exports = router;