import { Router } from 'express';
import { createRequestTx, processTx, paymentAmounts, wallet } from "../lib/HPS/index.js";
import web3 from '@solana/web3.js';
import VSSI from "../lib/VSSI/index.js";
import crypto from 'crypto';
import { adminNonce, setAdminNonce } from '../data.js';
import fs from 'fs';

const router = Router();
const cluster = web3.clusterApiUrl('mainnet-beta');

var adminLoginKeyNum = 1;
var adminLoginKeyBuilder = '';
var pikey = '';
var aLogin = false;

const initiators = {
    'kt98ikeybZw2': 'c9cbf50dbd196e26ee947f8a10b5d850f8657bd5e1ddf9ded1de0659fa8f61c8',
    'dvs7ikey0lgA': 'c54d3034c687a70bc2e5e606277c10a0a23082951276904a33f9d3d0a173c349',
    'v5aOikeye4G9': '6156948b0cfdc7f9efd9be3cf8a8d564d9b05b68f0fc3007f3f11dd0a2c07f90'
}

const initiatorsName = {
    'kt98ikeybZw2': 'Keion',
    'dvs7ikey0lgA': 'Davee',
    'v5aOikeye4G9': 'Turtlee'
}

router.get('/:txid/:signature', (req, res) => {
    let txid = req.params.txid;
    let signature = req.params.signature;

    processTx(txid, signature)
    .then(result => {
        res.json(result);
    })
});

router.get('/create/:wA/:state/:type', (req, res) => {
    let wA = req.params.wA;
    let state = req.params.state;
    let type = req.params.type;

    if (!Object.keys(paymentAmounts).includes(type.toUpperCase())) {
        return res.json({
            error: true,
            message: 'Invalid payment type'
        });
    }

    let CRTX = createRequestTx(wA, state, type.toUpperCase());

    if (CRTX.state !== state) {
        return res.json({
            error: true,
            message: 'Invalid state'
        });
    } else if (CRTX.error) {
        return res.json({
            error: true,
            message: "Failed to create new transaction"
        });
    }

    res.json({
        error: false,
        state: state,
        txid: CRTX.txid,
        amount: CRTX.amount,
        house: CRTX.house
    });
});

router.get('/admin/pushKey/:key/:ikey', async (req, res) => {
    let key = req.params.key;
    let ikey = req.params.ikey;

    if (key === "null" || ikey === "null") { 
        return res.send();
    }

    let ending = "+";

    if (aLogin) {
        if (VSSI.SHA256.hash(key) === initiators[pikey]) {
            const NONCE = crypto.randomUUID().toString();
            res.send(`
            <h1>Solana Royale Wallet Admin Dashboard</h1>
            <span>Welcome to the wallet control dashboard, ${initiatorsName[pikey]}!</span>
            <script id="initScript">
                window.nonce = "${NONCE}";
                document.getElementById("initScript").remove();
            </script>
            <br><br>
            <span>Wallet Balance: ${await connection.getBalance(wallet().publicKey)} SOL</span><br>
            <span>Wallet Address: ${wallet().publicKey.toString()}</span>
            `)
            return setAdminNonce(NONCE);
        } else {
            pikey = '';
            adminLoginKeyNum = 1;
            adminLoginKeyBuilder = '';
            aLogin = false;
            return res.send('Invalid initiator key');
        }
    }

    if (pikey === '') {
        pikey = ikey;
    } else if (ikey !== pikey) {
        pikey = '';
        adminLoginKeyNum = 1;
        adminLoginKeyBuilder = '';
        aLogin = false;
        return res.send("IKey has been changed, as a result, the process has been reset. Please retry the login.")
    }

    if (adminLoginKeyNum === 3) {
        ending = "";
    } else if (adminLoginKeyNum === 4) {
        return res.send("Key is full");
    }

    adminLoginKeyBuilder += key + ending;
    adminLoginKeyNum++;

    if (adminLoginKeyNum === 4) {
        if (VSSI.SHA256.hash(adminLoginKeyBuilder) === "fcd5629b1dffdd43de9674ccde7dff7ae000e8b30ba73d7a30fe3b521b5b1d9f") {
            aLogin = true;
        } else {
            adminLoginKeyNum = 1;
            adminLoginKeyBuilder = '';
            aLogin = false;
            return res.send("Incorrect key sequence");
        }
    }

    res.send('Key submitted')
});

router.get('/admin', (req, res) => {
    res.send(`
        <h1>Solana Royale Wallet Admin ${aLogin === false ? "Login" : "Dashboard Login"}</h1>
        ${aLogin === false ? `
        <span>This login requires 3 keys arranged in the following order:</span>
        <ul>
            <li>Key #1 ${adminLoginKeyNum > 1 ? "(submitted)" : ""}</li>
            <li>Key #2 ${adminLoginKeyNum > 2 ? "(submitted)" : ""}</li>
            <li>Key #3 ${adminLoginKeyNum > 3 ? "(submitted)" : ""}</li>
        </ul>
        <input type="text" id="ikey" placeholder="Initiator Key"><br>
        <input type="text" id="key" placeholder="Enter Key #${adminLoginKeyNum !== 4 ? adminLoginKeyNum.toString() : (adminLoginKeyNum - 1).toString()}">
        <button onclick="submitKey()">Submit</button>
        <script>
            function submitKey() {
                var el = document.getElementById("key");
                fetch('/api/pay/admin/pushKey/' + el.value + '/' + document.getElementById("ikey").value)
                .then(() => {
                    location.reload();
                })
            }
        </script>
        ` : `
        <span>This login requires you to know the initiator key's login key</span><br>
        <input type="text" id="key" placeholder="Enter Key">
        <button onclick="submitKey()">Submit</button>
        <script>
            function submitKey() {
                var el = document.getElementById("key");
                location = '/api/pay/admin/pushKey/' + el.value + '/' + el.value
            }
        </script>
        `}
    `)
});

export default router;