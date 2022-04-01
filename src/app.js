import express from "express";
import { info } from "./utils/logger.js";
import routes from "./routes/index.js";
import paths from "./paths/index.js";

const app = express();
const SERVER_PORT = 8080;

app.use("/api", routes);
app.use("/", paths);

app.listen(SERVER_PORT, () => {
  info("Server started on port", SERVER_PORT);
});
