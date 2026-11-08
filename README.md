# VOILA Client Demos

Production bundle for the first invite-only room, EDC Livestream Camera Study. The three demos and their assets are served by this Node application. The existing private preview is separate.

## 1. Configure the email-code provider

Create a Supabase project. Enable email authentication and configure custom SMTP with a verified VOILA sender before testing with external recipients. In the Magic Link email template, put the sign-in code `{{ .Token }}` in a VOILA-branded message and remove the sign-in link if you want code-only sign-in. Use the project URL and publishable key. The application does not need a Supabase service role or secret key.

## 2. Deploy the server

Put the contents of this bundle in a private source repository and connect it to a Render Web Service. Choose Node 22 or later. Use `npm install` as the build command and `npm start` as the start command.

Set these environment variables in the service dashboard:

| Variable | Value |
| --- | --- |
| `PUBLIC_ORIGIN` | The HTTPS service URL for the first test. Change to `https://clients.voilaagency.com` when the custom domain is active. |
| `SUPABASE_URL` | The Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | The Supabase publishable key |
| `INVITED_EMAILS` | Comma-separated email addresses. Start with your own address. |

Render supplies `PORT`. The bundle has no account credentials or configured guests. Deploy the Node service, since publishing the `public` folder alone would skip the access gate.

## 3. Test access and connect the domain

1. Open the HTTPS service URL in a private browser window. Verify the VOILA sign-in page and receive a code at an invited address.
2. Open all three viewfinders. Test a bookmarked preset from a signed-out window. Also try an uninvited email and an unauthenticated direct tool URL.
3. Add `clients.voilaagency.com` as a custom domain in the host dashboard. Copy only the host-provided record for `clients` into the domain DNS settings. Wait for the host to verify DNS and issue HTTPS.
4. Set `PUBLIC_ORIGIN` to `https://clients.voilaagency.com`. Retest sign-in and a shared preset on the branded host. Once the branded host works, disable the default host in Render if the service's settings allow it.
5. In Squarespace, move the existing **CLIENTS** link back to **Main Navigation**.

The server checks the invite list for the EDC room and all viewfinder files. Authentication is currently configured for one shared room. Separate client audiences require separate room policies before adding more rooms. PNG uploads remain in the current tab.

## Provider documentation

- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/auth-smtp
- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/custom-domains
