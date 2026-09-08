// @ts-nocheck
// AutoClaw (智谱 AutoGLM CN) wallet/points fetcher.
// Endpoint: GET /agent-assetmgr/api/v2/wallets?biz_app_id=autoclaw
// Auth: app-sign headers + Authorization Bearer (NOT X-Authorization).
import { createHash, randomUUID } from "node:crypto";

const APP_ID = "100003";
const APP_KEY = "38d2391985e2369a5fb8227d8e6cd5e5";
const HOST = "https://autoglm-api.zhipuai.cn";

export async function getAutoClawWallet(
  accessToken: string,
  providerSpecificData: Record<string, unknown> = {},
  log?: { info?: (t: string, m: string, d?: unknown) => void; error?: (t: string, m: string, d?: unknown) => void }
): Promise<{ total: number; wallets: Array<{ key: string; name: string; balance: number }> } | null> {
  const token = String(accessToken || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const deviceId = typeof providerSpecificData.deviceId === "string" ? providerSpecificData.deviceId : "";

  const ts = String(Math.floor(Date.now() / 1000));
  const sign = createHash("md5").update(`${APP_ID}&${ts}&${APP_KEY}`).digest("hex");
  const headers: Record<string, string> = {
    "X-Auth-Appid": APP_ID,
    "X-Auth-TimeStamp": ts,
    "X-Auth-Sign": sign,
    "X-Product": "autoclaw",
    "X-Version": "1.9.1",
    "X-Tm": "win",
    "X-Trace-Id": randomUUID(),
    Authorization: `Bearer ${token}`,
  };
  if (deviceId) headers["device-id"] = deviceId;

  const resp = await fetch(`${HOST}/agent-assetmgr/api/v2/wallets?biz_app_id=autoclaw`, { headers });
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || data.code !== 0 || !data.data) {
    log?.error?.("AUTOCCLAW_USAGE", "wallet fetch failed", {
      status: resp.status,
      body: JSON.stringify(data).slice(0, 200),
    });
    return null;
  }
  const wallets = Array.isArray(data.data.wallets)
    ? data.data.wallets.map((w) => ({
        key: String(w.public_wallet_type || w.key || "points"),
        name: String(w.display_name || w.key || "积分"),
        balance: Number(w.balance || 0),
      }))
    : [];
  const total = Number(data.data.total_balance || 0);

  // Dashboard usage shape: single unlimited-window "积分余额" entry (agentrouter pattern)
  const balanceQuota = {
    used: 0,
    total: 0,
    remaining: total,
    remainingPercentage: total > 0 ? 100 : 0,
    resetAt: null,
    unlimited: true,
    currency: "POINTS",
    displayName: "AutoClaw 积分余额",
  };

  return {
    plan: "AutoClaw",
    quotas: { balance: balanceQuota },
    remainingPoints: total,
    wallets,
    message: total > 0 ? undefined : "AutoClaw 积分余额为 0（奖励钱包为空或未登录）",
  };
}
