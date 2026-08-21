import Image from "next/image";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Avatar({
  name,
  photoUrl,
  size = 96,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white"
      style={{ width: size, height: size, fontSize: size / 2.8 }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}
