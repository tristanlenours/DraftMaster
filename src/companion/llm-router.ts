import https from "node:https";
import fs from "node:fs";
import path from "node:path";

const httpsKeepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 20,
  maxFreeSockets: 10,
});

export interface LlmResponse<T> {
  success: boolean;
  content: T | null;
  provider: string;
  model?: string;
  rawText?: string;
  error?: string;
}

export type LlmJsonProfile = "default" | "final-deck-coach@1";

export interface JevQuestionChoice {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
}

export interface JevQuestionScore {
  type: "score";
  instructions: string;
  criteria: string[];
}

export interface JevQuestionNoul {
  type: "noul";
  instructions: string;
  criteria?: {
    false: string;
    true: string;
  };
}

export type JevQuestion = JevQuestionChoice | JevQuestionScore | JevQuestionNoul;

export interface JevChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface JevScoreAnswer {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface JevNoulAnswer {
  type: "noul";
  noul: number;
}

export type JevAnswer = JevChoiceAnswer | JevScoreAnswer | JevNoulAnswer;

export interface JevDecisionResponse {
  model: string;
  answers: Record<string, JevAnswer>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cost: number;
  };
  id: string;
  provider: string;
}

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const JEV_MODEL = process.env.JEV_MODEL || "~typesafe/jev-latest";

export class LlmRouter {
  private geminiKeys: string[] = [];
  private geminiKeyCooldowns: Map<string, number> = new Map();
  private currentGeminiIndex = 0;
  private openrouterKey = "";
  private jevKey = "";

  constructor() {
    this.loadEnv();
  }

