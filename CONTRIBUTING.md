# How to develop Conso API

## Developing the front-end

- Run `yarn dev`
- The API will not work

## Developing the API

- Store .env files in `.dev.vars`

```
CLIENT_ID="***"
CLIENT_SECRET="***"
BASE_URL="https://ext.prod.api.enedis.fr"
JWT_SECRET="***"
```

- Build the front-end with `yarn generate`
- Run `yarn serve` to preview the API locally

### Using the sandbox

- Add `SANDBOX="true"` to `.dev.vars` (for Authorization flow only)
- Change `BASE_URL` to `https://gw.ext.prod-sandbox.api.enedis.fr` in `.dev.vars`

## Deploying

Just push to the `main` branch, the deployment to Cloudflare pages is automatic
