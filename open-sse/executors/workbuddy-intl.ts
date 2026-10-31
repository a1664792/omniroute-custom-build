// @ts-nocheck
// WorkBuddy 国际版 (www.workbuddy.ai) executor.
//
// The upstream endpoint is an OpenAI-shaped SSE chat backend that only answers
// requests carrying the desktop client's identity headers, an array-of-parts
// content per message, a leading system message, and stream=true.
// Wire format recovered from WorkBuddyAI 5.6.2 + WorkPet's `wbIntlSendMessage`.
import { randomBytes, randomUUID } from "node:crypto";
import { DefaultExecutor } from "./default.ts";
import type { ProviderCredentials } from "./base.ts";

const UPSTREAM_URL = "https://www.workbuddy.ai/v2/chat/completions";
const CLIENT_VERSION = "5.6.2";
const CLIENT_UA = `WorkBuddy/${CLIENT_VERSION} WorkBuddy AI/${CLIENT_VERSION} CLI/2.137.1`;
// Upstream rejects any request whose first message is not a system prompt
// (400 / code 11128 "first message is not system prompt").
const SYSTEM_PLACEHOLDER = "You are WorkBuddy, an AI coding assistant.";

/** `sub` (== uid) of the client access token, needed for the `x-user-id` header. */
function uidFromToken(token: string): string {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return "";
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return String(json?.sub || json?.user_id || json?.uid || "");
  } catch {
    return "";
  }
}

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

/** Normalise string / array / null content into the array-of-parts shape upstream requires. */
function toContentParts(content: unknown): unknown {
  if (Array.isArray(content)) return content;
  if (typeof content === "string") return [{ type: "text", text: content }];
  if (content === null || content === undefined) return [{ type: "text", text: "" }];
  return content;
}

export class WorkBuddyIntlExecutor extends DefaultExecutor {
  constructor() {
    super("workbuddy-intl");
  }

  buildUrl() {
    return UPSTREAM_URL;
  }

  buildHeaders(
    credentials: ProviderCredentials | null,
    _stream = true,
    _clientHeaders?: Record<string, string> | null,
    _model?: string | null
  ) {
    const token = String(credentials?.accessToken || credentials?.apiKey || "").replace(
      /^Bearer\s+/i,
      ""
    );
    const uid = uidFromToken(token);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
      Origin: "https://www.workbuddy.ai",
      Referer: "https://www.workbuddy.ai/",
      "User-Agent": CLIENT_UA,
      // Client identity gate: without these the upstream answers
      // 403 "only WorkBuddy client is allowed".
      "x-domain": "www.workbuddy.ai",
      "x-product": "WorkBuddy",
      "x-ide-type": "WorkBuddy",
      "x-ide-name": "WorkBuddy",
      "x-ide-version": CLIENT_VERSION,
      "x-private-data": "true",
      "x-codebuddy-request": "1",
      // Per-request conversation identity.
      "x-conversation-id": randomUUID(),
      "x-conversation-request-id": randomHex(16),
      "x-conversation-message-id": randomHex(16),
      "x-request-id": randomHex(16),
      "x-agent-intent": "craft",
      "x-agent-purpose": "conversation",
    };
    if (uid) headers["x-user-id"] = uid;
    return headers;
  }

  override transformRequest(
    _model: string,
    body: unknown,
    _stream: boolean,
    _credentials: ProviderCredentials
  ): unknown {
    const cloned: Record<string, unknown> =
      typeof body === "object" && body !== null ? { ...(body as Record<string, unknown>) } : {};

    // Upstream ignores stream:false and always answers SSE.
    cloned.stream = true;
    cloned.stream_options = {
      include_usage: true,
      ...((cloned.stream_options as Record<string, unknown> | undefined) ?? {}),
    };

    const messages = Array.isArray(cloned.messages)
      ? (cloned.messages as Array<Record<string, unknown>>).map((m) => ({
          ...m,
          content: toContentParts(m?.content),
        }))
      : [];

    if (messages.length === 0 || messages[0]?.role !== "system") {
      messages.unshift({ role: "system", content: [{ type: "text", text: SYSTEM_PLACEHOLDER }] });
    }
    cloned.messages = messages;

    return cloned;
  }
}
