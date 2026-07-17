# Yuvenza confirmation-email function

Sends the branded registration-confirmation email (stamp logo, signed QR
pass, PDF-download button) through **Gmail + Nodemailer**. Host it on
**Render** (free web service, easiest — see §2A) or on **Google Cloud
Functions gen2** (§2B).

The Next.js app calls this after every successful payment (idempotently —
see `lib/email/notify.ts`).

## 2A. Deploy on Render (recommended, ~5 minutes, no CLI)

The repo root has a `render.yaml` blueprint that sets everything up.

1. Do §1 below first (Gmail app password).
2. Sign in at render.com (the GitHub account that owns this repo) →
   **New → Blueprint** → select this repository → **Apply**. Render creates
   a free web service named `yuvenza-email` from
   `google-cloud/email-function/`.
3. Open the service → **Environment**:
   - set `GMAIL_USER` (the Gmail address) and `GMAIL_APP_PASSWORD`
     (the 16-character app password),
   - copy the auto-generated `EMAIL_SHARED_SECRET` value.
4. In the **Vercel** project add:
   - `EMAIL_FUNCTION_URL` = `https://yuvenza-email.onrender.com`
     (your service's URL from the Render dashboard),
   - `EMAIL_FUNCTION_SECRET` = the value copied in step 3,
   then redeploy.
5. Test: `GET` the service URL in a browser → `{"ok":true,...}`.

> Free-tier behaviour: the service sleeps after ~15 min idle, so the first
> email after a quiet spell can take up to a minute. The app releases its
> send-claim on failure, so Razorpay webhook retries deliver the mail
> anyway. To keep it warm during the fest, point a free uptime monitor
> (e.g. UptimeRobot) at `GET /` every 10 minutes.

## 1. Gmail app password (one time)

1. Use (or create) the Gmail account the mails should come from, e.g.
   `yuvenza.cit@gmail.com`.
2. Turn on **2-Step Verification**: myaccount.google.com → Security.
3. Create an **App password**: myaccount.google.com/apppasswords →
   name it "yuvenza-email" → copy the 16-character password.

> Gmail sending limit is ~500 recipients/day for a normal account — fine for
> a fest. If you outgrow it, swap the transport for Brevo/Resend later; the
> template and the app contract stay identical.

## 2B. Deploy on Google Cloud Functions (alternative)

Install the gcloud CLI (`brew install google-cloud-sdk`), then:

```bash
gcloud auth login
gcloud projects create yuvenza-mail --set-as-default   # or use an existing project
gcloud services enable cloudfunctions.googleapis.com run.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com

cd google-cloud/email-function

# Generate the shared secret the app will use:  openssl rand -hex 32
gcloud functions deploy yuvenza-send-confirmation \
  --gen2 --runtime=nodejs20 --region=asia-south1 \
  --source=. --entry-point=sendConfirmation \
  --trigger-http --allow-unauthenticated \
  --memory=256Mi --max-instances=5 \
  --set-env-vars GMAIL_USER=yuvenza.cit@gmail.com,FROM_NAME="Yuvenza · The Youth Club" \
  --set-secrets ""  # (see note below for the two secrets)
```

For the two sensitive values, either add them to `--set-env-vars`
(quick start):

```bash
  --set-env-vars ...,GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx,EMAIL_SHARED_SECRET=<openssl rand -hex 32>
```

…or store them in Secret Manager (recommended):

```bash
echo -n "xxxx xxxx xxxx xxxx" | gcloud secrets create gmail-app-password --data-file=-
echo -n "$(openssl rand -hex 32)" | gcloud secrets create email-shared-secret --data-file=-
# then deploy with:
#   --set-secrets GMAIL_APP_PASSWORD=gmail-app-password:latest,EMAIL_SHARED_SECRET=email-shared-secret:latest
```

The deploy prints the function URL, e.g.
`https://asia-south1-yuvenza-mail.cloudfunctions.net/yuvenza-send-confirmation`.

> `--allow-unauthenticated` is required because the app calls it directly;
> the `x-email-secret` header is the auth. Keep `EMAIL_SHARED_SECRET` long
> and random.

## 3. Point the app at it

Add to the app's environment (`.env.local` + Vercel):

```
EMAIL_FUNCTION_URL=https://asia-south1-....cloudfunctions.net/yuvenza-send-confirmation
EMAIL_FUNCTION_SECRET=<the same shared secret>
```

Run `supabase/migrations/0006_confirmation_email.sql` (adds the
sent-tracking column). Without these env vars the app simply skips emails —
nothing breaks.

## 4. Test it

```bash
curl -s -X POST "$EMAIL_FUNCTION_URL" \
  -H "content-type: application/json" -H "x-email-secret: $EMAIL_FUNCTION_SECRET" \
  -d '{
    "to": "you@citchennai.net",
    "name": "Asha Kumar",
    "orderId": "7f3e9d2a-1b4c-4e5f-8a6b-9c0d1e2f3a4b",
    "amountPaise": 44800,
    "demo": true,
    "events": [{"title":"Hackathon 24","dateLabel":"Aug 11-12"},
               {"title":"Design Sprint","dateLabel":"Aug 11","startTime":"10:00","endTime":"13:00"}],
    "qrPayload": "YUV26|v1|7f3e9d2a-1b4c-4e5f-8a6b-9c0d1e2f3a4b|demo",
    "siteUrl": "https://yuvenza.example.com"
  }'
```

Local run without deploying: `npm install && npm start` (listens on :8080),
with the four env vars exported.
