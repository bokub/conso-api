import type { VercelRequest, VercelResponse } from '@vercel/node';

const { CLIENT_ID, SANDBOX } = process.env;

export default (req: VercelRequest, res: VercelResponse) => {
  const state = 'v2_' + Array.from({ length: 8 }, () => Math.random().toString(36)[2]).join('');
  const baseURI = SANDBOX ? 'https://ext.hml.api.enedis.fr' : 'https://mon-compte-particulier.enedis.fr';

  return res.redirect(
    `${baseURI}/dataconnect/v1/oauth2/authorize` +
      `?client_id=${CLIENT_ID}&state=${state}&duration=P3Y&response_type=code`
  );
};
