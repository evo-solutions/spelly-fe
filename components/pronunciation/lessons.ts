import type { WordStatus } from "@/components/ui/word-chip";

export type Lesson = {
  id: string;
  label: string;
  title: string;
  turnIndex: number;
  role: "0" | "1";
  speakerLabel: string;
  conversationId: string;
  words: string[];
  sentence: string;
  ipa: string;
  meaning: string;
  vietnamese: string;
  sampleRange: [number, number];
  timeRange: [number, number];
  audioFile?: string;
  initialStatuses?: WordStatus[];
};

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export type SpokenWordItem = {
  word: string;
  targetWord?: string;
  status: WordStatus;
  index: number;
  isMissing?: boolean;
};

export type SpokenEvaluation = {
  spokenList: SpokenWordItem[];
  isAllCorrect: boolean;
  hasErrors: boolean;
  matchedCount: number;
  totalTarget: number;
};

export function evaluateSpokenWords(
  transcript: string,
  targetWords: string[]
): SpokenEvaluation {
  const clean = (word: string) => word.toLowerCase().replace(/[^\w']/g, "");

  const spokenTokens = transcript
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\w'-]/g, ""))
    .filter(Boolean);

  if (spokenTokens.length === 0) {
    return {
      spokenList: [],
      isAllCorrect: false,
      hasErrors: false,
      matchedCount: 0,
      totalTarget: targetWords.length,
    };
  }

  type Alignment = "match" | "replace" | "missing" | "extra";
  const targetTokens = targetWords.map(clean);
  const spokenClean = spokenTokens.map(clean);
  const costs = Array.from({ length: targetTokens.length + 1 }, () =>
    Array<number>(spokenTokens.length + 1).fill(0)
  );
  const steps = Array.from({ length: targetTokens.length + 1 }, () =>
    Array<Alignment | null>(spokenTokens.length + 1).fill(null)
  );

  for (let targetIndex = 1; targetIndex <= targetTokens.length; targetIndex++) {
    costs[targetIndex][0] = targetIndex;
    steps[targetIndex][0] = "missing";
  }
  for (let spokenIndex = 1; spokenIndex <= spokenTokens.length; spokenIndex++) {
    costs[0][spokenIndex] = spokenIndex;
    steps[0][spokenIndex] = "extra";
  }

  for (let targetIndex = 1; targetIndex <= targetTokens.length; targetIndex++) {
    for (let spokenIndex = 1; spokenIndex <= spokenTokens.length; spokenIndex++) {
      const target = targetTokens[targetIndex - 1];
      const spoken = spokenClean[spokenIndex - 1];
      const distance = levenshteinDistance(target, spoken);
      const isExact = target === spoken;
      const isClose =
        target.startsWith(spoken) ||
        spoken.startsWith(target) ||
        distance <= 1;
      const replaceCost = isExact ? 0 : isClose ? 0.5 : 1;
      const candidates: Array<{ cost: number; step: Alignment; priority: number }> = [
        {
          cost: costs[targetIndex - 1][spokenIndex - 1] + replaceCost,
          step: isExact ? "match" : "replace",
          priority: 0,
        },
        {
          cost: costs[targetIndex - 1][spokenIndex] + 1,
          step: "missing",
          priority: 1,
        },
        {
          cost: costs[targetIndex][spokenIndex - 1] + 1,
          step: "extra",
          priority: 2,
        },
      ];
      candidates.sort((a, b) => a.cost - b.cost || a.priority - b.priority);
      costs[targetIndex][spokenIndex] = candidates[0].cost;
      steps[targetIndex][spokenIndex] = candidates[0].step;
    }
  }

  const reversed: SpokenWordItem[] = [];
  let correctCount = 0;
  let hasErrors = false;
  let targetIndex = targetTokens.length;
  let spokenIndex = spokenTokens.length;

  while (targetIndex > 0 || spokenIndex > 0) {
    const step = steps[targetIndex][spokenIndex];
    if (step === "match" || step === "replace") {
      const token = spokenTokens[spokenIndex - 1];
      const target = targetWords[targetIndex - 1];
      const isExact = step === "match";
      reversed.push({
        word: token,
        targetWord: target,
        status: isExact
          ? "correct"
          : levenshteinDistance(targetTokens[targetIndex - 1], spokenClean[spokenIndex - 1]) <= 1 ||
              targetTokens[targetIndex - 1].startsWith(spokenClean[spokenIndex - 1]) ||
              spokenClean[spokenIndex - 1].startsWith(targetTokens[targetIndex - 1])
            ? "warning"
            : "error",
        index: spokenIndex - 1,
      });
      if (isExact) correctCount += 1;
      else if (reversed[reversed.length - 1].status === "error") hasErrors = true;
      targetIndex -= 1;
      spokenIndex -= 1;
    } else if (step === "missing") {
      const target = targetWords[targetIndex - 1];
      reversed.push({
        word: target,
        targetWord: target,
        status: "error",
        index: spokenIndex,
        isMissing: true,
      });
      hasErrors = true;
      targetIndex -= 1;
    } else if (step === "extra") {
      reversed.push({
        word: spokenTokens[spokenIndex - 1],
        status: "error",
        index: spokenIndex - 1,
      });
      hasErrors = true;
      spokenIndex -= 1;
    } else {
      break;
    }
  }

  const results = reversed.reverse();
  const isAllCorrect =
    correctCount === targetWords.length &&
    results.length === targetWords.length &&
    !hasErrors;

  return {
    spokenList: results,
    isAllCorrect,
    hasErrors,
    matchedCount: correctCount,
    totalTarget: targetWords.length,
  };
}
