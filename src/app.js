import express from "express";
import { info } from "./utils/logger.js";
import routes from "./routes/index.js";

const app = express();
const SERVER_PORT = 8080;

app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("Solana Royale API server running version 1.0.0");
});

app.listen(SERVER_PORT, () => {
  info("Server started on port", SERVER_PORT);
});
