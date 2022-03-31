import { Router } from "express";
import create from "./create.js";
import play from "./play.js";
import authorize from "./authorize.js";

const router = Router();

router.use("/games/create", create);
router.use("/games/play", play);
router.use("/authorize", authorize);

export default router;
