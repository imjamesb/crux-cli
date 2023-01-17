import type { CruxAuthenticatedApiRequest } from "./_types.ts";
import { log } from "./_deps.ts";
import { defaultBaseUrl } from "./_constants.ts";
import CruxError from "./error.ts";

export interface CruxAliasReleaseOptions extends CruxAuthenticatedApiRequest {
  alias: string;
  tag: string;
  script: string;
}

export async function aliasRelease({
  baseUrl,
  user,
  secret,
  alias,
  tag,
  script,
}: CruxAliasReleaseOptions) {
  const aliasReleaseUrl = new URL("alias/release", baseUrl || defaultBaseUrl);
  const response = await fetch(aliasReleaseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user,
      secret,
      alias,
      tag,
      script,
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
  throw new CruxError("Could not release alias for unknown reasons!");
}

export default aliasRelease;
