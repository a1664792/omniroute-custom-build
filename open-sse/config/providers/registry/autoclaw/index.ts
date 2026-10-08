import type { RegistryEntry } from "../../shared.ts";

// AutoClaw (智谱 AutoGLM CN) — free GLM credits via the AutoClaw desktop client.
// Wire format reverse-engineered from the client + autoclaw2api (sitimas9):
// app-sign headers (md5 of appid&ts&appkey) + X-Authorization bearer + X-Request-Model.
export const AUTOCCLAW_MODEL_MAP: Record<string, string> = {
  auto: "zai_auto",
  "auto-fast": "zai_auto-fast",
  "glm-5.3": "zai_auto",
  "glm-5.3-flash": "zai_glm-5.3-flash",
};

export const autoclawProvider: RegistryEntry = {
  id: "autoclaw",
  alias: "autoclaw",
  format: "openai",
  executor: "autoclaw",
  baseUrl: "https://autoglm-api.zhipuai.cn/autoclaw-proxy/proxy/autoclaw/v1/chat/completions",
  authType: "oauth",
  authHeader: "bearer",
  models: [
    {
      id: "auto",
      name: "Auto",
      contextLength: 131072,
      maxOutputTokens: 16384,
      supportsReasoning: true,
      toolCalling: true,
    },
    {
      id: "auto-fast",
      name: "Auto-Fast",
      contextLength: 131072,
      maxOutputTokens: 16384,
      toolCalling: true,
    },
    {
      id: "glm-5.3",
      name: "GLM-5.3",
      contextLength: 131072,
      maxOutputTokens: 16384,
      supportsReasoning: true,
      toolCalling: true,
    },
    {
      id: "glm-5.3-flash",
      name: "GLM-5.3-Flash",
      contextLength: 131072,
      maxOutputTokens: 16384,
      toolCalling: true,
    },
  ],
};
