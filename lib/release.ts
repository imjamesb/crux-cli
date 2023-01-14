import { useAuthentication } from "./auth.ts";

export interface ReleaseOptions {
  origin: string;
  name: string;
  version: string;
  id: string;
  dir?: string;
}

export async function release(
  {
    origin,
    name: alias,
    version: tag,
    id: script,
    dir,
  }: ReleaseOptions,
) {
  const payload = { alias, tag, script };
  await useAuthentication(origin, payload, { dir });
  const response = await fetch(`https://${origin}/api/alias/release`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (response.headers.get("content-type")?.includes("json")) {
    const content = await response.json();
    if (content.error) {
      throw new Error(content.error);
    }
  }
  if (response.status === 201) return;
  throw new Error("Could not publish release!");
}
