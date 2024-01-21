import Image from "next/image";

const Health = ({ health }: { health: number }) => {
  return (
    <div className="flex">
      {Array.from({ length: health }, (_, i) => (
        <Image key={i} height={32} width={32} src="/heart.png" alt="heart" />
      ))}
    </div>
  );
};

export default Health;
