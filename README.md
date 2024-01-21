# 🎲 Revolution Roulette

> Challenge others (possibly with some optimism on the line 🤑) and try your luck. The game gives you some items and a gun with some live and blank rounds. Use them effectively to remain alive and win the game 😎.

* [Try](https://revolution-roulette.vercel.app/) it out.
* Contract deployed on optimism [here](https://optimistic.etherscan.io/address/0xd89BFE521162F404881F3ec5715A8B3620A2B7B3)
* 🚀 Built with [Scaffold-Eth](https://scaffoldeth.io/)

## ⛹️‍♂️ How to Play?
* Enter the address of your opponent along with some bet.
* The opponent then needs to "accept" the challenge paying the same amount.
* Some random player is chosen to take the first shot. Don't worry the other player gets +1 ❤️ to compensate for the disadvantage.
* Items are given from time to time (there's a 25% chance each turn), aim is to get the opponent's hp to 0.

# 👷‍♂️ Building locally

* Install dependencies with `yarn install`
* `yarn chain` to start the local hardhat chain
* On a second terminal, `yarn deploy` to deploy your contract to the local chain
* On a third one, `yarn start` to start the nextjs app

# ☁️ Deploying
* Set up the required env variables in `.env` file. See `.env.example` for reference.
* Change the `defaultNetwork` in `packages/hardhat/hardhat.config.js` to your target network.
* Also make similar change in `packages/nextjs/scaffold.config.ts` to change `targetNetworks` for the frontend.
* `yarn deploy` to deploy the contract to the network.
* (Optional) `yarn verify` to verify the contract on etherscan.
* `yarn vercel --prod` to deploy using vercel.