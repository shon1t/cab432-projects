const express = require("express");
const JWT = require("./jwt.js");
const path = require("path");

const app = express();
const port = 3000;
app.use(express.json());

// Simple hard-coded username and password for demonstration
const users = {
   CAB432: {
      password: "supersecret",
      admin: false,
   },
   admin: {
      password: "admin",
      admin: true,
   },
};

// User needs to login to obtain an authentication token
app.post("/login", (req, res) => {
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

// Main page protected by our authentication middleware
app.get("/", JWT.authenticateToken, (req, res) => {
   res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Admin page requires admin permissions
app.get("/admin", JWT.authenticateToken, (req, res) => {
   // user info added to the request by JWT.authenticateToken
   // Check user permissions
   const user = users[req.user.username];
   
   if (!user || !user.admin) {
      // bad user or not admin
      console.log("Unauthorised user requested admin content.");
      return res.sendStatus(403);
   }

   // User permissions verified.
   res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.listen(port, () => {
   console.log(`Server listening on port ${port}.`);
});
