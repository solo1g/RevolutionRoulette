"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type { NextPage } from "next";
import toast from "react-hot-toast";
import { formatEther, isAddress } from "viem";
import { useAccount } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import ActionNotif from "~~/components/game/ActionNotif";
import GameIntroPanel from "~~/components/game/GameIntroPanel";
import GameSetup from "~~/components/game/GameSetupCommitReveal";
import { GameStage, GameState } from "~~/components/game/GameState";
import Health from "~~/components/game/Health";
import Item from "~~/components/game/Item";
import { Address as AddressComp } from "~~/components/scaffold-eth";
import random256bit from "~~/components/utils/random256bit";
import { useScaffoldContractRead, useScaffoldContractWrite, useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const searchParams = useSearchParams();
  const player2params = searchParams.get("player2");
  const [player2, setPlayer2] = useState(player2params ?? "");

  useEffect(() => {
    if (player2params && isAddress(player2params)) {
      setPlayer2(player2params);
    }
  }, [player2params]);

  const { writeAsync: newGameCommit } = useScaffoldContractWrite({
    contractName: "RevolutionRoulette",
    functionName: "newGameCommit",
    args: [undefined, undefined],
  });

  const { writeAsync: newGameReveal } = useScaffoldContractWrite({
    contractName: "RevolutionRoulette",
    functionName: "newGameReveal",
    args: [undefined],
    onBlockConfirmation: txnReceipt => {
      console.log("Reveal transaction confirmed", txnReceipt);
      console.log("Transaction blockHash", txnReceipt.blockHash);
    },
  });

  const { address: connectedAddress } = useAccount();

  const { data: gameId } = useScaffoldContractRead({
    contractName: "RevolutionRoulette",
    functionName: "getGameId",
    args: [connectedAddress, player2 ?? undefined],
    enabled: isAddress(player2 ?? ""),
    watch: true,
    onSuccess: (data: any) => {
      console.log("got gameid", data);
    },
  });

  const [gameState, setGameState] = useState<GameState | undefined>();

  useScaffoldContractRead({
    contractName: "RevolutionRoulette",
    functionName: "games",
    args: [gameId],
    enabled: !!gameId,
    watch: true,
    onSuccess: (data: any) => {
      console.log(data);
      setGameState(
        new GameState(
          data[0],
          data[1],
          data[2],
          data[3],
          data[4],
          data[5],
          data[6],
          data[7],
          connectedAddress as string,
          player2,
        ),
      );
    },
  });

  const { writeAsync: actionsCommit } = useScaffoldContractWrite({
    contractName: "RevolutionRoulette",
    functionName: "actionsCommit",
    args: [undefined, undefined, undefined, undefined],
    onBlockConfirmation: txnReceipt => {
      console.log("Commit transaction confirmed", txnReceipt);
      console.log("Transaction blockHash", txnReceipt.blockHash);
    },
  });

  const { writeAsync: actionsReveal } = useScaffoldContractWrite({
    contractName: "RevolutionRoulette",
    functionName: "actionsReveal",
    args: [undefined],
    onBlockConfirmation: txnReceipt => {
      console.log("Reveal transaction confirmed", txnReceipt);
      console.log("Transaction blockHash", txnReceipt.blockHash);
    },
  });

  const { writeAsync: claim } = useScaffoldContractWrite({
    contractName: "RevolutionRoulette",
    functionName: "claimRewards",
    args: [undefined],
  });

  useScaffoldEventSubscriber({
    contractName: "RevolutionRoulette",
    eventName: "Challenge",
    listener: logs => {
      logs.map(log => {
        // chall to player 2 from player1
        const { to, from, amount } = log.args;
        if (!to || !from) return;

        if (to == connectedAddress) {
          toast.custom(
            t => (
              <div className="bg-base-300 ring-4 p-4 rounded-xl">
                <p className="text-md text-center">
                  You have been challenged by {from} for {formatEther(amount ?? 0n)} ETH
                </p>
                <button
                  className="btn btn-secondary mt-1"
                  onClick={() => {
                    setPlayer2(from);
                    toast.dismiss(t.id);
                  }}
                >
                  Accept
                </button>
                <button
                  className="btn btn-secondary mt-1 ml-2"
                  onClick={() => {
                    toast.dismiss(t.id);
                  }}
                >
                  X
                </button>
              </div>
            ),
            { duration: 3000 },
          );
        }
      });
    },
  });

  const [itemSelected, setItemSelected] = useState([false, false, false, false]);

  function onInitCommit(player2: string, amount: bigint) {
    newGameCommit({ args: [player2, random256bit()], value: amount });
  }

  function onInitReveal() {
    if (!gameState) {
      console.error("gameState is undefined in onInitReveal");
      return;
    }
    newGameReveal({ args: [player2], value: gameState.betAmount });
  }

  if (!gameState || gameState.stage == GameStage.InitCommit || gameState.stage == GameStage.InitReveal) {
    return (
      <>
        <MetaHeader />
        <div className="mx-8 mt-12 shadow-lg p-8 bg-base-100 rounded-xl font-bit flex flex-col md:flex-row">
          <GameIntroPanel myAddress={connectedAddress} setPlayer2={setPlayer2} />
          <div className="md:w-2/5">
            <GameSetup
              state={gameState}
              player2={player2}
              setPlayer2={setPlayer2}
              onInitCommit={onInitCommit}
              onInitReveal={onInitReveal}
            />
          </div>
        </div>
      </>
    );
  }

  const itemGrid = (items: number[], disabled: boolean) => {
    return (
      <div className="bg-base-100 shadow-xl p-4 rounded-2xl px-8">
        <p className="text-2xl text-center">Inventory</p>
        <div className="grid grid-cols-2 gap-4">
          {items.map((item, index) => (
            <Item
              key={index}
              id={item}
              selected={disabled ? false : itemSelected[index]}
              onClick={() => {
                if (disabled) return;
                const newItemSelected = [...itemSelected];
                newItemSelected[index] = !newItemSelected[index];
                setItemSelected(newItemSelected);
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  const getItemsEncoded = () => {
    let ret = 0;
    for (let i = 0; i < 4; i++) {
      if (itemSelected[i]) {
        ret |= 1 << gameState.myPlayerData.items[i];
      }
    }

    return ret;
  };

  if (gameState.stage == GameStage.End) {
    const image = gameState.amIWinner ? "/forsenCheer.webp" : "/forsenLaughingAtYou.webp";
    return (
      <div className="mt-8 flex flex-col items-center font-bit">
        <Image alt="W" src={image} height={256} width={256} />
        <p className="text-center text-2xl">
          You {gameState.amIWinner ? "won" : "lost"} {formatEther(gameState.betAmount)} ETH
        </p>
        {gameState.amIWinner ? (
          <button
            className="btn btn-secondary mt-4"
            onClick={() => {
              claim({ args: [gameState.opponentAddress] });
            }}
          >
            Claim
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="font-bit mt-16">
      {gameId != undefined && connectedAddress != undefined ? (
        <ActionNotif
          gameId={BigInt(gameId)}
          connectedAddress={connectedAddress}
          toastMessage={(msg: string) => toast(msg)}
        />
      ) : null}
      <div className="flex flex-col md:flex-row justify-around ">
        <div className="flex flex-col items-center space-y-2">
          <AddressComp address={gameState.myAddress} size="3xl" format="short" />
          <Health health={gameState.myPlayerData.health} />
          <div className="flex">{itemGrid(gameState.myPlayerData.items, false)}</div>
          {gameState.isMyTurn && !gameState.isCommited ? (
            <button
              className="btn btn-secondary mt-4"
              onClick={() => {
                actionsCommit({
                  args: [gameState.opponentAddress, getItemsEncoded(), 0, random256bit()],
                });
                setItemSelected([false, false, false, false]);
              }}
            >
              Fire
            </button>
          ) : null}
        </div>
        <div className="flex flex-col text-center">
          <p className="text-4xl">Vs</p>
          <p>Live Rounds : {gameState.liveRounds}</p>
          <p>Blank Rounds : {gameState.blankRounds}</p>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <AddressComp address={gameState.opponentAddress} size="3xl" format="short" />
          <Health health={gameState.opponentPlayerData.health} />
          <div className="flex">{itemGrid(gameState.opponentPlayerData.items, true)}</div>
          {gameState.isMyTurn && !gameState.isCommited ? (
            <button
              className="btn btn-secondary"
              onClick={() => {
                actionsCommit({
                  args: [gameState.opponentAddress, getItemsEncoded(), 1, random256bit()],
                });
                setItemSelected([false, false, false, false]);
              }}
            >
              Fire
            </button>
          ) : null}
        </div>
      </div>
      {!gameState.isMyTurn ? (
        <p className="text-center text-xl">Waiting for opponent move...</p>
      ) : (
        <p className="text-center text-xl">Shooting a blank at yourself does not change turn</p>
      )}
      {gameState.isMyTurn && gameState.isCommited ? (
        <div className="flex justify-center">
          <button
            className="btn btn-secondary mt-4"
            onClick={() => {
              actionsReveal({ args: [gameState.opponentAddress] });
            }}
          >
            Reveal
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default Home;
