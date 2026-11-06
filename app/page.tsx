import { PracticeSession } from "@/components/pronunciation/practice-session";

export default function Home() {
  return (
    <div className="flex min-h-[100svh] w-full items-start justify-center bg-[#0b1120] p-2.5 sm:items-center sm:p-6 lg:p-8">
      <PracticeSession />
    </div>
  );
}
