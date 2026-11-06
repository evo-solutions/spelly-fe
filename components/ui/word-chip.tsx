import { cn } from "@/components/ui/cn";

export type WordStatus = "correct" | "warning" | "error" | "pending" | "current" | "incorrect";

const statusStyles: Record<string, string> = {
  correct:
    "bg-[#143229]/90 hover:bg-[#183d32] border-emerald-500/30 text-[#34d399]",
  warning:
    "bg-[#352e14]/90 hover:bg-[#423918] border-amber-500/40 text-[#facc15] wavy-underline decoration-[#facc15]",
  current:
    "bg-[#352e14]/90 hover:bg-[#423918] border-amber-500/40 text-[#facc15] wavy-underline decoration-[#facc15]",
  error:
    "bg-[#371622]/90 hover:bg-[#451b2a] border-rose-500/40 text-[#f87171] solid-underline decoration-[#f87171]",
  incorrect:
    "bg-[#371622]/90 hover:bg-[#451b2a] border-rose-500/40 text-[#f87171] solid-underline decoration-[#f87171]",
  pending:
    "bg-[#1e293b]/70 hover:bg-[#334155]/70 border-slate-700/50 text-slate-400",
};

export function WordChip({
  word,
  status = "pending",
  className,
}: {
  word: string;
  status: WordStatus;
  className?: string;
}) {
  const style = statusStyles[status] ?? statusStyles.pending;

  return (
    <span
      className={cn(
        "inline-block px-4 py-2 rounded-lg text-base sm:text-lg font-medium border tracking-normal select-none shadow-sm transition-all duration-150 active:scale-95",
        style,
        className
      )}
    >
      {word}
    </span>
  );
}
