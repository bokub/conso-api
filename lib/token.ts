import axios from 'axios';
import * as qs from 'qs';
import pino from 'pino';

const logger = pino();
const { BASE_URL, CLIENT_ID, CLIENT_SECRET } = process.env;

let token: string;
let tokenExpiration: number;

export async function getAPIToken(): Promise<string> {
  if (token && new Date().getTime() < tokenExpiration) {
    return token;
  }

  const { data } = await axios({
    method: 'post',
    url: `${BASE_URL}/oauth2/v3/token?${qs.stringify({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    })}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  logger.info({ message: 'token refreshed', token: data.access_token });

  token = data.access_token;
  tokenExpiration = new Date().getTime() + 3 * 3600 * 1000; // token expiration is 3 hours later

  return token;
}
