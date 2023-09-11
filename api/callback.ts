import { VercelRequest, VercelResponse } from '@vercel/node';
import { generateToken } from '../lib/auth';
import { z } from 'zod';
import pino from 'pino';
const logger = pino();

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const queryPRMs = z.string().parse(req.query.usage_point_id).split(',');

    const authToken = generateToken(queryPRMs);
    res.setHeader('Set-Cookie', `conso-token=${authToken}; SameSite=Strict; Path=/`);
    res.redirect('/token');
  } catch (e) {
    logger.error({ message: 'cannot generate Auth token', error: e });
    res.status(500).send({ status: 500, message: 'internal server error' });
  }
};
