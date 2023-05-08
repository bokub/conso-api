import { VercelRequest, VercelResponse } from '@vercel/node';
import { generateToken } from '../lib/auth';
import { z } from 'zod';
import pino from 'pino';
const logger = pino();
import axios from 'axios';
import * as qs from 'qs';

const { SANDBOX, REDIRECT_URI, CLIENT_ID, CLIENT_SECRET } = process.env;

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const prm = z.string().parse(req.query.usage_point_id);
    const code = z.string().parse(req.query.code);

    const { canAccessUsagePointId, allowedUsagePointId } = await validateCode(code, prm);
    if (!canAccessUsagePointId) {
      res.status(403).send({
        status: 403,
        message: 'Accès au PRM non autorisé',
        query: prm,
        verified: allowedUsagePointId,
        detail: 'Prenez un screenshot de cette erreur et envoyez-la moi svp, merci !',
      });
      return;
    }

    const authToken = generateToken(prm.split(','));
    res.setHeader('Set-Cookie', `conso-token=${authToken}; SameSite=Strict; Path=/`);
    res.redirect('/token');
  } catch (e) {
    logger.error({ message: 'cannot generate Auth token', error: e });
    res.status(500).send({ status: 500, message: 'internal server error' });
  }
};

// This method uses a deprecated API, but it's the only way to ensure the usage_point_id found in the query string has not been tampered.
function validateCode(code: string, prm: string) {
  if (SANDBOX) {
    return {
      canAccessUsagePointId: true,
      allowedUsagePointId: '',
    };
  }
  const baseURI = SANDBOX ? 'https://gw.hml.api.enedis.fr' : 'https://gw.prd.api.enedis.fr';
  return axios({
    method: 'post',
    url: `${baseURI}/v1/oauth2/token`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: qs.stringify({
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  }).then((response) => ({
    canAccessUsagePointId: response.data.usage_points_id === prm,
    allowedUsagePointId: response.data.usage_points_id,
  }));
}
