/** Copies only public config. Never emits keys, tokens, or env contents. */
const values = new Map<string, string>();
for (const path of ["apps/web/.env.local", "packages/backend/.env.local"]) {
  const file = Bun.file(path);
  if (!(await file.exists())) continue;
  for (const line of (await file.text()).split(/\r?\n/)) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line);
    if (match) values.set(match[1], match[2]);
  }
}
const key = values.get("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  url = values.get("NEXT_PUBLIC_CONVEX_URL");
if (!key || !url)
  throw new Error(
    "Public web configuration is missing. Add it before preparing mobile dev env.",
  );
await Bun.write(
  "apps/mobile/.env.local",
  `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=${key}\nEXPO_PUBLIC_CONVEX_URL=${url}\n`,
);
console.log(
  "Created mobile dev env with the two public keys. No values printed.",
);
export {};
