import type { CruxAuthenticatedApiRequest } from "./_types.ts";
import { log } from "./_deps.ts";
import { defaultBaseUrl } from "./_constants.ts";
import CruxError from "./error.ts";

export interface CruxAliasRequestOptions extends CruxAuthenticatedApiRequest {
  alias: string;
}

export async function aliasRequest({
  baseUrl,
  user,
  secret,
  alias,
}: CruxAliasRequestOptions) {
  const aliasRequestUrl = new URL("alias/request", baseUrl || defaultBaseUrl);
  const response = await fetch(aliasRequestUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user,
      secret,
      alias,
    }),
  });
  if (response.status === 201) return;
  if (response.headers.get("content-type")?.includes("json")) {
    const body = await response.json();
    if (typeof body.error === "string") {
      throw new CruxError(body.error);
    }
    log("Unknown response %j", body);
  }
  throw new CruxError("Could not request alias for unknown reasons!");
}

export default aliasRequest;
