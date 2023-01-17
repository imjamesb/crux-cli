// deno.land/std - Standard library
export { encode } from "https://deno.land/std@0.173.0/encoding/base64.ts";
export { basename } from "https://deno.land/std@0.173.0/path/mod.ts";

export { fnv1a } from "https://crux.land/6bxRiQ";

import { Base } from "https://crux.land/base@0.1.0";
export const base58 = new Base(
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
);

import { debug } from "https://crux.land/debug@0.1.0";
export const log = debug("crux:client");
