import { useState } from "react";
import { AddressInput, EtherInput } from "../scaffold-eth";
import NeverRender from "../utils/NeverRender";
import { GameStage, GameState } from "./GameState";
import { formatEther, isAddress, parseEther } from "viem";

const GameSetup = ({
  state,
  player2,
  setPlayer2,
  onInitCommit,
  onInitReveal,
}: {
  state: GameState | undefined;
  player2: string;
  setPlayer2: (address: string) => void;
  onInitCommit: (player2: string, amount: bigint) => void;
  onInitReveal: () => void;
}) => {
  const [bet, setBet] = useState("");

  return (
    <div>
      <p className="font-bit text-2xl">Who to challenge?</p>
      <AddressInput onChange={setPlayer2} value={player2} placeholder="Input opponent address" />
      {!state || !isAddress(player2) ? null : state.stage == GameStage.InitCommit ? (
        <div className="mt-2">
          <EtherInput onChange={setBet} value={bet} placeholder="Input bet amount" />
          <button className="btn btn-secondary mt-4" onClick={() => onInitCommit(player2, parseEther(bet))}>
            Create game
          </button>
        </div>
      ) : state.stage == GameStage.InitReveal ? (
        state.isMyTurn ? (
          <div className="mt-2">
            <EtherInput onChange={setPlayer2} value={formatEther(state.betAmount)} disabled={true} />
            <button className="btn btn-secondary mt-4" onClick={onInitReveal}>
              Accept challenge
            </button>
          </div>
        ) : (
          <p>Waiting for opponent to accept...</p>
        )
      ) : (
        <NeverRender />
      )}
    </div>
  );
};

export default GameSetup;
