/**
 * usage/openaiCompatible.ts — Generic OpenAI-compatible provider quota fetcher.
 *
 * Tries New-API compatible and OpenAI-compatible balance endpoints on the
 * provider's own baseUrl (from provider_nodes). Supports TRAE CN (trae-local-api)
 * and any New-API style provider that exposes /api/user/self or /v1/usage.
 */

import { getProviderNodeById } from "@/lib/db/providers/nodes";

type JsonRecord = Record<string, unknown>;

function toNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseCredits(data: JsonRecord): number | null {
  // try common shapes
  if (typeof data.credits === 'number') return data.credits;
  if (typeof data.credits_remaining === 'number') return data.credits_remaining;
  if (typeof data.remaining === 'number') return data.remaining;
  if (typeof data.balance === 'number') return data.balance;
  // nested data.credits
  const d = data.data as JsonRecord | undefined;
  if (d) {
    if (typeof d.quota === 'number') return d.quota;
    if (typeof d.credits === 'number') return d.credits;
    if (typeof d.balance === 'number') return d.balance;
  }
  // data[0].credits_total for trae /v1/usage list shape
  const arr = (data as JsonRecord).data as unknown;
  if (Array.isArray(arr) && arr.length > 0) {
    const first = arr[0] as JsonRecord;
    if (typeof first.credits_total === 'number') return first.credits_total;
    if (typeof first.credits_remaining === 'number') return first.credits_remaining;
    if (typeof first.remaining === 'number') return first.remaining;
  }
  // quotas fallback
  const q = (data as JsonRecord).quotas as JsonRecord | undefined;
  if (q) {
    for (const v of Object.values(q)) {
      const rec = v as JsonRecord;
      if (typeof rec.remaining === 'number') return rec.remaining;
    }
  }
  return null;
}

export async function getOpenAICompatibleUsage(
  connectionId: string,
  connection: JsonRecord,
) {
  const provider = String(connection.provider || '');
  const apiKey = String(connection.apiKey || connection.api_key || '');

  // Resolve baseUrl from provider_nodes
  let baseUrl: string | null = null;
  try {
    const node = (await getProviderNodeById(provider)) as JsonRecord | null;
    if (node) {
      baseUrl = (node.baseUrl as string) || (node.base_url as string) || null;
    }
  } catch (_) {
    // ignore
  }
  // fallback: providerSpecificData may carry baseUrl
  if (!baseUrl) {
    const psd = (connection.providerSpecificData as JsonRecord) || {};
    baseUrl = (psd.baseUrl as string) || (psd.base_url as string) || (psd.baseURL as string) || null;
  }

  if (!baseUrl) {
    return { message: `OpenAI-compatible provider baseUrl not found for ${provider}` };
  }

  const cleanBase = baseUrl.replace(/\/+$/, '');
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers['api-key'] = apiKey;
  }

  const endpoints = [
    `${cleanBase}/v1/usage`,
    `${cleanBase}/api/user/self`,
    `${cleanBase}/v1/dashboard/billing/usage`,
    `${cleanBase}/dashboard/billing/usage`,
    `${cleanBase}/v1/billing/usage`,
  ];

  let lastError = '';
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        lastError = `${url} -> ${res.status}`;
        // try next endpoint unless 401 (auth error)
        if (res.status === 401 || res.status === 403) {
          // auth error, no need to try others with same key
        }
        continue;
      }
      const data = (await res.json()) as JsonRecord;
      const credits = parseCredits(data);
      if (credits === null || !Number.isFinite(credits)) {
        lastError = `${url} -> no credits in response`;
        continue;
      }

      const remaining = Math.max(0, toNumber(credits, 0));
      // If we have total somewhere, use it; otherwise treat as balance
      const total = remaining;
      const remainingPercentage = remaining > 0 ? 100 : 0;

      // Shape into quota card
      return {
        plan: 'TRAE Credits',
        quotas: {
          credits: {
            used: 0,
            total,
            remaining,
            remainingPercentage,
            resetAt: null,
            unlimited: false,
            displayName: 'Credits',
            currency: 'credits',
          },
        },
        credits: remaining,
        balance: remaining,
      };
    } catch (e) {
      lastError = `${url} -> ${(e as Error).message}`;
      continue;
    }
  }

  return { message: `OpenAI-compatible quota not available (${lastError || 'no endpoint'})` };
}