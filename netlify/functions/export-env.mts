// One-shot reader for production environment variables. Netlify only
// reveals secret values to code running on Netlify, so this function
// prints them for the operator and nothing else. Delete it after use.
export default async (req: Request) => {
  const expected = Netlify.env.get("EXPORT_ENV_SECRET");
  const provided = new URL(req.url).searchParams.get("secret") ?? "";
  if (!expected || !timingSafeEqual(provided, expected)) {
    return new Response("not found\n", { status: 404 });
  }

  const keys = Object.keys(Netlify.env.toObject()).sort();
  const body = keys.map((key) => `${key}=${Netlify.env.get(key) ?? ""}`).join("\n");
  return new Response(body + "\n", {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};

function timingSafeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < length; i++) {
    mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return mismatch === 0;
}
