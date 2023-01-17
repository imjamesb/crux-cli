export interface CruxApiRequest {
  /** The base URL to use whilst building the request, defaults to `"https://crux.land/api/"` */
  baseUrl?: string | URL;
}

export interface CruxAuthenticatedApiRequest extends CruxApiRequest {
  user: number;
  secret: string;
}
