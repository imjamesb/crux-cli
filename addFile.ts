import type { CruxApiRequest } from "./types.ts";
import { basename } from "./_deps.ts";
import add from "./add.ts";

export interface CruxAddFileOptions extends CruxApiRequest {
  path: string;
}

export async function addFile({ baseUrl, path }: CruxAddFileOptions) {
  return await add({
    baseUrl,
    name: basename(path),
    content: await Deno.readFile(path),
  });
}
