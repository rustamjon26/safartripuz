export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmConfig = {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function loadTripaiLlmConfig(): LlmConfig | null {
  const apiKey = readEnv("TRIPAI_LLM_API_KEY");
  const baseUrl = readEnv("TRIPAI_LLM_BASE_URL");
  const model = readEnv("TRIPAI_LLM_MODEL");
  const provider = readEnv("TRIPAI_LLM_PROVIDER") || "alemllm";
  if (!apiKey || !baseUrl || !model) return null;
  return { provider, baseUrl, apiKey, model };
}

/**
 * Minimal OpenAI-compatible chat completions client.
 * Provider selected by TRIPAI_LLM_PROVIDER (currently unused beyond config).
 */
export async function chatCompletions(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
): Promise<string | null> {
  const config = loadTripaiLlmConfig();
  if (!config) return null;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 45_000,
  );

  try {
    const res = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 1200,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(
        "LLM chatCompletions failed",
        res.status,
        errBody.slice(0, 300),
      );
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          reasoning_content?: string | null;
        };
      }>;
    };
    const msg = data.choices?.[0]?.message;
    const content = msg?.content?.trim();
    if (content) return content;
    const reasoning = msg?.reasoning_content?.trim();
    if (reasoning && reasoning.includes("{")) return reasoning;
    return null;
  } catch (error) {
    console.error("LLM chatCompletions error:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
