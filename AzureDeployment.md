# Azure Deployment

The web app runs on **Azure App Service** in **Norway East** at **https://ams-frontend.sanddata.eu** (also reachable at
`https://ams-frontend-noeast.azurewebsites.net`). The API and database stay on Hetzner
(`https://ams-api.sanddata.eu`). Static Web Apps was not used because it is not offered in Norway East.

## How it works

```text
browser ──HTTPS──> ams-frontend.sanddata.eu                (App Service, Node 24, server/server.mjs)
                      ├─ /assets/*, /index.html  → built app from ./dist
                      ├─ any other page path     → index.html (the app routes in the browser)
                      └─ /api/*                  → https://ams-api.sanddata.eu (forwarded)
```

- The production build calls `/api` on its own address (`.env.production` leaves `VITE_API_BASE_URL` empty).
  `server/app.mjs` forwards those calls to the API, so the browser only talks to one origin and the API needs no
  CORS entry for the web app.
- The server uses Node built-ins only, so the deploy package is `server.mjs`, `app.mjs` and `dist/`, with no
  `node_modules`.
- It sets a Content Security Policy and other security headers, caches `/assets/*` for a year (the file names are
  hashed) and never caches `index.html`, and gzips text files.
- The API sees App Service's outbound IP address, with the browser's address in `X-Forwarded-For`. Keep that in
  mind if the API ever limits requests per IP address.

## Azure resources

| Resource         | Name                                                                    | Notes                                                                                                      |
| ---------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Subscription     | Visual Studio Enterprise – MPN (`b7906420-e58b-488d-aa0a-aaab0e33a0ed`) | Tenant `b9bec6d2-1850-411e-b728-c59e967d55e3`                                                              |
| Resource group   | `rg-ams-noeast`                                                         | Norway East                                                                                                |
| App Service plan | `asp-ams-frontend`                                                      | Linux, B1 (about USD 13/month, paid from the subscription's monthly credit)                                |
| Web app          | `ams-frontend-noeast`                                                   | Node 24 LTS, startup `node server.mjs`, HTTPS only, TLS 1.2+, Always On, FTP and basic-auth publishing off |
| Managed identity | `id-gh-ams-frontend-deploy`                                             | Used by GitHub Actions to deploy; role _Website Contributor_ on the web app only                           |

App settings on the web app:

| Setting                          | Value                                            |
| -------------------------------- | ------------------------------------------------ |
| `API_PROXY_TARGET`               | `https://ams-api.sanddata.eu`                    |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` (the package is built in GitHub Actions) |

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`: `npm ci`, lint, tests, build, then deploys the package.
Pull requests run the same checks without deploying. A deploy can also be started by hand from the Actions tab.

Signing in to Azure uses OIDC: the managed identity has a federated credential (`github-main`) that trusts only
`repo:roysand@26359436/no.sanddata.ams.frontend@928782571:ref:refs/heads/main`. No password or publish profile is
stored in GitHub. The workflow reads three repository **variables** (not secrets): `AZURE_CLIENT_ID`,
`AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.

GitHub puts the owner and repository IDs in the subject (`owner@ownerId/repo@repoId`), not only the names. If the
login step fails with `AADSTS700213: No matching federated identity record`, copy the "subject claim" printed by
`azure/login` in the failed run and set it on the credential:

```bash
az identity federated-credential update -g rg-ams-noeast --identity-name id-gh-ams-frontend-deploy -n github-main \
  --issuer https://token.actions.githubusercontent.com --audiences api://AzureADTokenExchange \
  --subject "<subject claim from the failed run>"
```

The IDs do not change when the repository is renamed, so this only comes up if the repository moves to another
owner or is recreated.

## Log in with the Azure CLI

The subscription is in its own tenant, so name the tenant explicitly (it is not the subscription ID):

```bash
az login --tenant b9bec6d2-1850-411e-b728-c59e967d55e3
az account set --subscription b7906420-e58b-488d-aa0a-aaab0e33a0ed
```

## Everyday commands

```bash
# Live server log (startup errors, proxy failures)
az webapp log tail -g rg-ams-noeast -n ams-frontend-noeast

# Restart
az webapp restart -g rg-ams-noeast -n ams-frontend-noeast

# Point /api at another API (for example a test API)
az webapp config appsettings set -g rg-ams-noeast -n ams-frontend-noeast --settings API_PROXY_TARGET=https://...
```

To roll back, re-run an earlier successful deploy from the Actions tab, or revert the commit on `main`.

## Run the production server locally

```bash
npm run build
mkdir -p /tmp/ams-deploy && cp server/server.mjs server/app.mjs /tmp/ams-deploy/ && cp -r dist /tmp/ams-deploy/dist
cd /tmp/ams-deploy && PORT=8080 API_PROXY_TARGET=https://ams-api.sanddata.eu node server.mjs
```

## Custom domain

`ams-frontend.sanddata.eu` is set up:

| Part             | Value                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| DNS (Domeneshop) | `CNAME ams-frontend` → `ams-frontend-noeast.azurewebsites.net`                                                                                    |
| Certificate      | Free App Service managed certificate (issued by DigiCert/GeoTrust), SNI binding. Azure renews it automatically; the first one expires 2027-05-13. |
| HTTP             | Redirects to HTTPS (the web app is HTTPS only)                                                                                                    |

A DNS record alone is not enough for HTTPS: Azure's own certificate only covers `*.azurewebsites.net`, so the name
must be added to the web app and get its own certificate. To add another name (for example `ams.sanddata.eu`):

```bash
# 1. At Domeneshop: CNAME ams -> ams-frontend-noeast.azurewebsites.net
#    Azure accepted ams-frontend.sanddata.eu on the CNAME alone. If it asks for proof of ownership, also add
#    TXT asuid.ams -> the value printed by:
az webapp show -g rg-ams-noeast -n ams-frontend-noeast --query customDomainVerificationId -o tsv

# 2. Add the name to the web app
az webapp config hostname add -g rg-ams-noeast --webapp-name ams-frontend-noeast --hostname ams.sanddata.eu

# 3. Create the free managed certificate (takes a few minutes). The CLI may end with a JSONDecodeError even though
#    the certificate is being issued; check with the next command until it is listed.
az webapp config ssl create -g rg-ams-noeast -n ams-frontend-noeast --hostname ams.sanddata.eu
az resource show -g rg-ams-noeast --resource-type Microsoft.Web/certificates -n ams.sanddata.eu \
  --query "{subject:properties.subjectName, thumbprint:properties.thumbprint}" -o table

# 4. Bind it (HTTPS can take a minute or two to start working after this)
az webapp config ssl bind -g rg-ams-noeast -n ams-frontend-noeast --ssl-type SNI --hostname ams.sanddata.eu \
  --certificate-thumbprint <thumbprint from step 3>
```
