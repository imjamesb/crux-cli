import { useAuthentication } from "./auth.ts";

export async function request(origin: string, alias: string): Promise<boolean> {
  const payload = { alias };
  await useAuthentication(origin, payload);
  const response = await fetch(`https://${origin}/api/alias/request`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (response.status === 201) return true;
  return false;
}
