import { KVNamespace } from '@cloudflare/workers-types';

export interface Env {
  BASE_URL: string;
  JWT_SECRET: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  SANDBOX: string | undefined;
  CONSO_API: KVNamespace;
}
