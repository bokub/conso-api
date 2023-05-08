import axios from 'axios';
import * as qs from 'qs';
import { VercelRequest, VercelResponse } from '@vercel/node';
import pino from 'pino';
import { z } from 'zod';
import { getAPIToken } from '../lib/token';
import { dataPoints, dataURLs } from '../lib/url';
import { isTokenValid } from '../lib/auth';

const logger = pino();
const { BASE_URL } = process.env;

const schema = z.object({
  type: z.enum(dataPoints),
  prm: z.string().length(14),
  start: z.string().regex(/20[0-9]{2}-[0-9]{2}-[0-9]{2}/),
  end: z.string().regex(/20[0-9]{2}-[0-9]{2}-[0-9]{2}/),
});

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).send({ status: 405, message: 'Seule la méthode GET est autorisée' });
    return;
  }

  // Validate query string
  const input = schema.safeParse(req.query);
  if (!input.success) {
    res.status(400).send({
      status: 400,
      message: 'Paramètres invalides',
      error: input.error,
    });
    return;
  }

  const { type, prm, start, end } = input.data;

  // Validate user token
  const userToken = req.headers.authorization?.split(' ')[1];
  if (!userToken) {
    res.status(400).send({ status: 400, message: "Le header 'Authorization' est manquant ou invalide" });
    return;
  }
  if (!isTokenValid(userToken, prm)) {
    res.status(401).send({ status: 401, message: "Votre token est invalide ou ne permet pas d'accéder à ce PRM" });
    return;
  }

  // Get Enedis token
  let apiToken: string;
  try {
    apiToken = await getAPIToken();
  } catch (e) {
    logger.error({ message: 'cannot refresh token', error: e });
    res.status(500).send({ status: 500, message: 'Impossible de rafraîchir le token. Réessayez plus tard' });
    return;
  }

  // Fetch data
  try {
    const { data } = await axios.get(
      `${BASE_URL}/${dataURLs[type]}?${qs.stringify({
        start,
        end,
        usage_point_id: prm,
      })}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + apiToken,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    res.send(data.meter_reading);
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status && e.response?.data) {
      logger.error({ message: 'cannot retrieve data from Enedis', error: e.toJSON() });
      res.status(e.response.status).send({
        status: e.response.status,
        message: 'The Enedis API returned an error',
        error: e.response.data,
      });
    } else {
      logger.error({ message: 'cannot call Enedis', error: e });

      res.status(500).send({ status: 500, message: 'Erreur inconnue. Réessayez plus tard' });
    }
  }
};
