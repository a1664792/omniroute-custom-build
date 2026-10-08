import type { RegistryEntry } from "../../shared.ts";

// WorkBuddy 国际版 — www.workbuddy.ai, the chat backend of the international
// WorkBuddy AI desktop client.
//
// Wire format recovered from the WorkBuddyAI 5.6.2 client + the WorkPet account
// bridge (D:\ruanjian\WorkPet\daemon.js, `wbIntlSendMessage`):
//
//   POST https://www.workbuddy.ai/v2/chat/completions
//   authorization: Bearer <client access token>
//   x-domain / x-product / x-ide-type / x-ide-name / x-ide-version /
//   x-private-data / x-codebuddy-request / x-user-id  (client identity)
//   body: messages[].content is an ARRAY of { type: "text", text } parts,
//         the FIRST message MUST be role "system",
//         stream is always true (upstream ignores stream:false).
//
// Omitting the client identity headers answers
// `403 only WorkBuddy client is allowed`; omitting the leading system message
// answers `400 code 11128 first message is not system prompt`.
//
// Credential: the client's own access token (JWT, iss
// `https://www.workbuddy.ai/auth/realms/copilot`). WorkPet can export it; the
// token is long lived, and no refresh flow is wired here because the Keycloak
// client that minted it (`azp: console`) is a confidential client.
//
// Verified against the live endpoint on 2026-10-08: all 11 model ids below
// answered HTTP 200 with an OpenAI-shaped SSE stream. `toolCalling` is
// deliberately not advertised — tool support was probed but not confirmed, and
// the upstream always emits an empty `tool_calls: []` in its delta shape.
export const workbuddyIntlProvider: RegistryEntry = {
  id: "workbuddy-intl",
  alias: "wbi",
  format: "openai",
  executor: "workbuddy-intl",
  baseUrl: "https://www.workbuddy.ai/v2/chat/completions",
  authType: "apikey",
  authHeader: "bearer",
  // Upstream always answers with an SSE stream and rejects stream:false.
  forceStream: true,
  models: [
    { id: "default-model", name: "WorkBuddy Auto" },
    { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" },
    { id: "hy3", name: "Hunyuan 3", supportsReasoning: true },
    { id: "glm-5.2", name: "GLM-5.2" },
    { id: "glm-5.3", name: "GLM-5.3", supportsReasoning: true },
    { id: "glm-5.3-flash", name: "GLM-5.3 Flash" },
    { id: "kimi-k2.6", name: "Kimi K2.6" },
    { id: "kimi-k3", name: "Kimi K3" },
    { id: "gpt-5.4", name: "GPT-5.4" },
    { id: "gpt-5.5", name: "GPT-5.5" },
    { id: "minimax-m3", name: "MiniMax M3" },
  ],
};
