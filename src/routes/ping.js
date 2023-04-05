import { Router } from "express";

const router = Router();

router.get('/', (req, res) => {
    console.log("Client sent discovery pong")
    res.send("pong");
});

export default router;