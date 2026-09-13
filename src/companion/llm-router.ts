import https from "node:https";
import fs from "node:fs";
import path from "node:path";

export interface LlmResponse<T> {
  success: boolean;
  content: T | null;
  provider: string;
  rawText?: string;
  error?: string;
}

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4.1-flash";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

export class LlmRouter {
  private geminiKey = "";
  private openrouterKey = "";
  private geminiCooldownUntil = 0;

  constructor() {
    this.loadEnv();
  }

  private loadEnv() {
    this.geminiKey = process.env.GEMINI_API_KEY || "";
    this.openrouterKey =
      process.env.OPENROUTER_PREMIUM_API_KEY || process.env.OPENROUTER_API_KEY || "";

    // If keys not in process.env, look in .env.local and .env
    for (const envFile of [".env.local", ".env"]) {
      const envPath = path.resolve(process.cwd(), envFile);
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("GEMINI_API_KEY=") && !this.geminiKey) {
            this.geminiKey = trimmed.replace("GEMINI_API_KEY=", "").trim();
          }
          if (trimmed.startsWith("OPENROUTER_PREMIUM_API_KEY=") && !this.openrouterKey) {
            this.openrouterKey = trimmed.replace("OPENROUTER_PREMIUM_API_KEY=", "").trim();
          }
          if (trimmed.startsWith("OPENROUTER_API_KEY=") && !this.openrouterKey) {
            this.openrouterKey = trimmed.replace("OPENROUTER_API_KEY=", "").trim();
          }
        }
      }
    }
  }

  public hasConfiguredKeys(): boolean {
    return Boolean(this.geminiKey || this.openrouterKey);
  }

  public async generateJson<T>(
    systemPrompt: string,
    userPrompt: string,
    options?: { preferBaseTier?: boolean; maxTokens?: number },
  ): Promise<LlmResponse<T>> {
    const maxTokens = options?.maxTokens ?? (options?.preferBaseTier ? 3000 : 6000);

    // If base tier explicitly preferred (e.g. bots), try Gemini first
    if (options?.preferBaseTier && this.geminiKey && Date.now() >= this.geminiCooldownUntil) {
      try {
        const gemRes = await this.callGeminiJson<T>(systemPrompt, userPrompt);
        if (gemRes) {
          return { success: true, content: gemRes, provider: "Gemini Flash" };
        }
      } catch (err: any) {
        console.warn("[LlmRouter] Gemini JSON failed, falling back to OpenRouter:", err.message);
      }
    }

    // 1. Try OpenRouter Premium (DeepSeek V4.1 Flash)
    if (this.openrouterKey) {
      try {
        const deepRes = await this.callOpenRouterJson<T>(systemPrompt, userPrompt, maxTokens);
        if (deepRes) {
          return { success: true, content: deepRes, provider: "DeepSeek V4.1 Flash (OpenRouter)" };
        }
      } catch (err: any) {
        console.warn("[LlmRouter] OpenRouter JSON failed, falling back to Gemini:", err.message);
      }
    }

    // 2. Fallback to Gemini Flash
    if (this.geminiKey && Date.now() >= this.geminiCooldownUntil) {
      try {
        const gemRes = await this.callGeminiJson<T>(systemPrompt, userPrompt);
        if (gemRes) {
          return { success: true, content: gemRes, provider: "Gemini Flash" };
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
    if (options?.preferBaseTier && this.geminiKey) {
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
    if (this.geminiKey) {
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
    if (this.geminiKey) {
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

  private callGeminiJson<T>(systemPrompt: string, userPrompt: string): Promise<T | null> {
    return new Promise((resolve) => {
      const payload = JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 600,
        },
      });

      const req = https.request(
        {
          hostname: "generativelanguage.googleapis.com",
          port: 443,
          path: `/v1beta/models/${GEMINI_MODEL}:generateContent`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.geminiKey,
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
                resolve(JSON.parse(text));
              } catch {
                resolve(null);
              }
            } else {
              if (res.statusCode === 429) {
                this.geminiCooldownUntil = Date.now() + 60_000;
                console.warn("[LlmRouter] Gemini quota exceeded (429), entering 60s cooldown.");
              }
              resolve(null);
            }
          });
        },
      );

      req.on("error", () => {
        resolve(null);
      });
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(null);
      });
      req.write(payload);
      req.end();
    });
  }

  private callGeminiText(systemPrompt: string, userPrompt: string): Promise<string | null> {
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
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.geminiKey,
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
                resolve(text || null);
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
      req.setTimeout(10000, () => {
        req.destroy();
        resolve(null);
      });
      req.write(payload);
      req.end();
    });
  }

  private streamGemini(
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
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.geminiKey,
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
    maxTokens = 6000,
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

      const req = https.request(
        {
          hostname: "openrouter.ai",
          port: 443,
          path: "/api/v1/chat/completions",
          method: "POST",
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
}
