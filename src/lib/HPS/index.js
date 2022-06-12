const fetch = require('node-fetch');
const prompt = require('readline-sync');
const web3 = require('@solana/web3.js');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const atob = require('atob');
const btoa = require('btoa');
const fs = require('fs');
const base58 = require('bs58');

var payment = {
	BET005: 0.05,
	BET01: 0.1,
	BET05: 0.5,
	BET1: 1,
}

connection = new web3.Connection(
	web3.clusterApiUrl('mainnet-beta'),
	'confirmed',
);

function encrypt(algorithm, password, text, cb) {
	crypto.scrypt(password, 'salt', 24, (err, key) => {
	 if (err) throw err;
	 // After that, we will generate a random iv (initialization vector)
	 crypto.randomFill(new Uint8Array(16), (err, iv) => {
		if (err) throw err;

		// Create Cipher with key and iv
		const cipher = crypto.createCipheriv(algorithm, key, iv);

		let encrypted = '';
		cipher.setEncoding('hex');

		cipher.on('data', (chunk) => encrypted += chunk);
		cipher.on('end', () => {
			var json = {}
			json.e = btoa(encrypted)
			json.i = btoa(iv.toString())
			json.a = btoa(algorithm)
			cb(btoa(JSON.stringify(json)))
		});

		cipher.write(text);
		cipher.end();
	 });
	});
}

function decrypt(algorithm, password, encrypted, iv, cb) {
	const key = crypto.scryptSync(password, 'salt', 24);

	// Create decipher with key and iv
	const decipher = crypto.createDecipheriv(algorithm, key, iv);
	
	decipher.setAutoPadding(false);

	let decrypted = '';
	decipher.on('readable', () => {
		while (null !== (chunk = decipher.read())) {
			decrypted += chunk.toString('utf8');
		}
	});
	
	decipher.on('end', () => {
		cb(decrypted)
	});

	// Encrypted with same algorithm, key and iv.
	decipher.write(encrypted, 'hex');
	try {
		decipher.end();
	} catch {
		cb('pp')
	}
}

/*
encrypt('aes-192-cbc', 'VingaIsCool', 'testing', d => {
	json = JSON.parse(atob(d))
	decrypt(atob(json.a), 'VingaIsCool', atob(json.e), Uint8Array.from(atob(json.i).split(',')), r => {
		console.log(r)
	})
})*/

module.exports = {
	createRequestTx: requestTx,
	processTx: isTxSent,
	paymentAmounts: payment,
	wallet: getWallet,
	payoutWinnings: payoutWinnings,
}

var txids = {};
var completeTxids = {};
var wallet = null;

function getWallet() {
	return wallet;
}

function markTxAsComplete(sig) {
	try {
		fs.appendFileSync('completedTx', sig + "\n")
	} catch (e) {
		console.log("Failed to mark tx as complete, error:", e);
	}
}

function addGamePlayCode() {
	var code = Math.floor(Math.random() * 1000000).toString();
	try {
		fs.appendFileSync('gamePlayCodes', code + "\n")
	} catch (e) {
		console.log("Failed to mark tx as complete, error:", e);
	}
	return code;
}

function hasTxBeenCompleted(sig) {
	try {
		return fs.readFileSync('completedTx').toString().includes(sig)
	} catch (e) {
		return false
	}
}

function voidGame(txid) {
	if (!Object.keys(completeTxids).includes(txid)) {
		return {
			error: true,
			message: "Transaction not found"
		}
	}
	console.log("Voiding transaction", txid)
	delete completeTxids[txid];
}

function payoutWinnings(txid) {
	if (!Object.keys(completeTxids).includes(txid)) {
		return {
			error: true,
			message: "Transaction not found"
		}
	}
	var tx = completeTxids[txid];
	if (tx.status == 'complete') {
		var payout = new web3.Transaction().add(
			web3.SystemProgram.transfer({
				fromPubkey: wallet.publicKey,
				toPubkey: new web3.PublicKey(tx.walletAddress),
				lamports: (tx.amount * 2) * web3.LAMPORTS_PER_SOL,
			})
		);

		console.log("Sending " + tx.amount.toString() + " SOL payout to:", tx.walletAddress);
		web3.sendAndConfirmTransaction(
			connection,
			payout,
			[wallet]
		);

		return {
			error: false,
			txid: txid,
			amount: tx.amount,
			status: tx.status,
			state: tx.state,
			house: wallet.publicKey.toString()
		};
	} else {
		return {
			error: true,
			message: "Transaction not complete",
			txid: txid,
			amount: tx.amount,
			status: tx.status,
			state: tx.state,
			house: wallet.publicKey.toString()
		};
	}
}

