import { Address } from "../scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const Challenges = ({
  myAddress,
  setPlayer2,
}: {
  myAddress: string | undefined;
  setPlayer2: (address: string) => void;
}) => {
  const { data: events } = useScaffoldEventHistory({
    contractName: "RevolutionRoulette",
    eventName: "RecentGame",
    fromBlock: 0n,
    watch: true,
    filters: { player: myAddress },
    enabled: !!myAddress,
  });

  return (
    <table className="mt-4 p-2 bg-base-100 table table-zebra shadow-lg w-full overflow-hidden">
      <thead className="bg-base-300">
        <tr>
          <th colSpan={5}>
            <h3 className="text-xl text-center">Recent Games</h3>
          </th>
        </tr>
      </thead>
      {myAddress == undefined || events == undefined ? (
        <tbody>
          <tr>
            <td className="flex justify-center" colSpan={5}>
              <span className="loading loading-spinner loading-md"></span>
            </td>
          </tr>
        </tbody>
      ) : events.length == 0 ? (
        <p className="text-center text-lg">No recent games</p>
      ) : (
        <tbody>
          {events.slice(0, 5).map((event: any, index: number) => (
            <tr key={index}>
              <td colSpan={3}>
                <Address address={event.args.with} size="base" />
              </td>
              <td colSpan={2}>
                <button
                  onClick={() => {
                    setPlayer2(event.args.with);
                  }}
                >
                  Play
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      )}
    </table>
  );
};

export default Challenges;
