"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { NextPage } from "next";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

type RngCommit = {
  randNum: bigint;
  itemsToUse: number[];
  target: number;
  block: bigint;
};

type Player = {
  health: number;
  items: number[];
};
class GameState {
  readonly turn: number;
  readonly liveRounds: number;
  readonly blankRounds: number;
  readonly rngCommit: RngCommit;
  readonly player1: Player;
  readonly player2: Player;

  constructor(
    turn: number,
    liveRounds: number,
    blankRounds: number,
    rngCommit: RngCommit,
    player1: Player,
    player2: Player,
  ) {
    this.turn = turn;
    this.liveRounds = liveRounds;
    this.blankRounds = blankRounds;
    this.rngCommit = rngCommit;
    this.player1 = player1;
    this.player2 = player2;
  }

  toString() {
    return `
    Turn: ${this.turn}
    Live Rounds: ${this.liveRounds}
    Blank Rounds: ${this.blankRounds}
    `;
  }
}

const Home: NextPage = () => {
  const searchParams = useSearchParams();
  const player2params = searchParams.get("player2");
  const [player2, setPlayer2] = useState(player2params);

  useEffect(() => {
    if (player2params && isAddress(player2params)) {
      setPlayer2(player2params);
    }
  }, [player2params]);

  console.log("player2", searchParams.get("player2"));

  const { writeAsync } = useScaffoldContractWrite({
    contractName: "ChainRoulette",
    functionName: "newGameCommit",
    args: [undefined, undefined],
    onBlockConfirmation: txnReceipt => {
      console.log("Commit transaction confirmed", txnReceipt);
      console.log("Transaction blockHash", txnReceipt.blockHash);
    },
  });

  const { writeAsync: revealWriteAsync } = useScaffoldContractWrite({
    contractName: "ChainRoulette",
    functionName: "newGameReveal",
    args: [undefined],
    onBlockConfirmation: txnReceipt => {
      console.log("Reveal transaction confirmed", txnReceipt);
      console.log("Transaction blockHash", txnReceipt.blockHash);
    },
  });

  const { address: connectedAddress } = useAccount();

  const { data: gameId } = useScaffoldContractRead({
    contractName: "ChainRoulette",
    functionName: "getGameId",
    args: [connectedAddress, player2 ?? undefined],
    enabled: isAddress(player2 ?? ""),
    watch: true,
  });

  const [gameState, setGameState] = useState<GameState>();

  useScaffoldContractRead({
    contractName: "ChainRoulette",
    functionName: "games",
    args: [gameId],
    enabled: !!gameId,
    watch: true,
    onSuccess: (data: any) => {
      setGameState(new GameState(data[0], data[1], data[2], data[3], data[4], data[5]));
    },
  });

  if (gameState) {
    return <>{gameState.toString()}</>;
  }

  if (player2 && isAddress(player2)) {
    return (
      <>
        <MetaHeader />
        <div className="mx-8 mt-8 shadow-lg p-8 bg-base-100 ring-4 rounded-xl">
          <div>
            <p>Player 2 address: {player2}</p>
            <p>{gameId}</p>
            <button
              onClick={() => {
                revealWriteAsync({ args: [player2] });
              }}
            >
              reveal
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MetaHeader />
      <div className="mx-8 mt-8 shadow-lg p-8 bg-base-100 ring-4 rounded-xl">
        <div>
          <form
            onSubmit={async e => {
              e.preventDefault();

              const formData = new FormData(e.target as HTMLFormElement);
              const p2 = formData.get("player2") as string;
              if (p2 && isAddress(p2)) {
                setPlayer2(p2);
                writeAsync({ args: [p2, BigInt(1)] });
              } else {
                alert("Please enter a valid player 2 address");
              }
            }}
          >
            <label>
              Player 2 {player2}
              <input
                type="text"
                placeholder="Player 2 address"
                name="player2"
                className="input input-bordered input-info w-full max-w-xs ml-4"
              />
            </label>
            <input type="submit" value="Submit" />
          </form>
        </div>
      </div>
    </>
  );
};

export default Home;
