import { expand } from "https://crux.land/expand@0.2.0";
import { join } from "https://deno.land/std@0.172.0/path/mod.ts";

export interface AuthenticationInformation {
  id: number;
  secret: string;
}

export interface AuthenticationOptions {
  /** Defaults to `~/.config/crux` */
  dir?: string;
}

export async function saveAuthentication(
  origin: string,
  info: AuthenticationInformation,
  { dir = "~/.crux/auth" }: AuthenticationOptions = {},
) {
  dir = expand(dir);
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(
    join(dir, origin + ".json"),
    JSON.stringify(info, null, 2),
  );
}

export async function removeAuthentication(
  origin: string,
  { dir = "~/.crux/auth" }: AuthenticationOptions = {},
) {
  dir = expand(dir);
  await Deno.remove(join(dir, origin + ".json"));
}

export async function useAuthentication(
  origin: string,
  body: Record<string, unknown>,
  { dir = "~/.crux/auth" }: AuthenticationOptions = {},
) {
  dir = expand(dir);
  const { user, secret } = JSON.parse(
    await Deno.readTextFile(join(dir, origin + ".json")),
  );
  Object.assign(body, { user, secret });
}
