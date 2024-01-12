//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "hardhat/console.sol";

// what will the items be?
// blank item has id 0
// painkillers (increase health by 1)
// alcohol bottle (3x the damage 60 40 chance)
// smoke bomb (oppponent misses 50 50 chance)
// hacksaw (2x damage)
// 2 live rounds
// 2 blank rounds
// can only keep 4 items at max
// get 4 items every 3 turns (once you take it you have to use it)

// 256 bits
// items => 3 bits for each item, indicating its count

// vrf do we need it?
// suppose only choice is to shoot me or him and the round is random
// attack => didn't roll
// i'll use a commit reveal randomness method

// make turn an incremental uint8 u can do &1 for parity

contract ChainRoulette {
	uint8 constant INVENTORY_SIZE = 4;
	uint8 constant ITEM_COUNT = 6;

	struct RngCommit {
		uint256 randNum;
		uint8[INVENTORY_SIZE] itemsToUse;
		uint8 target;
		uint256 block;
	}

	struct Player {
		uint8 health;
		uint8[INVENTORY_SIZE] items;
	}

	struct GameState {
		// to not store the addresses we simply define turn = 0, the smaller address runs first,
		// turn = 1, the larger address runs first
		uint8 turn;
		uint8 liveRounds;
		uint8 blankRounds;
		RngCommit commitedRandHash;
		Player player1;
		Player player2;
	}

	mapping(bytes32 => GameState) public games;

	error GameDoesNotExist();

	constructor() {}

	function getGameId(
		address player1,
		address player2
	) public pure returns (bytes32) {
		if (player1 > player2) (player1, player2) = (player2, player1);
		return keccak256(abi.encodePacked(player1, player2));
	}

	function getGame(
		address player1,
		address player2
	) private view returns (GameState storage) {
		bytes32 key = getGameId(player1, player2);
		GameState storage game = games[key];
		if (game.commitedRandHash.block == 0) revert GameDoesNotExist();
		return game;
	}

	modifier validTurn(address player2) {
		GameState storage game = getGame(msg.sender, player2);
		// the smaller address runs
		if (game.turn == 0) {
			require(msg.sender < player2, "Not your turn");
		} else {
			require(msg.sender > player2, "Not your turn");
		}
		_;
	}

	function actionsCommit(
		address player2,
		uint8[4] calldata items,
		uint8 target,
		uint256 randNum
	) public validTurn(player2) {
		GameState storage game = getGame(msg.sender, player2);

		require(game.commitedRandHash.block != 0, "Game does not exist");

		// commit the items
		// is it better if I do like RngCommit?
		game.commitedRandHash.itemsToUse = items;
		game.commitedRandHash.block = block.number;
		game.commitedRandHash.randNum = randNum;
		game.commitedRandHash.target = target;
	}

	function actionsRevea(
		address player2,
		uint8[] calldata items
	) public validTurn(player2) {
		GameState storage game = getGame(msg.sender, player2);
		// player 1 is always the smaller player
		Player storage currentPlayer = game.turn == 0
			? game.player1
			: game.player2;
		Player storage otherPlayer = game.turn == 0
			? game.player2
			: game.player1;

		// use those items
		for (uint8 i = 0; i < items.length; i++) {
			if (items[i] == 0) continue;

			bool exists = false;
			for (uint8 j = 0; j < INVENTORY_SIZE; j++) {
				if (currentPlayer.items[j] == items[i]) {
					currentPlayer.items[j] = 0;
					exists = true;
					break;
				}
			}

			require(exists, "Invalid params: Item does not exist in inventory");
		}

		uint8 dmgMultiplier = 1;
		uint32 hitChanceMultiplier = 100;

		// apply effects for the items
		for (uint8 i = 0; i < items.length; i++) {
			uint8 item = items[i];
			if (item == 0) continue;

			if (item == 1) {
				// painkillers ( +1 health )
				currentPlayer.health += 1;
			} else if (item == 2) {
				// alcohol bottle ( 3x damage hit chance is x0.6 )
				dmgMultiplier *= 3;
				hitChanceMultiplier = ((hitChanceMultiplier * 60) / 100);
			} else if (item == 3) {
				// smoke bomb ( opponent miss chance x0.5)
				hitChanceMultiplier = ((hitChanceMultiplier * 50) / 100);
			} else if (item == 4) {
				// hacksaw ( 2x damage )
				dmgMultiplier *= 2;
			} else if (item == 5) {
				// live round
				game.liveRounds += 2;
			} else if (item == 6) {
				// blank round
				game.blankRounds += 2;
			}
		}

		// get a random number
		uint256 random = uint256(
			keccak256(
				abi.encodePacked(
					game.commitedRandHash.randNum,
					blockhash(game.commitedRandHash.block)
				)
			)
		);

		// decide if the shot hits
		// 8 bit of randomness
		uint256 slice;
		(random, slice) = _getBitSlice(random, 8);
		uint8 success = ((slice % 100) < hitChanceMultiplier) ? 1 : 0;

		// target hit success if slice < hitChance

		// hit other player
		if ((game.commitedRandHash.target ^ success) == 0) {
			if (otherPlayer.health >= dmgMultiplier) {
				otherPlayer.health -= dmgMultiplier;
			} else {
				otherPlayer.health = 0;
				// there will be a claim function
				// 2 more modifiers a valid gamea and an ongoing game
			}
		} else {
			// self hit
			if (currentPlayer.health >= dmgMultiplier) {
				currentPlayer.health -= dmgMultiplier;
			} else {
				currentPlayer.health = 0;
			}
		}

		// update the turn
		game.turn = (game.turn + 1) % 2;
	}

	function newGameCommit(address player2, uint256 randNum) public {
		bytes32 gameId = getGameId(msg.sender, player2);

		GameState storage game = games[gameId];
		require(game.commitedRandHash.block == 0, "Game already exists");

		// can I not init zeros?
		game.commitedRandHash = RngCommit(
			randNum,
			[0, 0, 0, 0],
			0,
			block.number
		);
	}

	function newGameReveal(address player2) public {
		bytes32 gameId = getGameId(msg.sender, player2);

		GameState storage game = games[gameId];

		require(game.commitedRandHash.block != 0, "Game does not exist");
		require(game.commitedRandHash.block < block.number, "Block not mined");
		require(
			block.number < game.commitedRandHash.block + 250,
			"Block too old"
		);

		uint256 random = uint256(
			keccak256(
				abi.encodePacked(
					game.commitedRandHash.randNum,
					blockhash(game.commitedRandHash.block)
				)
			)
		);

		console.log("random", random);

		// we now have 256 bits of randomness now, more can be made using repeated sha3 (keccak256) of this

		// turn need 1 bit of randomness
		game.player1.health = game.player2.health = 4;

		// decide the items
		// 2xINVENTORY_SIZE itesm needed, let each item be from 8 bits of randomness
		// 256 - 2*4*8 = 192 bits left

		uint256 slice;
		for (uint8 i = 0; i < INVENTORY_SIZE; i++) {
			(random, slice) = _getBitSlice(random, 8);
			// right not equal chance for each item
			// TODO: change this ig
			game.player1.items[i] = uint8((slice % ITEM_COUNT) + 1);
		}
		for (uint8 i = 0; i < INVENTORY_SIZE; i++) {
			(random, slice) = _getBitSlice(random, 8);
			game.player2.items[i] = uint8((slice % ITEM_COUNT) + 1);
		}

		// 1 bit or randomness for turn
		(random, slice) = _getBitSlice(random, 1);
		game.turn = uint8(slice);

		// number of live and blank rounds
		game.liveRounds = 7; // min number needed to kill atleast one person, ensures game ends

		// take 3 bits or randomness for blank rounds
		(random, slice) = _getBitSlice(random, 3);
		game.blankRounds = 7 + uint8(slice);
	}

	function _getBitSlice(
		uint256 num,
		uint8 bits
	) private pure returns (uint256, uint256) {
		uint256 mask = (1 << bits) - 1;
		console.log("slice: ", bits, " ", num & mask);
		return (num >> bits, num & mask);
	}
}

// I committed say 1
// I make the choice of items frst and a random number and commit that
// then the reveal will generate a random number so the effects are applied on the reveal part
// so the when you decide to use item, all that should be added to the game state
// so 1 move is select items also who to shoot

// only after the actions with the random number are commited already, can the commit reveal be done
// can commit random number and items at the same time

// flow
// need a random no to decide initial items, decide who shoots first and no of live and blank rounds
// so one guy creates the game
// creation required commmitment of random no, address of other player, challender address is stored too
// Once he clicks on reveal, the game is created and the ui is populated
// then the player commits a random number and the items he wants to use and who to shoot
// There is a button (Load shotgun) which will do the commit and then shoot (which does the reveal)
// thus the game is complete

// step 1 is commit reveal for game creation
