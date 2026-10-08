// @ts-nocheck
import { DefaultExecutor } from "./default.ts";
import type { ProviderCredentials } from "./base.ts";
import { createHash, randomUUID } from "node:crypto";

const APP_ID = "100003";
const APP_KEY = "38d2391985e2369a5fb8227d8e6cd5e5";
const UPSTREAM_BASE =
  "https://autoglm-api.zhipuai.cn/autoclaw-proxy/proxy/autoclaw/v1/chat/completions";
const DEFAULT_UPSTREAM_MODEL = "zai_auto";
// client model id -> upstream X-Request-Model
const MODEL_MAP: Record<string, string> = {
  auto: "zai_auto",
  "auto-fast": "zai_auto-fast",
  "glm-5.3": "zai_auto",
  "glm-5.3-flash": "zai_glm-5.3-flash",
};

export class AutoclawExecutor extends DefaultExecutor {
  constructor() {
    super("autoclaw");
  }

  buildUrl() {
    return UPSTREAM_BASE;
  }

  buildHeaders(credentials: ProviderCredentials | null, stream = true, clientHeaders?: Record<string, string> | null, model?: string | null) {
    const ts = String(Math.floor(Date.now() / 1000));
    const sign = createHash("md5").update(`${APP_ID}&${ts}&${APP_KEY}`).digest("hex");
    const token = (credentials?.accessToken || credentials?.apiKey || "").replace(/^Bearer\s+/i, "");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: stream ? "text/event-stream" : "application/json",
      "X-Auth-Appid": APP_ID,
      "X-Auth-TimeStamp": ts,
      "X-Auth-Sign": sign,
      "X-Product": "autoclaw",
      "X-Version": "1.9.1",
      "X-Tm": "win",
      "X-Trace-Id": randomUUID(),
      "X-Authorization": `Bearer ${token}`,
      "X-Request-Id": randomUUID(),
      "X-Request-Model": (model && MODEL_MAP[model]) || DEFAULT_UPSTREAM_MODEL,
    };
    return headers;
  }

  override transformRequest(
    _model: string,
    body: unknown,
    _stream: boolean,
    _credentials: ProviderCredentials
  ): unknown {
    // upstream ignores body.model and requires stream=true
    const cloned = typeof body === "object" && body !== null ? { ...(body as Record<string, unknown>) } : {};
    cloned.model = "x";
    cloned.stream = true;
    return cloned;
  }
}
