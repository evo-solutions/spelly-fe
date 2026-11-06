import type { HTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export function Card({
  className,
  variant = "glass",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: "glass" | "solid";
}) {
  return (
    <div
      className={cn(
        variant === "glass" &&
          "card-glass-glow rounded-xl sm:rounded-2xl border border-indigo-500/25 shadow-xl transition-all",
        variant === "solid" &&
          "bg-[#131d31] rounded-2xl sm:rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}
