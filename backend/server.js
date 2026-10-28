require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(helmet());
app.use(express.json({ limit: "20kb" }));

app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false
}));

app.use("/api/tasks", require("./tasks"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "To Do List Manager API is running." });
});

app.use(express.static(path.join(__dirname, "../frontend")));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  console.error(err.message);

  res.status(400).json({
    error: "Invalid request. Please check your input."
  });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`To Do List Manager running at http://localhost:${PORT}`);
});