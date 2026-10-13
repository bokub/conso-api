import { generateToken } from '../../lib/auth';
import { Env } from '../../lib/env';
import type { RequestData } from './_middleware';
import { getAPIToken } from '../../lib/token';
import { z } from 'zod';

export const onRequest: PagesFunction<Env, string, RequestData> = async ({ request: req, env, data }) => {
  const { logger } = data;
  let autorisationId: number | undefined;
  const requestUrl = `${env.BASE_URL}/subscribed_services/v1/`;

  try {
    const { searchParams } = new URL(req.url);
    autorisationId = z.coerce.number().int().positive().parse(searchParams.get('autorisation_id'));
    const apiToken = await getAPIToken(env, logger);

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + apiToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ autorisationId, autorisation: true, comptage: false, serviceType: 'ACCES' }),
    });
    if (!response.ok) {
      const responseBody = await response.text();
      logger.error('Subscribed services request failed', {
        requestUrl,
        method: 'POST',
        autorisationId,
        status: response.status,
        statusText: response.statusText,
        responseBody,
      });
      throw new Error(`Subscribed services request failed: ${response.status}`);
    }

    const jsonResponse = await response.json();

    logger.info('Subscribed services response', { jsonResponse });

    const services = z
      .object({ serviceSouscrit: z.array(z.object({ pointId: z.string().optional() })).optional() })
      .parse(jsonResponse);

    const prms = Array.from(
      new Set((services.serviceSouscrit ?? []).flatMap(({ pointId }) => (pointId ? [pointId] : [])))
    );

    if (prms.length === 0) {
      throw new Error('No PRM found for authorization');
    }
    const authToken = await generateToken(prms, env.JWT_SECRET);
    return new Response('/token', {
      status: 302,
      headers: {
        Location: '/token',
        'Set-Cookie': `conso-token=${authToken}; SameSite=Strict; Path=/`,
      },
    });
  } catch (e) {
    logger.error(e instanceof Error ? e : String(e), {
      message: 'cannot generate Auth token',
      autorisationId,
      requestUrl,
    });
    return Response.json({ status: 500, message: 'internal server error' }, { status: 500 });
  }
};
