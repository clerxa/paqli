import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z0-9.\-]+$/, "Symbole invalide"),
});

export type FetchEquityPriceResult =
  | {
      found: true;
      ticker: string;
      name: string;
      price: number;
      currency: string;
      fetchedAt: string;
    }
  | { found: false; reason?: string };

/**
 * Récupère le dernier cours d'un titre via Yahoo Finance (public, sans clé).
 * Utilisé par le configurateur pour valoriser l'equity d'une entreprise cotée.
 */
export const fetchEquityPrice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<FetchEquityPriceResult> => {
    const ticker = data.ticker.toUpperCase();
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker,
    )}?interval=1d&range=1d`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        return { found: false, reason: `http_${res.status}` };
      }

      const json = (await res.json()) as {
        chart?: {
          result?: Array<{
            meta?: {
              symbol?: string;
              longName?: string;
              shortName?: string;
              regularMarketPrice?: number;
              currency?: string;
            };
          }>;
        };
      };

      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) {
        return { found: false, reason: "no_price" };
      }

      return {
        found: true,
        ticker: meta.symbol ?? ticker,
        name: meta.longName ?? meta.shortName ?? ticker,
        price: meta.regularMarketPrice,
        currency: meta.currency ?? "USD",
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("[fetchEquityPrice] error", err);
      return { found: false, reason: "fetch_error" };
    }
  });
