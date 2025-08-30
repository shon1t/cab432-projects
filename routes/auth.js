const express = require("express");
const JWT = require("../jwt.js");
const router = express.Router();

const users = {
    CAB432: {
      password: "supersecret",
      admin: false,
   },
   admin: {
      password: "admin",
      admin: true,
   },
   sean: {
        password: "12345",
        admin: false,
   }
}

// User needs to login to obtain an authentication token
router.post("/login", (req, res) => { // /auth/login
   // Check the username and password
   const { username, password } = req.body;
   const user = users[username];

   if (!user || password !== user.password) {
      return res.sendStatus(401);
   }

   // Get a new authentication token and send it back to the client
   console.log("Successful login by user", username);
   const token = JWT.generateAccessToken({ username });
   res.json({ authToken: token });
});

module.exports = router;