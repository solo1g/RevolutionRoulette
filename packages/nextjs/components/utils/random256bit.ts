import { randomBytes } from "crypto";

const random256bit: () => bigint = () => {
  return BigInt(`0x${randomBytes(32).toString("hex")}`);
};

export default random256bit;
