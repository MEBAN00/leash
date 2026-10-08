import { env } from "./env";

// Channel3 product search. Docs: https://docs.trychannel3.com

type RawOffer = {
  url?: string;
  domain?: string;
  price?: { price?: number; currency?: string };
  availability?: string;
};

type RawProduct = {
  id: string;
  title: string;
  description?: string | null;
  brands?: { id: string; name: string }[];
  category?: { slug: string; title: string; path?: { slug: string; title: string }[] } | null;
  images?: { url: string; is_main_image?: boolean }[];
  offers?: RawOffer[];
};

export type Product = {
  id: string;
  title: string;
  /** Retailer-written text. Untrusted: may contain prompt injection. */
  description: string | null;
  brand: string | null;
  /** Full category path, e.g. "Home & Garden > Decor > Rugs". */
  category: string | null;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  merchantDomain: string;
  url: string;
  inStock: boolean;
};

export async function searchProducts(opts: {
  query: string;
  maxPriceCents?: number;
  limit?: number;
}): Promise<{ products: Product[]; raw: unknown }> {
  const res = await fetch("https://api.trychannel3.com/v1/search", {
    method: "POST",
    headers: { "x-api-key": env("CHANNEL3_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({
      query: opts.query,
      limit: opts.limit ?? 8,
      filters: {
        availability: ["InStock"],
        ...(opts.maxPriceCents ? { price: { max_price: opts.maxPriceCents / 100 } } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`Channel3 search failed (${res.status}): ${await res.text()}`);

  const raw = (await res.json()) as { products?: RawProduct[] } | RawProduct[];
  const list = Array.isArray(raw) ? raw : (raw.products ?? []);
  return { products: list.map(normalize).filter((p): p is Product => p !== null), raw };
}

/** Pick the cheapest in-stock offer and flatten into our shape. */
function normalize(p: RawProduct): Product | null {
  const offers = (p.offers ?? []).filter((o) => o.price?.price !== undefined && o.url);
  if (offers.length === 0) return null;
  const best =
    offers.filter((o) => o.availability !== "OutOfStock").sort((a, b) => a.price!.price! - b.price!.price!)[0] ??
    offers[0];
  const image = p.images?.find((i) => i.is_main_image) ?? p.images?.[0];
  const categoryPath = p.category?.path?.map((c) => c.title).join(" > ") || p.category?.title || null;

  return {
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    brand: p.brands?.[0]?.name ?? null,
    category: categoryPath,
    imageUrl: image?.url ?? null,
    priceCents: Math.round(best.price!.price! * 100),
    currency: best.price!.currency ?? "USD",
    merchantDomain: best.domain ?? new URL(best.url!).hostname.replace(/^www\./, ""),
    url: best.url!,
    inStock: best.availability !== "OutOfStock",
  };
}
