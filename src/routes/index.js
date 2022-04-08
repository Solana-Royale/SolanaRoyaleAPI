import { Router } from "express";
import create from "./create.js";
import play from "./play.js";
import authorize from "./authorize.js";
import register from "./register.js";
import checkToken from "./checkToken.js";
import pay from "./pay.js";
import sync from "./sync.js";

const router = Router();

router.use("/games/create", create);
router.use("/games/play", play);
router.use("/authorize", authorize);
router.use("/register", register);
router.use("/checkToken", checkToken);
router.use("/pay", pay);
router.use("/8CjF4IygzwEyG82QPsrK/sync", sync);

export default router;