  private loadEnv() {
    const rawGeminiKeys: string[] = [];
    if (process.env.GEMINI_API_KEYS) {
      rawGeminiKeys.push(...process.env.GEMINI_API_KEYS.split(",").map((k) => k.trim()));
    }
    if (process.env.GEMINI_API_KEY) {
      rawGeminiKeys.push(...process.env.GEMINI_API_KEY.split(",").map((k) => k.trim()));
    }
    for (const [key, val] of Object.entries(process.env)) {
      if (key.startsWith("GEMINI_API_KEY_") && val) {
        rawGeminiKeys.push(...val.split(",").map((k) => k.trim()));
      }
    }

    this.openrouterKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_PREMIUM_API_KEY || "";
    this.jevKey = process.env.JEV_API_KEY || "";

    // If keys not in process.env, look in .env.local and .env
    if (rawGeminiKeys.length === 0) {
      for (const envFile of [".env.local", ".env"]) {
        const envPath = path.resolve(process.cwd(), envFile);
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, "utf8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.startsWith("GEMINI_API_KEYS=")) {
              const val = trimmed.replace("GEMINI_API_KEYS=", "").trim();
              rawGeminiKeys.push(...val.split(",").map((k) => k.trim()));
            } else if (trimmed.startsWith("GEMINI_API_KEY=")) {
              const val = trimmed.replace("GEMINI_API_KEY=", "").trim();
              rawGeminiKeys.push(...val.split(",").map((k) => k.trim()));
            } else if (trimmed.startsWith("GEMINI_API_KEY_")) {
              const equalIdx = trimmed.indexOf("=");
              if (equalIdx > 0) {
                const val = trimmed.slice(equalIdx + 1).trim();
                rawGeminiKeys.push(...val.split(",").map((k) => k.trim()));
              }
            }
          }
        }
      }
    }

    if (!this.openrouterKey || !this.jevKey) {
      for (const envFile of [".env.local", ".env"]) {
        const envPath = path.resolve(process.cwd(), envFile);
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, "utf8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.startsWith("OPENROUTER_API_KEY=") && !this.openrouterKey) {
              this.openrouterKey = trimmed.replace("OPENROUTER_API_KEY=", "").trim();
            }
            if (trimmed.startsWith("OPENROUTER_PREMIUM_API_KEY=") && !this.openrouterKey) {
              this.openrouterKey = trimmed.replace("OPENROUTER_PREMIUM_API_KEY=", "").trim();
            }
            if (trimmed.startsWith("JEV_API_KEY=") && !this.jevKey) {
              this.jevKey = trimmed.replace("JEV_API_KEY=", "").trim();
            }
          }
        }
      }
    }

    if (!this.jevKey && this.openrouterKey) {
      this.jevKey = this.openrouterKey;
    }

    // Deduplicate and retain only non-empty keys
    const unique = new Set<string>();
    for (const k of rawGeminiKeys) {
      if (k.length > 0) {
        unique.add(k);
      }
    }
    this.geminiKeys = Array.from(unique);
  }

  public hasConfiguredKeys(): boolean {
    return Boolean(this.geminiKeys.length > 0 || this.openrouterKey || this.jevKey);
  }

  public hasJevKey(): boolean {
    return Boolean(this.jevKey);
  }

  public getGeminiKeyCount(): number {
    return this.geminiKeys.length;
  }

  public getGeminiKeys(): readonly string[] {
    return this.geminiKeys;
  }

  public getAvailableGeminiKeyCount(): number {
    const now = Date.now();
    return this.geminiKeys.filter((k) => (this.geminiKeyCooldowns.get(k) ?? 0) <= now).length;
  }

  public markKeyCooldownForTesting(key: string, durationMs = 60_000): void {
    this.geminiKeyCooldowns.set(key, Date.now() + durationMs);
  }

  public clearKeysForTesting(): void {
    this.geminiKeys = [];
    this.geminiKeyCooldowns.clear();
    this.openrouterKey = "";
    this.jevKey = "";
  }

  public hasAvailableGeminiKey(): boolean {
    const now = Date.now();
    return this.geminiKeys.some((k) => (this.geminiKeyCooldowns.get(k) ?? 0) <= now);
  }

  private getAvailableGeminiKeys(): string[] {
    const now = Date.now();
    const available = this.geminiKeys.filter((k) => (this.geminiKeyCooldowns.get(k) ?? 0) <= now);
    if (available.length <= 1) {
      return available;
    }
    const startIdx = this.currentGeminiIndex % available.length;
    this.currentGeminiIndex = (this.currentGeminiIndex + 1) % available.length;
    return [...available.slice(startIdx), ...available.slice(0, startIdx)];
  }

  public async generateJson<T>(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      preferBaseTier?: boolean;
      maxTokens?: number;
      profile?: LlmJsonProfile;
    },
  ): Promise<LlmResponse<T>> {
    const maxTokens = options?.maxTokens ?? 2000;
    const isFinalDeckCoach = options?.profile === "final-deck-coach@1";
    const preferGemini = options?.preferBaseTier === true || isFinalDeckCoach;
    const jsonTimeoutMs = isFinalDeckCoach ? 8000 : 2000;

    // Low-latency profiles try Gemini first, then retain OpenRouter as the configured fallback.
    if (preferGemini && this.hasAvailableGeminiKey()) {
      try {
        const gemRes = await this.callGeminiJson<T>(
          systemPrompt,
          userPrompt,
          maxTokens,
          jsonTimeoutMs,
        );
        if (gemRes) {
          return {
            success: true,
            content: gemRes,
            provider: "Gemini Flash",
            model: GEMINI_MODEL,
          };
        }
      } catch (err: any) {
        console.warn("[LlmRouter] Gemini JSON failed, falling back to OpenRouter:", err.message);
      }
    }

    // 1. Try OpenRouter (openrouter/auto)
    if (this.openrouterKey) {
      try {
        const deepRes = await this.callOpenRouterJson<T>(
          systemPrompt,
          userPrompt,
          maxTokens,
          jsonTimeoutMs,
        );
        if (deepRes) {
          return {
            success: true,
            content: deepRes,
            provider: "OpenRouter (Auto)",
            model: OPENROUTER_MODEL,
          };
        }
      } catch (err: any) {
        console.warn("[LlmRouter] OpenRouter JSON failed, falling back to Gemini:", err.message);
      }
    }

    // 2. Fallback to Gemini Flash only if not already tried above
    if (!preferGemini && this.hasAvailableGeminiKey()) {
      try {
        const gemRes = await this.callGeminiJson<T>(
          systemPrompt,
          userPrompt,
          maxTokens,
          jsonTimeoutMs,
        );
        if (gemRes) {
          return {
            success: true,
            content: gemRes,
            provider: "Gemini Flash",
            model: GEMINI_MODEL,
          };
        }
      } catch (err: any) {
        console.error("[LlmRouter] Gemini JSON failed:", err.message);
      }
    }

    return { success: false, content: null, provider: "None", error: "All LLM providers failed" };
  }

  public async generateText(
    systemPrompt: string,
    userPrompt: string,
    options?: { preferBaseTier?: boolean; maxTokens?: number },
  ): Promise<LlmResponse<string>> {
    const maxTokens = options?.maxTokens ?? (options?.preferBaseTier ? 3000 : 6000);

    // If base tier explicitly preferred (e.g. bots), try Gemini first
    if (options?.preferBaseTier && this.hasAvailableGeminiKey()) {
      try {
        const gemRes = await this.callGeminiText(systemPrompt, userPrompt);
        if (gemRes) {
          return { success: true, content: gemRes, provider: "Gemini Flash" };
        }
      } catch (err: any) {
        console.warn("[LlmRouter] Gemini text failed, falling back to OpenRouter:", err.message);
      }
    }

    // 1. Try OpenRouter Premium (DeepSeek V4.1 Flash)
    if (this.openrouterKey) {
      try {
        const deepRes = await this.callOpenRouterText(systemPrompt, userPrompt, maxTokens);
        if (deepRes) {
          return { success: true, content: deepRes, provider: "DeepSeek V4.1 Flash (OpenRouter)" };
        }
      } catch (err: any) {
        console.warn("[LlmRouter] OpenRouter text failed, falling back to Gemini:", err.message);
      }
    }

    // 2. Fallback to Gemini Flash
    if (this.hasAvailableGeminiKey()) {
      try {
        const gemRes = await this.callGeminiText(systemPrompt, userPrompt);
        if (gemRes) {
          return { success: true, content: gemRes, provider: "Gemini Flash" };
        }
      } catch (err: any) {
        console.error("[LlmRouter] Gemini text failed:", err.message);
      }
    }

    return { success: false, content: null, provider: "None", error: "All LLM providers failed" };
  }

  public async streamChat(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    onToken: (token: string) => void,
    options?: { preferBaseTier?: boolean; maxTokens?: number },
  ): Promise<{
    success: boolean;
    fullText: string;
    provider: "DeepSeek V4.1 Flash (OpenRouter)" | "Gemini Flash" | "None";
  }> {
    const maxTokens = options?.maxTokens ?? (options?.preferBaseTier ? 3000 : 6000);

    // 1. Try OpenRouter Premium (DeepSeek V4.1 Flash) SSE
    if (!options?.preferBaseTier && this.openrouterKey) {
      try {
        const full = await this.streamOpenRouter(messages, onToken, maxTokens);
        if (full && full.length > 0) {
          return { success: true, fullText: full, provider: "DeepSeek V4.1 Flash (OpenRouter)" };
        }
      } catch (err: any) {
        console.warn("[LlmRouter] OpenRouter stream failed, falling back to Gemini:", err.message);
      }
    }

    // 2. Fallback Gemini Flash SSE
    if (this.hasAvailableGeminiKey()) {
      try {
        const full = await this.streamGemini(messages, onToken);
        if (full && full.length > 0) {
          return { success: true, fullText: full, provider: "Gemini Flash" };
        }
      } catch (err: any) {
        console.error("[LlmRouter] Gemini stream failed:", err.message);
      }
    }

    // 3. Fallback OpenRouter if base tier failed
    if (options?.preferBaseTier && this.openrouterKey) {
      try {
        const full = await this.streamOpenRouter(messages, onToken);
        if (full && full.length > 0) {
          return { success: true, fullText: full, provider: "DeepSeek V4.1 Flash (OpenRouter)" };
        }
      } catch (err: any) {
        console.error("[LlmRouter] OpenRouter stream fallback failed:", err.message);
      }
    }

    return { success: false, fullText: "", provider: "None" };
  }

  private async callGeminiJson<T>(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 2000,
    timeoutMs = 5000,
  ): Promise<T | null> {
    const keys = this.getAvailableGeminiKeys();
    for (const key of keys) {
      const outcome = await this.executeGeminiJsonRequest(
        key,
        systemPrompt,
        userPrompt,
        maxTokens,
        timeoutMs,
      );
      if (outcome.status === "success") {
        return outcome.data as T;
      }
      if (outcome.status === "quota_exceeded") {
        this.geminiKeyCooldowns.set(key, Date.now() + 600_000);
        console.warn(
          `[LlmRouter] Gemini quota exceeded (429) for key ...${key.slice(-6)}, cooling down for 10m. Trying next key.`,
        );
        continue;
      }
      if (outcome.status === "service_unavailable") {
        // High demand / server outage on Gemini model. Cooldown all keys for 2 minutes and don't retry other keys.
        const cooldownUntil = Date.now() + 120_000;
        for (const k of this.geminiKeys) {
          this.geminiKeyCooldowns.set(k, cooldownUntil);
        }
        console.warn(
          `[LlmRouter] Gemini model unavailable (503), placing all keys on cooldown for 2m and skipping retries.`,
        );
        break;
      }
      console.warn(
        `[LlmRouter] Gemini JSON request error for key ...${key.slice(-6)}. Trying next key.`,
      );
      continue;
    }
    return null;
  }

  private executeGeminiJsonRequest(
    key: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    timeoutMs: number,
  ): Promise<{
    status: "success" | "quota_exceeded" | "service_unavailable" | "error";
    data: unknown;
  }> {
    return new Promise((resolve) => {
      const payload = JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: maxTokens,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });

      let timer: NodeJS.Timeout | null = null;

      const req = https.request(
        {
          hostname: "generativelanguage.googleapis.com",
          port: 443,
          path: `/v1beta/models/${GEMINI_MODEL}:generateContent`,
          method: "POST",
          agent: httpsKeepAliveAgent,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => {
            if (timer) clearTimeout(timer);
            if (res.statusCode === 200) {
              try {
                const data = JSON.parse(body);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                const cleaned = (text || "")
                  .trim()
                  .replace(/^```(?:json)?\s*/i, "")
                  .replace(/\s*```$/, "");
                resolve({ status: "success", data: JSON.parse(cleaned) });
              } catch (e: any) {
                console.warn("[LlmRouter] Gemini JSON parse error:", e?.message);
                resolve({ status: "error", data: null });
              }
            } else if (res.statusCode === 429) {
              resolve({ status: "quota_exceeded", data: null });
            } else if (res.statusCode === 503 || res.statusCode === 502 || res.statusCode === 504) {
              console.warn(
                "[LlmRouter] Gemini service unavailable:",
                res.statusCode,
                body.slice(0, 200),
              );
              resolve({ status: "service_unavailable", data: null });
            } else {
              console.warn("[LlmRouter] Gemini HTTP error:", res.statusCode, body.slice(0, 200));
              resolve({ status: "error", data: null });
            }
          });
        },
      );

      timer = setTimeout(() => {
        req.destroy();
        resolve({ status: "error", data: null });
      }, timeoutMs);

      req.on("error", () => {
        clearTimeout(timer);
        resolve({ status: "error", data: null });
      });
      req.write(payload);
      req.end();
    });
  }

  private async callGeminiText(systemPrompt: string, userPrompt: string): Promise<string | null> {
    const keys = this.getAvailableGeminiKeys();
    for (const key of keys) {
      const outcome = await this.executeGeminiTextRequest(key, systemPrompt, userPrompt);
      if (outcome.status === "success") {
        return outcome.data;
      }
      if (outcome.status === "quota_exceeded") {
        this.geminiKeyCooldowns.set(key, Date.now() + 600_000);
        console.warn(
          `[LlmRouter] Gemini quota exceeded (429) for key ...${key.slice(-6)}, cooling down for 10m. Trying next key.`,
        );
        continue;
      }
      console.warn(
        `[LlmRouter] Gemini text request error for key ...${key.slice(-6)}. Trying next key.`,
      );
      continue;
    }
    return null;
  }

  private executeGeminiTextRequest(
    key: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ status: "success" | "quota_exceeded" | "error"; data: string | null }> {
    return new Promise((resolve) => {
      const payload = JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: 0.2,
        },
      });

      const req = https.request(
        {
          hostname: "generativelanguage.googleapis.com",
          port: 443,
          path: `/v1beta/models/${GEMINI_MODEL}:generateContent`,
          method: "POST",
          agent: httpsKeepAliveAgent,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => {
            if (res.statusCode === 200) {
              try {
                const data = JSON.parse(body);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                resolve({ status: "success", data: text || null });
              } catch {
                resolve({ status: "error", data: null });
              }
            } else if (res.statusCode === 429) {
              resolve({ status: "quota_exceeded", data: null });
            } else {
              resolve({ status: "error", data: null });
            }
          });
        },
      );

      req.on("error", () => {
        resolve({ status: "error", data: null });
      });
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({ status: "error", data: null });
      });
      req.write(payload);
      req.end();
    });
  }

  private async streamGemini(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    onToken: (token: string) => void,
  ): Promise<string> {
    const keys = this.getAvailableGeminiKeys();
    let lastError: Error | null = null;
    for (const key of keys) {
      try {
        const fullText = await this.executeStreamGemini(key, messages, onToken);
        if (fullText) return fullText;
      } catch (err: any) {
        lastError = err;
        if (err.message && err.message.includes("429")) {
          this.geminiKeyCooldowns.set(key, Date.now() + 60_000);
          console.warn(
            `[LlmRouter] Gemini stream quota exceeded (429) for key ...${key.slice(-6)}, cooling down for 60s. Trying next key.`,
          );
          continue;
        }
      }
    }
    throw lastError || new Error("Gemini stream failed with all available keys");
  }

  private executeStreamGemini(
    key: string,
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    onToken: (token: string) => void,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let combined = "";
      for (const m of messages) {
        if (m.role === "system") combined += `[INSTRUCTIONS]: ${m.content}\n\n`;
        else if (m.role === "user") combined += `[JOUEUR]: ${m.content}\n`;
        else combined += `[COACH]: ${m.content}\n`;
      }

      const payload = JSON.stringify({
        contents: [{ parts: [{ text: combined }] }],
        generationConfig: { temperature: 0.3 },
      });

      const req = https.request(
        {
          hostname: "generativelanguage.googleapis.com",
          port: 443,
          path: `/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
          method: "POST",
          agent: httpsKeepAliveAgent,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Gemini stream HTTP ${res.statusCode}`));
            return;
          }

          let fullText = "";
          let sseBuffer = "";

          res.on("data", (chunk) => {
            sseBuffer += chunk.toString("utf8");
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr) {
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const token = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    if (token) {
                      fullText += token;
                      onToken(token);
                    }
                  } catch {}
                }
              }
            }
          });

          res.on("end", () => {
            resolve(fullText);
          });
        },
      );

      req.on("error", reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error("Gemini stream timeout"));
      });
      req.write(payload);
      req.end();
    });
  }

  private callOpenRouterJson<T>(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 2000,
    timeoutMs = 10000,
  ): Promise<T | null> {
    return new Promise((resolve) => {
      const payload = JSON.stringify({
        model: OPENROUTER_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
      });

      let timer: NodeJS.Timeout | null = null;

      const req = https.request(
        {
          hostname: "openrouter.ai",
          port: 443,
          path: "/api/v1/chat/completions",
          method: "POST",
          agent: httpsKeepAliveAgent,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.openrouterKey}`,
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => {
            if (timer) clearTimeout(timer);
            if (res.statusCode === 200) {
              try {
                const data = JSON.parse(body);
                const text = data.choices?.[0]?.message?.content;
                const cleaned = (text || "")
                  .trim()
                  .replace(/^```(?:json)?\s*/i, "")
                  .replace(/\s*```$/, "");
                resolve(JSON.parse(cleaned));
              } catch {
                resolve(null);
              }
            } else {
              console.warn(
                "[LlmRouter] OpenRouter HTTP error:",
                res.statusCode,
                body.slice(0, 300),
              );
              resolve(null);
            }
          });
        },
      );

      timer = setTimeout(() => {
        req.destroy();
        console.warn(`[LlmRouter] OpenRouter request timeout after ${String(timeoutMs)} ms`);
        resolve(null);
      }, timeoutMs);

      req.on("error", (err) => {
        clearTimeout(timer);
        console.warn("[LlmRouter] OpenRouter socket error:", err.message);
        resolve(null);
      });
      req.write(payload);
      req.end();
    });
  }

  private callOpenRouterText(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 6000,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const payload = JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
      });

      const req = https.request(
        {
          hostname: "openrouter.ai",
          port: 443,
          path: "/api/v1/chat/completions",
          method: "POST",
          agent: httpsKeepAliveAgent,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.openrouterKey}`,
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => {
            if (res.statusCode === 200) {
              try {
                const data = JSON.parse(body);
                resolve(data.choices?.[0]?.message?.content || null);
              } catch {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          });
        },
      );

      req.on("error", () => {
        resolve(null);
      });
      req.setTimeout(25000, () => {
        req.destroy();
        resolve(null);
      });
      req.write(payload);
      req.end();
    });
  }

  private streamOpenRouter(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    onToken: (token: string) => void,
    maxTokens = 6000,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        model: OPENROUTER_MODEL,
        stream: true,
        messages,
        temperature: 0.3,
        max_tokens: maxTokens,
      });

      const req = https.request(
        {
          hostname: "openrouter.ai",
          port: 443,
          path: "/api/v1/chat/completions",
          method: "POST",
          agent: httpsKeepAliveAgent,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.openrouterKey}`,
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`OpenRouter stream HTTP ${res.statusCode}`));
            return;
          }

          let fullText = "";
          let sseBuffer = "";

          res.on("data", (chunk) => {
            sseBuffer += chunk.toString("utf8");
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]") continue;
                if (jsonStr) {
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const token = parsed.choices?.[0]?.delta?.content || "";
                    if (token) {
                      fullText += token;
                      onToken(token);
                    }
                  } catch {}
                }
              }
            }
          });

          res.on("end", () => {
            resolve(fullText);
          });
        },
      );

      req.on("error", reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error("OpenRouter stream timeout"));
      });
      req.write(payload);
      req.end();
    });
  }

  public async callJevDecision(
    state: string,
    questions: Record<string, JevQuestion>,
    options?: { model?: string; timeoutMs?: number },
  ): Promise<LlmResponse<JevDecisionResponse>> {
    const key = this.jevKey || this.openrouterKey;
    if (!key) {
      return {
        success: false,
        content: null,
        provider: "None",
        error: "Aucune clé JEV ou OpenRouter configurée",
      };
    }

    const model = options?.model || JEV_MODEL;
    const timeoutMs = options?.timeoutMs ?? 10_000;

    return new Promise((resolve) => {
      const payload = JSON.stringify({
        model,
        state,
        questions,
      });

      let timer: NodeJS.Timeout | null = null;

      const req = https.request(
        {
          hostname: "openrouter.ai",
          port: 443,
          path: "/api/alpha/decisions",
          method: "POST",
          agent: httpsKeepAliveAgent,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => {
            if (timer) clearTimeout(timer);
            if (res.statusCode === 200) {
              try {
                const data = JSON.parse(body) as JevDecisionResponse;
                resolve({
                  success: true,
                  content: data,
                  provider: data.provider || "TypeSafe (Jev)",
                  model: data.model || model,
                });
              } catch (e: any) {
                resolve({
                  success: false,
                  content: null,
                  provider: "TypeSafe (Jev)",
                  error: `Jev response JSON parse error: ${e?.message ?? "unknown"}`,
                });
              }
            } else {
              resolve({
                success: false,
                content: null,
                provider: "TypeSafe (Jev)",
                error: `Jev API error HTTP ${String(res.statusCode)}: ${body.slice(0, 300)}`,
              });
            }
          });
        },
      );

      timer = setTimeout(() => {
        req.destroy();
        resolve({
          success: false,
          content: null,
          provider: "TypeSafe (Jev)",
          error: `Jev request timeout after ${String(timeoutMs)} ms`,
        });
      }, timeoutMs);

      req.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          content: null,
          provider: "TypeSafe (Jev)",
          error: `Jev socket error: ${err.message}`,
        });
      });

      req.write(payload);
      req.end();
    });
  }
}
