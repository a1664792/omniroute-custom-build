import type { RegistryEntry } from "../../shared.ts";

// AutoClaw (智谱 AutoGLM CN) — free GLM credits via the AutoClaw desktop client.
// Wire format reverse-engineered from the client + autoclaw2api (sitimas9):
// app-sign headers (md5 of appid&ts&appkey) + X-Authorization bearer + X-Request-Model.
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
      name: "AutoClaw Auto (GLM)",
      contextLength: 131072,
      maxOutputTokens: 16384,
      supportsReasoning: true,
      toolCalling: true,
    },
  ],
};
