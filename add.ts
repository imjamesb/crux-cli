import type { CruxApiRequest } from "./_types.ts";
import { base58, encode, fnv1a, log } from "./_deps.ts";
import { defaultBaseUrl } from "./_constants.ts";
import CruxError from "./error.ts";

export interface CruxAddOptions extends CruxApiRequest {
  name: string;
  content: Uint8Array;
}

export interface CruxAddResult {
  created: boolean;
  script: URL;
}

export async function add(
  { baseUrl, name, content }: CruxAddOptions,
): Promise<CruxAddResult> {
  const expectedId = base58.encode(BigInt(fnv1a(content)));
  const addUrl = new URL("add", baseUrl || defaultBaseUrl);
  log("Uplading %j to %j (%s)", name, addUrl.href, expectedId);
  const response = await fetch(addUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      name,
      content: encode(content),
    }),
  });
  if (response.headers.get("content-type")?.includes("json")) {
    const body = await response.json();
    if (typeof body.error === "string") {
      if (
        body.error.startsWith("File already exists (") &&
        body.error.endsWith(")")
      ) {
        return {
          script: new URL(
            "../" + body.error.slice(21, -1),
            baseUrl || defaultBaseUrl,
          ),
          created: false,
        };
      }
      throw new CruxError(body.error);
    }
    if (typeof body.id === "string") {
      return {
        script: new URL("../" + body.id, baseUrl || defaultBaseUrl),
        created: true,
      };
    }
    log("An unknown error occured, response (%s): %j", expectedId, body);
    throw new CruxError("An unknown error occured!");
  }
  throw new CruxError(`"${addUrl.href}" returned an invalid response!`);
}

export default add;
