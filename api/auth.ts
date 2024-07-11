import { Env } from '../lib/env';

export const onRequest: PagesFunction<Env> = async ({ request: req, env }) => {
  const state = 'v2_' + Array.from({ length: 8 }, () => Math.random().toString(36)[2]).join('');
  const baseURI = env.SANDBOX ? 'https://ext.hml.api.enedis.fr' : 'https://mon-compte-particulier.enedis.fr';

  return Response.redirect(
    `${baseURI}/dataconnect/v1/oauth2/authorize` +
      `?client_id=${env.CLIENT_ID}&state=${state}&duration=P3Y&response_type=code`
  );
};