(async () => {
	if (!fs.existsSync('wallet.dat')) {
		console.log('Create Solana wallet\n----------------------------\n');
		
		const pass = "P$6sgd&5#CBbc4ix6yL6tChG"
		const secret = "";

		let bytes = Uint8Array.from(base58.decode(secret));
		
		skArray = btoa(bytes.toString().split(", ")).toString()
		encrypt('aes-192-cbc', pass, skArray, d => {
			fs.writeFileSync('wallet.dat', d)
			base()
		})
	} else {
		base()
	}
	
	async function base() {
		function decryptWallet() {
			var walletData = JSON.parse(atob(fs.readFileSync('wallet.dat').toString()));
			//const pass = prompt.question('Wallet Password: ', {hideEchoBack: true});
			pass = "P$6sgd&5#CBbc4ix6yL6tChG"
			decrypt(atob(walletData.a), pass, atob(walletData.e), Uint8Array.from(atob(walletData.i).split(',')), r => {
				try {
					main(web3.Keypair.fromSecretKey(Uint8Array.from(atob(r).split(','))))
				} catch (e) {
					console.log("Failed to decrypt wallet, error:", e);
				}
			})
		}
		decryptWallet()
		
		async function main(mWallet) {
			wallet = mWallet;
			async function overview() {
				try {
					var balance = await connection.getBalance(wallet.publicKey);
					if (isNaN(balance / web3.LAMPORTS_PER_SOL)) {
						overview();
					} else {
						display();
					}
				} catch {
					connection = new web3.Connection(
						web3.clusterApiUrl('mainnet-beta'),
						'confirmed',
					);
					setTimeout(() => {
						overview();
					}, 1000);
				}
				
				function display() {
					console.log("House wallet loaded")
					console.log('Balance:', `${balance / web3.LAMPORTS_PER_SOL} SOL`);
					console.log('Address:', wallet.publicKey.toString());
				}
			}
			
			overview()
		}
	}
})();

function requestTx(wA, state, type) {
	var txid = uuidv4().split('-').join('');
	txids[txid] = {
		walletAddress: wA,
		status: 'waiting',
		timestamp: new Date().getTime(),
		amount: payment[type],
		type: 'INIT_PURCHASE'
	}
	return {
		error: false,
		txid: txid,
		amount: txids[txid].amount,
		status: txids[txid].status,
		state: state,
		house: wallet.publicKey.toString()
	};
}

async function isTxSent(txid, signature) {
	try {
		if (Object.keys(txids).includes(txid)) {
			var requestData = {
				"jsonrpc": "2.0",
				"id": 1,
				"method": "getTransaction",
				"params": [
				 signature,
				 "jsonParsed"
				]
			 }
			var tx = await fetch(web3.clusterApiUrl('mainnet-beta'), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestData),
			});
			tx = await tx.json();
			tx = tx.result;
			var transactionAmount = tx.transaction.message.instructions[0].parsed.info.lamports / web3.LAMPORTS_PER_SOL;
			if (tx.transaction.message.instructions[0].parsed.info.destination == wallet.publicKey.toString()) {
				if (!hasTxBeenCompleted(signature)) {
					markTxAsComplete(signature);
					if (transactionAmount == txids[txid].amount) {
						txids[txid].status = "complete";
						completeTxids[txid] = JSON.parse(JSON.stringify(txids[txid]));
						delete txids[txid];

						return {
							error: false,
							message: 'Transaction recieved',
							playCode: addGamePlayCode(),
						};
					} else if (transactionAmount < txids[txid].amount) {
						setTimeout(() => {
							var deduction = 1000;
							if (parseInt(tx.transaction.message.instructions[0].parsed.info.lamports) - deduction < 0) {
								deduction = 0;
							}
							console.log("Refunding " + (parseInt(tx.transaction.message.instructions[0].parsed.info.lamports) - deduction) + " lamports to " + txids[txid].walletAddress)
							var refund = new web3.Transaction().add(
								web3.SystemProgram.transfer({
								fromPubkey: wallet.publicKey,
								toPubkey: new web3.PublicKey(txids[txid].walletAddress),
								lamports: (parseInt(tx.transaction.message.instructions[0].parsed.info.lamports) - deduction)
								})
							);
		
							web3.sendAndConfirmTransaction(
								connection,
								refund,
								[wallet]
							);

							delete txids[txid];
						}, 500);

						return {
							error: true,
							message: 'Invalid transaction amount, refunding payment+' + transactionAmount.toString() + ' ' + txids[txid].amount.toString(),
						};
					} else if (transactionAmount > txids[txid].amount) {
						setTimeout(() => {
							try {
								console.log("Refunding " + parseInt(((tx.transaction.message.instructions[0].parsed.info.lamports / web3.LAMPORTS_PER_SOL) - txids[txid].amount) * web3.LAMPORTS_PER_SOL) + " lamports to " + txids[txid].walletAddress)
								var refund = new web3.Transaction().add(
									web3.SystemProgram.transfer({
									fromPubkey: wallet.publicKey,
									toPubkey: new web3.PublicKey(txids[txid].walletAddress),
									lamports: parseInt(((tx.transaction.message.instructions[0].parsed.info.lamports / web3.LAMPORTS_PER_SOL) - txids[txid].amount) * web3.LAMPORTS_PER_SOL)
									})
								);
			
								web3.sendAndConfirmTransaction(
									connection,
									refund,
									[wallet]
								);

								txids[txid].status = "complete";
								completeTxids[txid] = JSON.parse(JSON.stringify(txids[txid]));
								delete txids[txid];

								return {
									error: false,
									message: 'Refunding extra funds',
									playCode: addGamePlayCode(),
								};
							} catch (e) {
								console.log(e);
								delete txids[txid];
								return {
									error: true,
									message: 'Failed to refund extra funds. Please contact support.'
								};
							}
						}, 500);
					}
				} else {
					delete txids[txid];

					return {
						error: true,
						message: 'Duplicate transaction'
					};
				}
			} else {
				return {
					error: true,
					message: 'Invalid transaction recipient',
				};
			}
		} else {
			return {
				error: true,
				message: 'Invalid transaction ID',
			};
		}
	} catch (e) {
		console.log(e);
		var retry = true;
		var message = "Transaction confirmation failed";
		if (e.toString().includes('signature must be base58 encoded')) {
			message = "Invalid transaction signature";
			retry = false;
		}
		return {
			error: true,
			message: message,
			retry: retry
		};
	}
}