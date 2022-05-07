import { Router } from "express";
import bodyParser from "body-parser";
import fs from 'fs';

const router = Router();

router.use(bodyParser.json());

router.post('/', (req, res) => {
    var body = req.body;
    
    // TODO: Add verification based on env variables to verify requests
    
    if (body.type === "token") {
        if (!fs.existsSync('syncTokens')) {
            fs.writeFileSync('syncTokens', '');
        }
        fs.appendFileSync('syncTokens', body.data + '\n');
        return res.status(200).json({
            success: true,
        });
    } else if (body.type === "session") {
        if (!fs.existsSync('syncSessions')) {
            fs.writeFileSync('syncSessions', '');
        }
        fs.appendFileSync('syncSessions', body.data + '\n');
        return res.status(200).json({
            success: true,
        });
    } else if (body.type === "playCode") {
        if (!fs.existsSync('gamePlayCodes')) {
            fs.writeFileSync('gamePlayCodes', '');
        }
        if (!fs.readFileSync('gamePlayCodes').toString().includes(body.data))
            fs.appendFileSync('gamePlayCodes', body.data + '\n');
        return res.status(200).json({
            success: true,
        });
    }
});

export default router;
