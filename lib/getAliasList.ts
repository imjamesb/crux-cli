import { useAuthentication } from "./auth.ts";

export interface AliasEntry {
  alias: string;
  owner: number;
  tags: Record<string, string>;
}

export async function getAliasList(origin: string): Promise<AliasEntry[]> {
  const auth = {} as { user: string };
  await useAuthentication(origin, auth);
  const response = await fetch(`https://${origin}/api/alias/list`, {
    method: "POST",
    body: JSON.stringify({ user: auth.user }),
  });
  if (response.status === 200) {
    return await response.json();
  }
  throw new Error("Something went wrong!");
}
