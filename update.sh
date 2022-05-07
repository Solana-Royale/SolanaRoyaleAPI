rm -r SolanaRoyaleAPI
git clone https://github.com/Solana-Royale/SolanaRoyaleAPI
cp wallet.dat SolanaRoyaleAPI/wallet.dat
cp privateKey.pem SolanaRoyaleAPI/privateKey.pem
cp publicKey.pem SolanaRoyaleAPI/publicKey.pem
cp sessionEq.pem SolanaRoyaleAPI/sessionEq.pem
cp sessionPwd.pem SolanaRoyaleAPI/sessionPwd.pem
cd SolanaRoyaleAPI
yarn run init
yarn start
