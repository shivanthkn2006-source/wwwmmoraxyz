export interface ZoeMemory {
  id?: string;
  content: string;
  created_at?: string;
  emotional_weight?: number;
  memory_type?: string;
}

export interface CompressedMemory {
  emotional_state: string;
  intensity: number;
  context: string;
  key_facts: string[];
  date: string;
  raw_summary: string;
}

export function compressMemories(
  memories: ZoeMemory[],
  maxTokenBudget: number = 300
): string {
  if (!memories || memories.length === 0) {
    return "No prior memories.";
  }

  // Sort by most recent first
  const sorted = [...memories].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });

  // Take only top 5 most recent memories
  const top5 = sorted.slice(0, 5);

  // Build compressed string under token budget
  // Rough estimate: 1 token = 4 characters
  const charBudget = maxTokenBudget * 4;

  let compressed = "MEMORY CONTEXT:\n";
  let usedChars = compressed.length;

  for (const memory of top5) {
    const content = memory.content || "";
    const date = memory.created_at
      ? new Date(memory.created_at).toLocaleDateString('en-IN')
      : "recent";
    const weight = memory.emotional_weight || 5;

    const entry = `[${date}, weight:${weight}/10] ${content}\n`;

    if (usedChars + entry.length > charBudget) break;

    compressed += entry;
    usedChars += entry.length;
  }

  return compressed;
}

export function buildContextBudget(params: {
  userName?: string;
  karmicLevel?: number;
  memories?: ZoeMemory[];
  currentEmotion?: string;
  timeOfDay?: string;
  weather?: string;
  vedicContext?: string;
}): string {
  const sections: string[] = [];

  // Identity block — 100 tokens max
  if (params.userName) {
    sections.push(
      `USER: ${params.userName}. ` +
      `Intimacy level: ${params.karmicLevel || 0}/100. ` +
      `Current emotion detected: ${params.currentEmotion || "neutral"}.`
    );
  }

  // Time/environment block — 50 tokens max
  const envParts: string[] = [];
  if (params.timeOfDay) envParts.push(`Time: ${params.timeOfDay}`);
  if (params.weather) envParts.push(`Weather: ${params.weather}`);
  if (envParts.length > 0) {
    sections.push(envParts.join(". ") + ".");
  }

  // Vedic block — 50 tokens max
  if (params.vedicContext) {
    const trimmedVedic = params.vedicContext.slice(0, 200);
    sections.push(`Cosmic context: ${trimmedVedic}`);
  }

  // Memory block — 300 tokens max
  if (params.memories && params.memories.length > 0) {
    sections.push(compressMemories(params.memories, 300));
  }

  return sections.join("\n");
}
