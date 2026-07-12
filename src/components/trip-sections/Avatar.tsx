import { avatarColor, memberInitials } from "@/lib/store";

export function Avatar({ id, name, size = "sm" }: { id: string; name: string; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  return (
    <div
      className={"grid place-items-center rounded-full font-medium text-white shrink-0 " + avatarColor(id) + " " + cls}
      title={name}
    >
      {memberInitials(name)}
    </div>
  );
}
