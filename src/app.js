import express from "express";
import { info } from "./utils/logger.js";
import cors from "cors";
import ws from "./utils/ws-init.js";
import { adminNonce } from "./data.js";
import web3 from '@solana/web3.js';
import { wallet } from "./lib/HPS/index.js";

const app = express();

import routes from "./routes/index.js";
import paths from "./paths/index.js";

const SERVER_PORT = 8080;

app.use(cors());

app.use("/api", routes);
app.use("/", paths);

var server = app.listen(SERVER_PORT, () => {
  info("Server started on port", SERVER_PORT);
});

var wsServer = await ws(server, '/api/pay/admin')

wsServer.on(
  "connection",
  function connection(websocketConnection, connectionRequest) {
    var authenticated = false;
    function send(json) {
      websocketConnection.send(JSON.stringify(json));
    }

    var connection = null;

    websocketConnection.on("message", async (message) => {
      try {
        const parsedMessage = JSON.parse(message);

        console.log(parsedMessage)
        
        if (parsedMessage.type === "2probe") {
          send({
            error: false,
            type: 'message',
            message: 'sendAuthToken'
          })
          return send({
            error: false,
            type: '3probe'
          })
        } else if (parsedMessage.type === "message") {
          if (parsedMessage.message === "getConnectionSettings") {
            return send({
              error: false,
              type: 'connectionSettings',
              connectionSettings: {
                pingInterval: 25e3,
              }
            })
          }
        } else if (parsedMessage.type === "keepalive") {
          return;
        } else if (parsedMessage.type === "authToken") {
          var nonce = parsedMessage.authToken;
          if (adminNonce === nonce) {
            authenticated = true;
            connection = new web3.Connection(
              RPCUrl,
              'confirmed',
            );
            send({
              error: false,
              type: 'message',
              message: 'Authenticated'
            })
          }
        } else if (parsedMessage.type === "walletControl") {
          var nonce = parsedMessage.authToken;
          if (adminNonce === nonce) {
            var command = parsedMessage.walletControl.command;

            if (command === "transfer") {
              var toAddress = parsedMessage.walletControl.to;
              var amount = parsedMessage.walletControl.amount;

              if (amount.toString().includes('.')) {
                amount = parseInt(web3.LAMPORTS_PER_SOL * parseFloat(amount));
              } else {
                amount = parseInt(amount);
              }

              var refund = new web3.Transaction().add(
								web3.SystemProgram.transfer({
                  fromPubkey: wallet().publicKey,
                  toPubkey: new web3.PublicKey(toAddress),
                  lamports: amount
								})
							);

              console.log(refund)
		
              try {
                var tx = web3.sendAndConfirmTransaction(
                  connection,
                  refund,
                  [wallet()]
                );
                console.log(tx)
              } catch {
                return send({
                  error: false,
                  type: 'walletResponse',
                  walletResponse: {
                    command: 'transfer',
                    result: 'error'
                  }
                })
              }
            }
          }
        }

        return send({
          error: true,
          type: 'message',
          message: 'Invalid message'
        });
      } catch (ex) {
        console.log(ex)
        websocketConnection.send(JSON.stringify({ error: true, message: 'Message parse failed' }));
      }
    });
  }
);