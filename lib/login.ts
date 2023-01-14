import { createRequest, vfetch } from "https://crux.land/vfetch@0.4.0";

export interface GetLoginUrlOptions {
  origin?: string;
}

export async function getLoginUrl(
  { origin = "https://crux.land" }: GetLoginUrlOptions = {},
): Promise<URL> {
  const response = await vfetch(createRequest(`${origin}/api/login`, {
    method: "GET",
    mode: "navigate",
    redirect: "manual",
  }));

  if (response.status !== 307) {
    throw new Error(
      "Could not get login URL! Expected a redirect response, got status " +
          response.status + " " + response.text || "",
    );
  }

  if (!response.headers.has("location")) {
    throw new Error("Response is missing location header!");
  }

  return new URL(response.headers.get("location")!);
}
