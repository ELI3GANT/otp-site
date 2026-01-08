# Backend Setup Guide

You have the code ready in `supabase/functions/handle_contact/index.ts`.
Now you need to deploy it to the cloud.

### 1. Install Supabase CLI
Run this in your terminal to install the tool:
```bash
brew install supabase/tap/supabase
```

### 2. Login to Supabase
This connects your computer to your account.
```bash
supabase login
```
(It will open your browser, just click "Confirm").

### 3. Connect to Project
Link this folder to your specific project ID (`ckumhowhucbbmpdeqkrl`).
```bash
supabase link --project-ref ckumhowhucbbmpdeqkrl
```
(Enter your **Database Password** if asked. If you forgot it, reset it in the dashboard).

### 4. Set the Secret Key
Securely upload your Resend API Key so the code can use it.
```bash
supabase secrets set RESEND_API_KEY=re_9jcDKPvK_BjbirE6mukA4mgVq8vam1CLJ
```

### 5. Deploy the Function
Push the code to the server.
```bash
supabase functions deploy handle_contact
```

### 6. Connect Database to Function (The Trigger)
Go to your **Supabase Dashboard** -> **Database** -> **Webhooks**.
1. Create a new Webhook.
2. Name: `email-on-contact`.
3. Table: `contacts`.
4. Events: check `INSERT`.
5. Type of Webhook: `Supabase Edge Function`.
6. Select Edge Function: `handle_contact`.
7. Save.

---
**Done!**
Now, whenever a row is inserted into `contacts`, Supabase will automatically run your function and send the email.
