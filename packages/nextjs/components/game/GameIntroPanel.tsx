import Challenges from "./RecentChallenges";

const GameIntroPanel = ({
  myAddress,
  setPlayer2,
}: {
  myAddress: string | undefined;
  setPlayer2: (address: string) => void;
}) => {
  return (
    <div className="flex-grow font-bit">
      <h1 className="text-4xl">Welcome,</h1>
      <p className="text-xl">
        Try your luck on revolution roulette.
        <br />
        No refunds lul.
        <br />
        <br />
        Enter the address of your opponent to start a new game.
        <br />
      </p>
      <div className="flex">
        <Challenges myAddress={myAddress} setPlayer2={setPlayer2} />
      </div>
    </div>
  );
};

export default GameIntroPanel;
