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

  const response = await fetch(
    `${env.BASE_URL}/oauth2/v3/token?${qs.stringify({
      grant_type: 'client_credentials',
      client_id: env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
    })}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!response.ok) {
    return Promise.reject(response);
  }

  const data: { access_token: string } = await response.json();
  logger.info({ message: 'token refreshed', token: data.access_token });

  // Save in KV store
  await env.CONSO_API.put(KV_KEY, data.access_token, {
    expirationTtl: 3 * 3600, // token expiration is 3 hours later
  });

  return data.access_token;
}
