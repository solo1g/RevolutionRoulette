//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "hardhat/console.sol";

// ITEMS:
// 0 => blank
// 1 => painkillers (+1 hp)
// 2 => alcohol bottle (3x damage, 60% hit chance)
// 3 => opponent miss (50% hit chance)
// 4 => quickfire (2x damage, 90% hit chance)
// 5 => +2 live rounds
// 6 => +2 blank rounds
// 7 => cuffs (opponent skips next turn)
// 8 => thief's hand (steal first item from opponent)
// 9 => bulletproof vest (prevents being one shot)
// 10 => lock => disable opponent items for next turn
// 11 => weird fruit => double hp but can no longer use items
// 12 => magician's hand => swap live and blank rounds
// 13 => wynn cap => end the game immediately deciding a random winner
// 14 => system glitch => delete all items from both players
// 15 => system hack => delete all items from opponent

// EFFECTS:
// 0 => 50% hit chance
// 1 => one shot protection
// 2 => lock items
// 3 => can't use items ever

contract RevolutionRoulette {
	uint8 constant INVENTORY_SIZE = 4;
	uint8 constant ITEM_COUNT = 15;

	event GameLog(
		uint256 indexed gameId,
		address actionBy,
		bool otherHit,
		bool wasLive
	);
	event Challenge(address indexed to, address from, uint256 amount);
	event RecentGame(address indexed player, address with);

	struct Stats {
		uint32 wins;
		uint32 losses;
		uint256 moneyWon;
		uint256 moneyLost;
	}

	mapping(address => Stats) public stats;

	struct RngCommit {
		uint256 randNum;
		uint16 itemsToUse;
		uint8 target;
		uint256 block;
	}

	struct Player {
		uint8 health;
		uint8[INVENTORY_SIZE] items;
		uint8 effects;
	}

	struct GameState {
		// to not store the addresses we simply define turn = even parity => smaller address runs first
		// else larger address's turn
		// player 1 is always the smaller address player
		uint8 turn;
		uint8 liveRounds;
		uint8 blankRounds;
		uint8 status;
		uint256 betAmount;
		RngCommit commitedRandHash;
		Player player1;
		Player player2;
	}

	mapping(bytes32 => GameState) public games;

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
		return game;
	}

	modifier validTurn(address player2, uint8 reqStatus) {
		GameState storage game = getGame(msg.sender, player2);
		require(game.status == reqStatus, "Invalid action");

		if (game.turn == 0) {
			// the smaller address runs
			require(msg.sender < player2, "Not your turn");
		} else {
			require(msg.sender > player2, "Not your turn");
		}
		_;
	}

	function claimRewards(address player2) public validTurn(player2, 3) {
		bytes32 key = getGameId(msg.sender, player2);
		GameState storage game = games[key];

		stats[msg.sender].wins += 1;
		stats[player2].losses += 1;
		stats[msg.sender].moneyWon += game.betAmount;
		stats[player2].moneyLost += game.betAmount;

		// payout
		(bool success, ) = msg.sender.call{ value: game.betAmount }("");
		require(success, "Transfer failed.");

		game.status = 4;
	}

	function actionsCommit(
		address player2,
		uint16 itemsToUse,
		uint8 target,
		uint256 randNum
	) public validTurn(player2, 2) {
		GameState storage game = getGame(msg.sender, player2);

		// check if the player has the item in his iventory
		Player storage currentPlayer = game.turn == 0
			? game.player1
			: game.player2;

		for (uint8 i = 1; i <= ITEM_COUNT; i++) {
			if ((itemsToUse >> i) & 1 == 1) {
				bool found = false;
				for (uint8 j = 0; j < INVENTORY_SIZE; j++) {
					if (currentPlayer.items[j] == i) {
						found = true;
						currentPlayer.items[j] = 0;
						break;
					}
				}
				require(found, "Invalid items");
			}
		}

		// check if items are locked but used by player
		if ((currentPlayer.effects >> 2) & 1 == 1) {
			require(itemsToUse == 0, "Items locked in this turn");
		}
		if ((currentPlayer.effects >> 3) & 1 == 1) {
			require(itemsToUse == 0, "Items locked in this turn");
		}
		// commit the items
		game.commitedRandHash.itemsToUse = itemsToUse;
		game.commitedRandHash.block = block.number;
		game.commitedRandHash.randNum = randNum;
		game.commitedRandHash.target = target;
	}

	function actionsReveal(address player2) public validTurn(player2, 2) {
		bytes32 key = getGameId(msg.sender, player2);
		GameState storage game = games[key];
		require(game.commitedRandHash.block < block.number, "Block not mined");
		require(
			block.number < game.commitedRandHash.block + 250,
			"Block too old"
		);

		// player 1 is always the smaller address player
		Player storage currentPlayer = game.turn == 0
			? game.player1
			: game.player2;
		Player storage otherPlayer = game.turn == 0
			? game.player2
			: game.player1;

		uint8 damage = 1;
		uint32 hitChance = 100;

		// applying effects

		// bit 0
		if (currentPlayer.effects & 1 == 1) {
			// smoke bomb 50% hit chance effect
			hitChance = 50;
			currentPlayer.effects ^= 1;
		}
		// bit 1 (one shot protection) check later
		// bit 2 (lock items)
		if ((currentPlayer.effects >> 2) & 1 == 1) {
			// items checked in commit already
			currentPlayer.effects ^= 4;
		}
		// bit 3 (can't use items ever), no need to undo

		// get a random number
		uint256 random = uint256(
			keccak256(
				abi.encodePacked(
					game.commitedRandHash.randNum,
					blockhash(game.commitedRandHash.block)
				)
			)
		);
		uint256 slice;

		if ((game.commitedRandHash.itemsToUse >> 1) & 1 == 1) {
			// painkillers
			currentPlayer.health += 1;
		}
		if ((game.commitedRandHash.itemsToUse >> 2) & 1 == 1) {
			// alcohol bottle
			damage = 3;
			if (hitChance == 100) hitChance = 60;
		}
		if ((game.commitedRandHash.itemsToUse >> 3) & 1 == 1) {
			// opponent hit chance = 50
			otherPlayer.effects |= 1;
		}
		if ((game.commitedRandHash.itemsToUse >> 4) & 1 == 1) {
			// quickfire
			damage = 2;
			if (hitChance == 100) hitChance = 90;
		}
		if ((game.commitedRandHash.itemsToUse >> 5) & 1 == 1) {
			// +2 live rounds
			game.liveRounds += 2;
		}
		if ((game.commitedRandHash.itemsToUse >> 6) & 1 == 1) {
			// +2 blank rounds
			game.blankRounds += 2;
		}
		// 7 is cuffs check later
		if ((game.commitedRandHash.itemsToUse >> 8) & 1 == 1) {
			// thief's hand
			// steal first item from opponent
			uint8 itemToSteal;
			for (uint8 i = 0; i < INVENTORY_SIZE; i++) {
				if (otherPlayer.items[i] != 0) {
					itemToSteal = otherPlayer.items[i];
					otherPlayer.items[i] = 0;
					break;
				}
			}
			for (uint8 i = 0; i < INVENTORY_SIZE; i++) {
				if (currentPlayer.items[i] == 0) {
					currentPlayer.items[i] = itemToSteal;
					break;
				}
			}
		}
		if ((game.commitedRandHash.itemsToUse >> 9) & 1 == 1) {
			// bulletproof vest
			currentPlayer.effects |= 2;
		}
		if ((game.commitedRandHash.itemsToUse >> 10) & 1 == 1) {
			// lock
			otherPlayer.effects |= 4;
		}
		if ((game.commitedRandHash.itemsToUse >> 11) & 1 == 1) {
			// vitality apple
			currentPlayer.effects |= 8;
			currentPlayer.health *= 2;
		}
		if ((game.commitedRandHash.itemsToUse >> 12) & 1 == 1) {
			// magician's hand
			uint8 temp = game.liveRounds;
			game.liveRounds = game.blankRounds;
			game.blankRounds = temp;
		}
		if ((game.commitedRandHash.itemsToUse >> 13) & 1 == 1) {
			// wynn cap
			game.status = 3;
			// decide a random winner
			// 1 bit of randomness

			(random, slice) = _getBitSlice(random, 1);
			if (slice == 1) {
				// current player wins
				currentPlayer.health = 1;
				otherPlayer.health = 0;
			} else {
				// other player wins
				currentPlayer.health = 0;
				otherPlayer.health = 1;
			}

			game.turn = game.player1.health == 0 ? 1 : 0;
			return;
		}
		if ((game.commitedRandHash.itemsToUse >> 14) & 1 == 1) {
			// system glitch
			for (uint8 i = 0; i < INVENTORY_SIZE; i++) {
				currentPlayer.items[i] = 0;
				otherPlayer.items[i] = 0;
			}
		}
		if ((game.commitedRandHash.itemsToUse >> 15) & 1 == 1) {
			// system hack
			for (uint8 i = 0; i < INVENTORY_SIZE; i++) {
				otherPlayer.items[i] = 0;
			}
		}

		// decide if the shot hits target
		// 8 bit of randomness
		(random, slice) = _getBitSlice(random, 8);
		uint8 success = ((slice % 100) < hitChance) ? 1 : 0;

		(random, slice) = _getBitSlice(random, 8);
		uint totalBullets = game.liveRounds + game.blankRounds;
		bool isLive = (slice % totalBullets) < game.liveRounds;
		bool otherHit = (game.commitedRandHash.target ^ success) == 0;
		// target hit success if slice < hitChance
		// target 1 means other player

		// hit other player
		if (isLive) {
			if (otherHit) {
				if (otherPlayer.health >= damage) {
					otherPlayer.health -= damage;
				} else {
					// if one shot protection
					if ((otherPlayer.effects >> 1) & 1 == 1) {
						otherPlayer.health = 1;
						otherPlayer.effects ^= 2;
					} else {
						otherPlayer.health = 0;
					}
				}
				if (otherPlayer.health == 0) {
					// game over
					game.status = 3;
					return;
				}
			} else {
				// self hit
				if (currentPlayer.health >= damage) {
					currentPlayer.health -= damage;
				} else {
					// if one shot protection
					if ((currentPlayer.effects >> 1) & 1 == 1) {
						currentPlayer.health = 1;
						currentPlayer.effects ^= 2;
					} else {
						currentPlayer.health = 0;
					}
				}
				if (currentPlayer.health == 0) {
					// game over
					game.status = 3;
					return;
				}
			}
			game.liveRounds -= 1;
		} else {
			// blank round
			game.blankRounds -= 1;
		}

		// update the turn
		// if cuffs
		if (
			// shot a blank at self
			(!isLive && game.commitedRandHash.target == 0) ||
			// or used cuffs
			(game.commitedRandHash.itemsToUse >> 7) & 1 == 1
		) {
			// same guy's turn
		} else {
			game.turn ^= 1;
		}

		game.commitedRandHash.block = 0;

		// post reveal fixups
		if (game.liveRounds + game.blankRounds == 0) {
			// add fresh set of rounds
			(random, slice) = _getBitSlice(random, 3);
			game.liveRounds = uint8((slice % 4) + 1);

			// take 3 bits or randomness for blank rounds
			(random, slice) = _getBitSlice(random, 3);
			game.blankRounds = uint8((slice % 4) + 1);
		}

		// 25% chance to get 2 items
		(random, slice) = _getBitSlice(random, 2);
		if (slice == 0) {
			// giving 2 items to each player initially
			for (uint8 i = 0; i < 2; i++) {
				(random, slice) = _getBitSlice(random, 8);
				currentPlayer.items[i] = uint8((slice % ITEM_COUNT) + 1);
			}
			for (uint8 i = 0; i < 2; i++) {
				(random, slice) = _getBitSlice(random, 8);
				otherPlayer.items[i] = uint8((slice % ITEM_COUNT) + 1);
			}
		}

		emit GameLog(uint256(key), msg.sender, otherHit, isLive);
	}

	function newGameCommit(address player2, uint256 randNum) public payable {
		bytes32 gameId = getGameId(msg.sender, player2);
		GameState storage game = games[gameId];

		require(
			game.status == 0 ||
				game.status == 4 ||
				(game.status == 1 &&
					block.number > game.commitedRandHash.block + 260),
			"Game already exists"
		);

		// set turn to the other guy
		// even parity => smaller address's turn
		game.turn = msg.sender < player2 ? 1 : 0;
		game.commitedRandHash = RngCommit(randNum, 0, 0, block.number);
		game.betAmount = msg.value;
		game.status = 1;

		emit Challenge(player2, msg.sender, msg.value);
		emit RecentGame(msg.sender, player2);
		emit RecentGame(player2, msg.sender);
	}

	function newGameReveal(
		address player2
	) public payable validTurn(player2, 1) {
		bytes32 gameId = getGameId(msg.sender, player2);
		GameState storage game = games[gameId];
		require(game.commitedRandHash.block < block.number, "Block not mined");
		require(
			block.number < game.commitedRandHash.block + 250,
			"Block too old"
		);
		require(msg.value == game.betAmount, "Invalid bet amount");
		game.betAmount += msg.value;

		uint256 random = uint256(
			keccak256(
				abi.encodePacked(
					game.commitedRandHash.randNum,
					blockhash(game.commitedRandHash.block)
				)
			)
		);

		// we now have 256 bits of randomness now, more can be made using repeated sha3 (keccak256) of this
		game.player1.health = game.player2.health = 3;

		//items
		uint256 slice;
		// giving 2 items to each player initially
		for (uint8 i = 0; i < 2; i++) {
			(random, slice) = _getBitSlice(random, 8);
			game.player1.items[i] = uint8((slice % ITEM_COUNT) + 1);
		}
		for (uint8 i = 0; i < 2; i++) {
			(random, slice) = _getBitSlice(random, 8);
			game.player2.items[i] = uint8((slice % ITEM_COUNT) + 1);
		}

		// 1 bit or randomness for turn
		(random, slice) = _getBitSlice(random, 1);
		game.turn = uint8(slice);

		console.log(game.turn);
		console.log(msg.sender, player2, game.turn);
		console.log(msg.sender < player2);
		// the other player gets +1 hp
		if (game.turn == 0) {
			game.player2.health += 1;
		} else {
			game.player1.health += 1;
		}

		// number of live and blank rounds
		(random, slice) = _getBitSlice(random, 3);
		game.liveRounds = uint8((slice % 4) + 1);

		// take 3 bits or randomness for blank rounds
		(random, slice) = _getBitSlice(random, 3);
		game.blankRounds = uint8((slice % 4) + 1);

		game.commitedRandHash.block = 0;
		game.status = 2;
	}

	/// @dev extract a slice of bits from a number
	/// @param num number to be sliced
	/// @param bits count of bits to be sliced, starting from the right
	/// @return the remaning number and the sliced number
	function _getBitSlice(
		uint256 num,
		uint8 bits
	) private pure returns (uint256, uint256) {
		uint256 mask = (1 << bits) - 1;
		return (num >> bits, num & mask);
	}
}
