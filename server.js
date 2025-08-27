const express = require("express");
const path = require("path");

const authRoutes = require("./routes/auth");
const indexRoutes = require("./routes/index");
const videoRoutes = require("./routes/video");

const app = express();
const port = require("./config/config").PORT;

app.use(express.json());

// register routes
app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/video", videoRoutes);
app.use(express.static(path.join(__dirname, "public")));

// Debug: List all registered routes
app._router.stack.forEach(r => {
  if (r.route && r.route.path) {
    console.log(r.route.path, Object.keys(r.route.methods));
  }
});


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});