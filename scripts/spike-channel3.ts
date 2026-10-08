// Week 1 check: Channel3 search works and our normalizer understands its shape.
//   pnpm spike:channel3 "kids birthday party balloons"

import "./_env";
import { searchProducts } from "../src/lib/channel3";
import { usd } from "../src/lib/policy/engine";

async function main() {
  const query = process.argv.slice(2).join(" ") || "kids birthday party balloons";
  const { products, raw } = await searchProducts({ query, limit: 8 });

  const first = Array.isArray(raw) ? raw[0] : (raw as { products?: unknown[] }).products?.[0];
  console.log("Raw first product (check our normalizer matches this shape):");
  console.log(JSON.stringify(first, null, 2)?.slice(0, 2500));

  console.log(`\nNormalized (${products.length}):`);
  console.table(
    products.map((p) => ({ title: p.title.slice(0, 50), price: usd(p.priceCents), merchant: p.merchantDomain, category: p.category })),
  );
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
