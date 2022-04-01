import { Router } from "express";
import test from "./test.js";

const router = Router();

router.use("/test", test);

router.get("/", (req, res) => {
  res.send("Solana Royale API server running version 1.0.0");
});

export default router;
