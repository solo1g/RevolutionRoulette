import { useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";

const ActionNotif = ({
  gameId,
  connectedAddress,
  toastMessage,
}: {
  gameId: bigint;
  connectedAddress: string;
  toastMessage: (msg: string) => void;
}) => {
  useScaffoldEventSubscriber({
    contractName: "RevolutionRoulette",
    eventName: "GameLog",
    listener: logs => {
      logs.map(log => {
        const { gameId: eventGameId, actionBy, otherHit, wasLive } = log.args;

        if (gameId == undefined) return;

        if (eventGameId == gameId) {
          if (actionBy == connectedAddress) {
            toastMessage(
              `You ${otherHit ? "shot opponent" : "shot yourself"} with a ${wasLive ? "live" : "blank"} bullet`,
            );
          } else {
            toastMessage(
              `Opponent ${otherHit ? "shot you" : "shot himself"} with a ${wasLive ? "live" : "blank"} bullet`,
            );
          }
        }
      });
    },
  });

  return <></>;
};

export default ActionNotif;
