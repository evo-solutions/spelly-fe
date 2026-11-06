import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export function IconButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#1c2538] text-slate-100 transition hover:bg-[#263248] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
