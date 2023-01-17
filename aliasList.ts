import type { CruxApiRequest } from "./_types.ts";
import { defaultBaseUrl } from "./constants.ts";
import CruxError from "./error.ts";

export interface CruxAliasListOptions extends CruxApiRequest {
  user: number;
}

export interface Alias {
  alias: string;
  owner: number;
  tags: Record<string, string>;
}

export async function aliasList(
  { baseUrl, user }: CruxAliasListOptions,
): Promise<Alias[]> {
  const aliasListUrl = new URL("alias/list", baseUrl || defaultBaseUrl);
  const response = await fetch(aliasListUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ user }),
  });
  if (
    response.headers.get("content-type")?.includes("json") &&
    response.status === 200
  ) {
    return await response.json();
  }
  throw new CruxError("Unable to get alias list!");
}
