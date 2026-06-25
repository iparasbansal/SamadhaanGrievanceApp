const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");            //CORS = Cross Origin Resourse Sharing
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5174";

const corsOptions = {
  origin: CLIENT_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  credentials: false,
};

app.use(cors(corsOptions));
// Handle preflight for all routes (Express 5 requires regex for wildcards)
app.options(/.*/, cors(corsOptions));

console.log(`CORS enabled for: ${CLIENT_ORIGIN}`);

app.use(express.json({ limit: "5mb" }));

const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use("/uploads", express.static(uploadsDir));

app.use((req, res, next) => {
  console.log("INCOMING:", req.method, req.url);
  next();
});

const { log } = require("./logger");

const db = process.env.MONGO_URI;
if (!db) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

log("Attempting database connection...");
mongoose.connection.on("connected", () => {
  log("Mongoose connection established successfully.");
});
mongoose.connection.on("error", (err) => {
  log(`Mongoose connection error: ${err.message}\nStack: ${err.stack}`);
});
mongoose.connection.on("disconnected", () => {
  log("Mongoose disconnected from database.");
});

mongoose
  .connect(db)
  .then(() => log("MongoDB Connected promise resolved."))
  .catch((err) => {
    log(`MongoDB connection error in promise: ${err.message}\nStack: ${err.stack}`);
    process.exit(1);
  });

app.use("/api/grievances", require("./routes/grievances"));
app.use("/api/users", require("./routes/users"));
app.use("/api/ai", require("./routes/ai"));

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Server error" });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server started on port ${port}`));               
