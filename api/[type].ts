import axios from 'axios';
import * as qs from 'qs';
import pino from 'pino';
import { z } from 'zod';
import { getAPIToken } from '../lib/token';
import { dataPoints, dataURLs } from '../lib/url';
import { isTokenValid } from '../lib/auth';
import { Env } from '../lib/env';

const logger = pino();

const schema = z.object({
  type: z.enum(dataPoints),
  prm: z.string().length(14),
  start: z.string().regex(/20[0-9]{2}-[0-9]{2}-[0-9]{2}/),
  end: z.string().regex(/20[0-9]{2}-[0-9]{2}-[0-9]{2}/),
});

export const onRequest: PagesFunction<Env> = async ({ request: req, params, env }) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
    });
  }
  if (req.method !== 'GET') {
    return Response.json({ status: 405, message: 'Seule la méthode GET est autorisée' }, { status: 405 });
  }

  const { BASE_URL, JWT_SECRET } = env;
  const { searchParams } = new URL(req.url);

  // Validate input
  const input = schema.safeParse({
    type: params.type,
    prm: searchParams.get('prm'),
    start: searchParams.get('start'),
    end: searchParams.get('end'),
  });

  if (input.success === false) {
    return Response.json(
      {
        status: 400,
        message: 'Paramètres invalides',
        error: input.error,
      },
      { status: 400 }
    );
  }

  const { type, prm, start, end } = input.data;

  // Validate user token
  const authHeader = req.headers.get('Authorization');
  const userToken = authHeader?.split(' ')[1];
  if (!userToken) {
    return Response.json(
      { status: 400, message: "Le header 'Authorization' est manquant ou invalide" },
      { status: 400 }
    );
  }
  if (!(await isTokenValid(userToken, prm, JWT_SECRET))) {
    return Response.json(
      { status: 401, message: "Votre token est invalide ou ne permet pas d'accéder à ce PRM" },
      { status: 401 }
    );
  }

  // Get Enedis token
  let apiToken: string;
  try {
    apiToken = await getAPIToken(env);
  } catch (e) {
    logger.error({ message: 'cannot refresh token', error: e });
    return Response.json(
      { status: 500, message: 'Impossible de rafraîchir le token. Réessayez plus tard' },
      { status: 500 }
    );
  }

  // Fetch data
  try {
    const response = await fetch(
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

    if (!response.ok) {
      return Response.json(
        {
          status: response.status,
          message: 'The Enedis API returned an error',
          error: await response.json(),
        },
        { status: response.status }
      );
    }

    const data: { meter_reading: any } = await response.json();
    return Response.json(data.meter_reading);
  } catch (e) {
    logger.error({ message: 'cannot call Enedis', error: e });
    return Response.json({ status: 500, message: 'Erreur inconnue. Réessayez plus tard' }, { status: 500 });
  }
};
