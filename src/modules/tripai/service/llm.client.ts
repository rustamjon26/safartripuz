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

export function loadTripaiLlmConfig(): LlmConfig | null {
  const apiKey = process.env.TRIPAI_LLM_API_KEY?.trim();
  const baseUrl = process.env.TRIPAI_LLM_BASE_URL?.trim();
  const model = process.env.TRIPAI_LLM_MODEL?.trim();
  const provider = process.env.TRIPAI_LLM_PROVIDER?.trim() || "alemllm";
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
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    return content ? content : null;
  } catch (error) {
    console.error("LLM chatCompletions error:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
