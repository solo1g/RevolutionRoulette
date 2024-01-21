import Image from "next/image";
import { Tooltip } from "react-tooltip";

const itemInfoMap: { [key: number]: { name: string; description: string; image: string } } = {
  1: {
    name: "Painkillers",
    description: "Heals 1 HP",
    image: "/painkillers.png",
  },
  2: {
    name: "Alcohol bottle",
    description: "Damage 3, hit chance 60%, shoot yourself if miss",
    image: "/alcohol bottle.png",
  },
  3: {
    name: "Smoke grenade",
    description: "Opponent hit chance 50% for next turn",
    image: "/smoke grenade.png",
  },
  4: {
    name: "Scope",
    description: "Damage 2, hit chance 90%, shoot yourself if miss",
    image: "/scope.png",
  },
  5: {
    name: "Live rounds",
    description: "+2 live rounds",
    image: "/live rounds.png",
  },
  6: {
    name: "Blank rounds",
    description: "+2 blank rounds",
    image: "/blank rounds.png",
  },
  7: {
    name: "Handcuffs",
    description: "Opponent skips next turn",
    image: "/handcuffs.png",
  },
  8: {
    name: "Thief",
    description: "Steals 1 item from opponent",
    image: "/thief.png",
  },
  9: {
    name: "Bulletproof vest",
    description: "Survive a fatal hit with 1 hp",
    image: "/bulletproof vest.png",
  },
  10: {
    name: "Lock",
    description: "Opponent cannot use items next turn",
    image: "/lock.png",
  },
  11: {
    name: "Weird fruit",
    description: "Doubles health but cannot use items for the rest of the game",
    image: "/fruit.png",
  },
  12: {
    name: "Magician",
    description: "Swap live and blank rounds",
    image: "/magician.png",
  },
  13: {
    name: "Max Wynn Cap",
    description: "Instantly ends the game with a random winner",
    image: "/max-wynn.png",
  },
  14: {
    name: "System glitch",
    description: "Delete both yours and opponent's items",
    image: "/glitch.png",
  },
  15: {
    name: "System hack",
    description: "Delete all of opponent's items",
    image: "/hack.png",
  },
};

const Item = ({ id, selected, onClick }: { id: number; selected: boolean; onClick: () => void }) => {
  const item = itemInfoMap[id];

  if (!item) {
    return <div></div>;
  }

  return (
    <div>
      <button
        className={`w-16 h-16 m-2 ${selected ? "ring-4" : ""} rounded-2xl bg-base-100"}`}
        data-tooltip-id={`item-${id}`}
        onClick={onClick}
      >
        <Image className="p-2" height={128} width={128} src={item.image} alt={item.name} />
      </button>
      <Tooltip style={{ backgroundColor: "transparent" }} id={`item-${id}`}>
        <div
          className="bg-base-100 p-4 text-base-content container-md rounded-xl font-bit"
          style={{
            boxShadow: "rgba(149, 157, 165, 0.2) 0px 3px 6px",
          }}
        >
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </div>
      </Tooltip>
    </div>
  );
};

export default Item;
