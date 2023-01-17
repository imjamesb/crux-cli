import { basename } from "./_deps.ts";
import add from "./add.ts";

export interface CruxAddFileOptions {
  /** The base URL to use whilst building the request, defaults to `"https://crux.land/api/"` */
  baseUrl?: string | URL;
  path: string;
}

export async function addFile({ baseUrl, path }: CruxAddFileOptions) {
  return await add({
    baseUrl,
    name: basename(path),
    content: await Deno.readFile(path),
  });
}
