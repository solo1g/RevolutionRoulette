import Image from "next/image";
import { NextPage } from "next";
import { formatEther, isAddress } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldContractRead } from "~~/hooks/scaffold-eth";

const Stats: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  const { data: stats } = useScaffoldContractRead({
    contractName: "RevolutionRoulette",
    functionName: "stats",
    args: [connectedAddress],
    enabled: isAddress(connectedAddress ?? ""),
    watch: true,
  });

  return (
    <div className="py-4 px-32 mx-auto bg-base-100 mt-16 rounded-2xl shadow-2xl font-bit">
      <div className="flex flex-col text-center">
        {stats == undefined ? (
          <p className="loading loading-spinner"></p>
        ) : (
          <div>
            <p className="text-4xl">Your gambling career</p>
            <div className="flex text-xl">
              <div>
                <p>Wins : {stats[0]}</p>
                <p>Losses : {stats[1]}</p>
                <p>ETH Won : {formatEther(stats[2])}</p>
                <p>ETH Lost : {formatEther(stats[3])}</p>
              </div>
              <Image className="ml-16" src="/buh.webp" alt="buh" width={250} height={100} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stats;
