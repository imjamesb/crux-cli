import { base58, fnv1a } from "./_deps.ts";
import { dirname, expand, parse, resolve, stringify } from "./_cli_deps.ts";
import { defaultBaseUrl } from "./_constants.ts";

const e = new TextEncoder();

const defaultBaseDir = "~/.crux/auth";

// deno-fmt-ignore
const encodeName = (url?: string | URL) => base58.encode(BigInt(fnv1a(e.encode(url ? url instanceof URL ? url.href : url : defaultBaseUrl.href)))) + ".env";
// deno-fmt-ignore
const resolveAuthFile = (baseDir?: string, url?: string | URL) => resolve(Deno.cwd(), expand(baseDir || defaultBaseDir), encodeName(url));

export interface CruxCliAuthInfo {
  baseUrl?: string | URL;
  baseDir?: string;
}

export async function saveAuth(
  {
    baseDir,
    baseUrl,
    user,
    secret,
    login,
  }: CruxCliAuthInfo & { login?: string; user: number; secret: string },
) {
  const authFilePath = resolveAuthFile(baseDir, baseUrl);
  await Deno.mkdir(dirname(authFilePath), { recursive: true });
  await Deno.writeTextFile(
    authFilePath,
    stringify({
      CRUX_CLI_AUTH_INFO_USER: login || "",
      CRUX_CLI_AUTH_USER_ID: "" + user,
      CRUX_CLI_AUTH_USER_SECRET: secret,
    }),
  );
}

const USER_ID_REGEX = /^[0-9]+$/g;

export async function getAuth(
  {
    baseDir,
    baseUrl,
  }: CruxCliAuthInfo,
): Promise<undefined | { login?: string; user: number; secret: string }> {
  try {
    const authFilePath = resolveAuthFile(baseDir, baseUrl);
    const contents = await Deno.readTextFile(authFilePath);
    let parsed: Record<string, string>;
    try {
      parsed = parse(contents);
    } catch {
      return;
    }
    if (
      parsed.CRUX_CLI_AUTH_USER_ID &&
      USER_ID_REGEX.test(parsed.CRUX_CLI_AUTH_USER_ID) &&
      parsed.CRUX_CLI_AUTH_USER_SECRET
    ) {
      return {
        user: parseInt(parsed.CRUX_CLI_AUTH_USER_ID),
        secret: parsed.CRUX_CLI_AUTH_USER_SECRET,
        login: parsed.CRUX_CLI_AUTH_INFO_USER,
      };
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return;
    throw error;
  }
}

export async function removeAuth({ baseDir, baseUrl }: CruxCliAuthInfo) {
  const auth = await getAuth({ baseDir, baseUrl });
  await Deno.remove(resolveAuthFile(baseDir, baseUrl));
  return auth;
}
