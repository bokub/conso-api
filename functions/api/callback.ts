import { generateToken } from '../../lib/auth';
import { Env } from '../../lib/env';
import { z } from 'zod';
import pino from 'pino';
const logger = pino();

export const onRequest: PagesFunction<Env> = async ({ request: req, env }) => {
  try {
    const { searchParams } = new URL(req.url);
    const queryPRMs = z.string().parse(searchParams.get('usage_point_id')).split(/[,;]/g);

    const authToken = await generateToken(queryPRMs, env.JWT_SECRET);
    return new Response('/token', {
      status: 302,
      headers: {
        Location: '/token',
        'Set-Cookie': `conso-token=${authToken}; SameSite=Strict; Path=/`,
      },
    });
  } catch (e) {
    logger.error({ message: 'cannot generate Auth token', error: e });
    return Response.json({ status: 500, message: 'internal server error' }, { status: 500 });
  }
};
