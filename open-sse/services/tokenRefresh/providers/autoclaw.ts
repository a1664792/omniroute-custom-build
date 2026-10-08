// @ts-nocheck
// AutoClaw (智谱 AutoGLM CN) token refresh — signed app request, 24h TTL tokens.
export async function refreshAutoClawToken(
  refreshToken,
  providerSpecificData: unknown = null,
  log,
  proxyConfig: unknown = null
) {
  const { createHash, randomUUID } = await import("node:crypto");
  const APP_ID = "100003";
  const APP_KEY = "38d2391985e2369a5fb8227d8e6cd5e5";
  const psd = (providerSpecificData || {}) as Record<string, unknown>;
  const deviceId = typeof psd.deviceId === "string" ? psd.deviceId : "";

  const ts = String(Math.floor(Date.now() / 1000));
  const sign = createHash("md5").update(`${APP_ID}&${ts}&${APP_KEY}`).digest("hex");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Auth-Appid": APP_ID,
    "X-Auth-TimeStamp": ts,
    "X-Auth-Sign": sign,
    "X-Product": "autoclaw",
    "X-Version": "1.9.1",
    "X-Tm": "win",
    "X-Trace-Id": randomUUID(),
  };

  const response = await fetch("https://autoglm-api.zhipuai.cn/userapi/v1/refresh", {
    method: "POST",
    headers,
    body: JSON.stringify({
      source_id: "autoclaw",
      device_id: deviceId,
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.code !== 0 || !data.data?.access_token) {
    log?.error?.("TOKEN_REFRESH", "AutoClaw refresh failed", {
      status: response.status,
      body: JSON.stringify(data).slice(0, 300),
    });
    return null;
  }

  log?.info?.("TOKEN_REFRESH", "AutoClaw token refreshed");
  return {
    accessToken: String(data.data.access_token).replace(/^Bearer\s+/i, ""),
    refreshToken: String(data.data.refresh_token || refreshToken).replace(/^Bearer\s+/i, ""),
  };
}
