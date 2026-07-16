import * as qs from 'qs';
import pino from 'pino';
import { Env } from './env';

const logger = pino();

const KV_KEY = 'access_token';

export async function getAPIToken(env: Env): Promise<string> {
  const token = await env.CONSO_API.get(KV_KEY);
  if (token) {
    return token;
  }

  const response = await fetch(`${env.BASE_URL}/oauth2/v3/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.CLIENT_ID}:${env.CLIENT_SECRET}`)}`,
    },
    body: qs.stringify({ grant_type: 'client_credentials' }),
  });

  if (!response.ok) {
    let body: string;
    try {
      body = await response.text();
    } catch (e) {
      body = `<unable to read body: ${String(e)}>`;
    }
    logger.error({ status: response.status, statusText: response.statusText, body }, 'token fetch failed');
    return Promise.reject(new Error(`Token fetch failed: ${response.status} ${response.statusText}`));
  }

  const data: { access_token: string } = await response.json();
  logger.info({ message: 'token refreshed', token: data.access_token });

  // Save in KV store
  await env.CONSO_API.put(KV_KEY, data.access_token, {
    expirationTtl: 3 * 3600, // token expiration is 3 hours later
  });

  return data.access_token;
}
