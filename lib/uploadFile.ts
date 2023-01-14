import { basename } from "https://deno.land/std@0.172.0/path/mod.ts";
import { debug } from "https://crux.land/debug@0.1.0";

function encode(data: Uint8Array) {
  // deno-fmt-ignore
  const base64abc = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
    'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a',
    'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
    'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4',
    '5', '6', '7', '8', '9', '+', '/'];
  const uint8 = new Uint8Array(data);
  let result = "",
    i;
  const l = uint8.length;
  for (i = 2; i < l; i += 3) {
    result += base64abc[uint8[i - 2] >> 2];
    result += base64abc[((uint8[i - 2] & 0x03) << 4) | (uint8[i - 1] >> 4)];
    result += base64abc[((uint8[i - 1] & 0x0f) << 2) | (uint8[i] >> 6)];
    result += base64abc[uint8[i] & 0x3f];
  }
  if (i === l + 1) {
    result += base64abc[uint8[i - 2] >> 2];
    result += base64abc[(uint8[i - 2] & 0x03) << 4];
    result += "==";
  }
  if (i === l) {
    result += base64abc[uint8[i - 2] >> 2];
    result += base64abc[((uint8[i - 2] & 0x03) << 4) | (uint8[i - 1] >> 4)];
    result += base64abc[(uint8[i - 1] & 0x0f) << 2];
    result += "=";
  }
  return result;
}

export async function uploadFile(
  origin: string,
  path: string,
): Promise<string> {
  const response = await fetch(`https://${origin}/api/add`, {
    method: "POST",
    body: JSON.stringify({
      name: basename(path),
      content: encode(await Deno.readFile(path)),
    }),
  });
  if (response.headers.get("content-type")?.includes("json")) {
    const content = await response.json();
    if (typeof content.error === "string") {
      if (
        content.error.startsWith("File already exists (") &&
        content.error.endsWith(")")
      ) return content.error.slice(21, -1);
    }
    if (typeof content.id === "string") return content.id;
    debug("error")("%j", content);
  }
  throw new Error("Something went wrong!");
}
