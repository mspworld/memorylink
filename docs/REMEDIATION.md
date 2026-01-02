# 🔄 Secret Remediation Guide

**Version:** 2.0.2  
**Last Updated:** January 2, 2026

When MemoryLink detects a secret, you should **rotate it immediately**. This guide provides direct links to rotate secrets for common providers.

---

## ⚠️ Important: Always Assume Compromise

If a secret was detected, assume it may have been exposed:
1. **Rotate immediately** - Don't wait
2. **Check access logs** - Look for unauthorized use
3. **Update all locations** - Environment variables, CI secrets, etc.
4. **Review Git history** - Use `ml gate --history`

---

## ☁️ Cloud Providers

### AWS

| Secret Type | Rotation Link |
|-------------|---------------|
| **Access Key ID / Secret** | [AWS IAM Console → Users → Security Credentials](https://console.aws.amazon.com/iam/home#/users) |
| **Session Token** | Expires automatically, rotate base credentials |

**Steps:**
1. Go to IAM → Users → Select user
2. Security credentials tab
3. Create new access key
4. Delete old access key
5. Update all applications

### Google Cloud (GCP)

| Secret Type | Rotation Link |
|-------------|---------------|
| **Service Account Key** | [GCP Console → IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) |
| **API Key** | [GCP Console → APIs → Credentials](https://console.cloud.google.com/apis/credentials) |
| **OAuth Client Secret** | [GCP Console → APIs → Credentials](https://console.cloud.google.com/apis/credentials) |

### Microsoft Azure

| Secret Type | Rotation Link |
|-------------|---------------|
| **Client Secret** | [Azure Portal → App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps) |
| **Storage Account Key** | [Azure Portal → Storage Accounts](https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.Storage%2FStorageAccounts) |
| **Connection String** | Regenerate from respective service |

### DigitalOcean

| Secret Type | Rotation Link |
|-------------|---------------|
| **Personal Access Token** | [DigitalOcean → API → Tokens](https://cloud.digitalocean.com/account/api/tokens) |
| **Spaces Access Key** | [DigitalOcean → API → Spaces Keys](https://cloud.digitalocean.com/account/api/tokens) |

---

## 🤖 AI/ML Services

### OpenAI

| Secret Type | Rotation Link |
|-------------|---------------|
| **API Key** | [OpenAI Platform → API Keys](https://platform.openai.com/api-keys) |

**Steps:**
1. Go to API Keys page
2. Click "Create new secret key"
3. Delete the old key
4. Update your applications

### Anthropic (Claude)

| Secret Type | Rotation Link |
|-------------|---------------|
| **API Key** | [Anthropic Console → API Keys](https://console.anthropic.com/settings/keys) |

### Hugging Face

| Secret Type | Rotation Link |
|-------------|---------------|
| **Access Token** | [Hugging Face → Settings → Access Tokens](https://huggingface.co/settings/tokens) |

### Cohere

| Secret Type | Rotation Link |
|-------------|---------------|
| **API Key** | [Cohere Dashboard → API Keys](https://dashboard.cohere.ai/api-keys) |

---

## 💳 Payment Providers

### Stripe

| Secret Type | Rotation Link |
|-------------|---------------|
| **Secret Key** | [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys) |
| **Webhook Secret** | [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks) |

**Note:** Stripe keys start with `sk_live_` (production) or `sk_test_` (test). Rotate production keys immediately!

### PayPal

| Secret Type | Rotation Link |
|-------------|---------------|
| **Client ID / Secret** | [PayPal Developer → My Apps](https://developer.paypal.com/developer/applications/) |

### Razorpay 🇮🇳

| Secret Type | Rotation Link |
|-------------|---------------|
| **Key ID / Secret** | [Razorpay Dashboard → Settings → API Keys](https://dashboard.razorpay.com/app/keys) |

### Square

| Secret Type | Rotation Link |
|-------------|---------------|
| **Access Token** | [Square Developer Dashboard](https://developer.squareup.com/apps) |

---

## 🔐 Authentication Providers

### GitHub

| Secret Type | Rotation Link |
|-------------|---------------|
| **Personal Access Token** | [GitHub → Settings → Developer Settings → PAT](https://github.com/settings/tokens) |
| **OAuth App Secret** | [GitHub → Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers) |
| **App Private Key** | [GitHub → Settings → Developer Settings → GitHub Apps](https://github.com/settings/apps) |

### GitLab

| Secret Type | Rotation Link |
|-------------|---------------|
| **Personal Access Token** | [GitLab → Preferences → Access Tokens](https://gitlab.com/-/profile/personal_access_tokens) |

### Slack

| Secret Type | Rotation Link |
|-------------|---------------|
| **Bot Token** | [Slack API → Your Apps](https://api.slack.com/apps) |
| **Webhook URL** | [Slack API → Your Apps → Incoming Webhooks](https://api.slack.com/apps) |

### Discord

| Secret Type | Rotation Link |
|-------------|---------------|
| **Bot Token** | [Discord Developer Portal](https://discord.com/developers/applications) |
| **Webhook URL** | Create new webhook in channel settings |

### Auth0

| Secret Type | Rotation Link |
|-------------|---------------|
| **Client Secret** | [Auth0 Dashboard → Applications](https://manage.auth0.com/) |
| **Management API Token** | [Auth0 Dashboard → APIs](https://manage.auth0.com/) |

---

## 🗄️ Database Services

### MongoDB Atlas

| Secret Type | Rotation Link |
|-------------|---------------|
| **Connection String** | [MongoDB Atlas → Database Access](https://cloud.mongodb.com/) |

**Steps:**
1. Go to Database Access
2. Edit user, set new password
3. Update connection strings

### Supabase

| Secret Type | Rotation Link |
|-------------|---------------|
| **Service Role Key** | [Supabase Dashboard → Settings → API](https://app.supabase.com/) |
| **Anon Key** | Public key, but rotate if needed |

### Firebase

| Secret Type | Rotation Link |
|-------------|---------------|
| **Service Account Key** | [Firebase Console → Project Settings → Service Accounts](https://console.firebase.google.com/) |

### Redis Labs

| Secret Type | Rotation Link |
|-------------|---------------|
| **Database Password** | [Redis Labs Console → Database → Configuration](https://app.redislabs.com/) |

---

## 📧 Email/SMS Services

### SendGrid

| Secret Type | Rotation Link |
|-------------|---------------|
| **API Key** | [SendGrid → Settings → API Keys](https://app.sendgrid.com/settings/api_keys) |

### Mailgun

| Secret Type | Rotation Link |
|-------------|---------------|
| **API Key** | [Mailgun → API Security](https://app.mailgun.com/app/account/security/api_keys) |

### Twilio

| Secret Type | Rotation Link |
|-------------|---------------|
| **Auth Token** | [Twilio Console → Account Info](https://console.twilio.com/) |
| **API Key** | [Twilio Console → API Keys](https://console.twilio.com/) |

---

## 🌐 Deployment Platforms

### Vercel

| Secret Type | Rotation Link |
|-------------|---------------|
| **Token** | [Vercel → Settings → Tokens](https://vercel.com/account/tokens) |

### Netlify

| Secret Type | Rotation Link |
|-------------|---------------|
| **Personal Access Token** | [Netlify → User Settings → Applications](https://app.netlify.com/user/applications) |

### Heroku

| Secret Type | Rotation Link |
|-------------|---------------|
| **API Key** | [Heroku → Account Settings](https://dashboard.heroku.com/account) |

### Railway

| Secret Type | Rotation Link |
|-------------|---------------|
| **Token** | [Railway → Account Settings → Tokens](https://railway.app/account/tokens) |

---

## 🇮🇳 India-Specific Services

### Paytm

| Secret Type | Rotation Link |
|-------------|---------------|
| **Merchant Key** | [Paytm Dashboard → API Keys](https://dashboard.paytm.com/next/apikeys) |

### PhonePe

| Secret Type | Rotation Link |
|-------------|---------------|
| **API Key** | Contact PhonePe Business Support |

### Cashfree

| Secret Type | Rotation Link |
|-------------|---------------|
| **App ID / Secret** | [Cashfree Dashboard → Credentials](https://merchant.cashfree.com/) |

---

## 🔧 Development Tools

### npm

| Secret Type | Rotation Link |
|-------------|---------------|
| **Auth Token** | [npm → Access Tokens](https://www.npmjs.com/settings/~/tokens) |

### Docker Hub

| Secret Type | Rotation Link |
|-------------|---------------|
| **Access Token** | [Docker Hub → Account Settings → Security](https://hub.docker.com/settings/security) |

### CircleCI

| Secret Type | Rotation Link |
|-------------|---------------|
| **API Token** | [CircleCI → User Settings → Personal API Tokens](https://app.circleci.com/settings/user/tokens) |

---

## 📋 General Rotation Checklist

After rotating a secret:

- [ ] **Update environment variables** (local `.env` files)
- [ ] **Update CI/CD secrets** (GitHub Actions, GitLab CI, etc.)
- [ ] **Update deployment platforms** (Vercel, Netlify, etc.)
- [ ] **Update configuration files** (ensure not committed!)
- [ ] **Test the application** (verify new key works)
- [ ] **Check audit logs** (look for unauthorized access)
- [ ] **Run `ml scan`** (verify no secrets remain)

---

## 🚨 Emergency Response

If you believe a secret was exploited:

1. **Rotate immediately** - Don't investigate first
2. **Check access logs** - Provider dashboards usually have this
3. **Revoke sessions** - Force re-authentication
4. **Enable MFA** - If not already enabled
5. **Contact provider** - Report potential breach
6. **Document incident** - For compliance

---

## 📞 Provider Security Contacts

| Provider | Security Contact |
|----------|------------------|
| AWS | [AWS Security](https://aws.amazon.com/security/vulnerability-reporting/) |
| Google | [Google Security](https://www.google.com/about/appsecurity/) |
| GitHub | [GitHub Security](https://github.com/security) |
| Stripe | [Stripe Security](https://stripe.com/docs/security) |

---

*This guide is part of MemoryLink's security documentation. Always follow your organization's incident response procedures.*
