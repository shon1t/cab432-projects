const jwt = require("jsonwebtoken");

// Use a fixed authentication key (improve this later)
const tokenSecret =
   "spider-man";

// Create a token with username embedded, setting the validity period.
const generateAccessToken = (username) => {
   return jwt.sign(username, tokenSecret, { expiresIn: "30m" });
};

// Middleware to verify a token and respond with user information
const authenticateToken = (req, res, next) => {
   // We are using Bearer auth.  The token is in the authorization header.
   const authHeader = req.headers["authorization"];
   const token = authHeader && authHeader.split(' ')[1];

   if (!token) {
      console.log("JSON web token missing.");
      return res.sendStatus(401);
   }

   // Check that the token is valid
   try {
      const user = jwt.verify(token, tokenSecret);

      console.log(
         `authToken verified for user: ${user.username} at URL ${req.url}`
      );

      // Add user info to the request for the next handler
      req.user = user;
      next();
   } catch (err) {
      console.log(
         `JWT verification failed at URL ${req.url}`,
         err.name,
         err.message
      );
      return res.sendStatus(401);
   }
};

module.exports = { generateAccessToken, authenticateToken };
