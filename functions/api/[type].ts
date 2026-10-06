import * as qs from 'qs';
import pino from 'pino';
import { z } from 'zod';
import { getAPIToken } from '../../lib/token';
import { legacyDataPoints, legacyDataURLs, synchronousDataPoints, synchronousDataURLs } from '../../lib/url';
import { isTokenValid } from '../../lib/auth';
import { Env } from '../../lib/env';

const logger = pino();

function isSynchronousDataType(type: string): type is keyof typeof synchronousDataURLs {
  return type in synchronousDataURLs;
}

const schema = z.object({
  type: z.enum([...legacyDataPoints, ...synchronousDataPoints]),
  pointId: z.string().length(14),
  dateDebut: z.string().regex(/20[0-9]{2}-[0-9]{2}-[0-9]{2}/),
  dateFin: z.string().regex(/20[0-9]{2}-[0-9]{2}-[0-9]{2}/),
  mesuresPas: z.enum(['P1D', 'P1M']).optional(),
  grandeurPhysique: z.enum(['PMA', 'TOUT']).optional(),
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
    pointId: searchParams.get('pointId') ?? searchParams.get('prm'),
    dateDebut: searchParams.get('dateDebut') ?? searchParams.get('start'),
    dateFin: searchParams.get('dateFin') ?? searchParams.get('end'),
    mesuresPas: searchParams.get('mesuresPas') ?? undefined,
    grandeurPhysique: searchParams.get('grandeurPhysique') ?? undefined,
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

  const { type, pointId, dateDebut, dateFin, mesuresPas, grandeurPhysique } = input.data;
  const isSynchronousAPI = isSynchronousDataType(type);

  // Validate user token
  const authHeader = req.headers.get('Authorization');
  const userToken = authHeader?.split(' ')[1];
  if (!userToken) {
    return Response.json(
      { status: 400, message: "Le header 'Authorization' est manquant ou invalide" },
      { status: 400 }
    );
  }
  if (!(await isTokenValid(userToken, pointId, JWT_SECRET))) {
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
    let requestURL: string;
    let query: Record<string, string | undefined>;
    if (isSynchronousDataType(type)) {
      const baseURL = new URL(BASE_URL);

      // TODO Remove this once the metering data API is fully migrated to the new synchronous API
      const host = baseURL.hostname === 'ext.prod.api.enedis.fr' ? 'gw.ext.prod.api.enedis.fr' : baseURL.host;
      requestURL = `${baseURL.protocol}//${host}/mesure_synchrone_auto/v2/${synchronousDataURLs[type]}`;
      query = {
        pointId,
        dateDebut,
        dateFin,
        ...(type === 'puissance_conso_max_quotidienne' && {
          mesuresPas: mesuresPas ?? 'P1D',
          grandeurPhysique: grandeurPhysique ?? 'PMA',
        }),
      };
    } else {
      requestURL = `${BASE_URL}/${legacyDataURLs[type]}`;
      query = {
        start: dateDebut,
        end: dateFin,
        usage_point_id: pointId,
      };
    }

    const response = await fetch(`${requestURL}?${qs.stringify(query)}`, {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + apiToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let responseError: string | Record<string, any> = await response.text();
      try {
        responseError = JSON.parse(responseError);
      } catch (e) {
        // do nothing, keep responseError as text
      }

      return Response.json(
        {
          status: response.status,
          message: 'The Enedis API returned an error',
          error: responseError,
        },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    if (isSynchronousAPI) {
      return Response.json(data);
    }
    if (typeof data !== 'object' || data === null || !('meter_reading' in data)) {
      throw new Error('Invalid legacy API response');
    }
    return Response.json(data.meter_reading);
  } catch (e) {
    logger.error({ message: 'cannot call Enedis', error: e });
    return Response.json({ status: 500, message: 'Erreur inconnue. Réessayez plus tard' }, { status: 500 });
  }
};
