# MemoryLink Detection Patterns

MemoryLink detects **69+ patterns** across multiple categories to protect your codebase from secrets, personal data, and security risks.

## 📊 Pattern Statistics

- **Total Patterns**: 69+
- **Blocking (ERROR)**: 55+ patterns
- **Warning (WARN)**: 14+ patterns (browser/debug leaks)

## 🔐 API Keys & Tokens (28 patterns)

### Cloud Providers
- **OpenAI/Anthropic API Key** (`sk-...`)
- **Claude AI API Key** (`sk-ant-...`)
- **AWS Access Key** (`AKIA...`)
- **AWS Secret Key**
- **Google API Key** (`AIza...`)
- **Azure Key**
- **GCP Service Account JSON**

### Developer Tools
- **GitHub Token** (`ghp_...`)
- **GitHub OAuth Token** (`gho_...`)
- **Slack Token** (`xoxb-...`)
- **Slack Webhook URL**
- **Discord Token**
- **JWT Token** (`eyJ...`)

### Payment & E-commerce
- **Stripe API Key** (`sk_live_...`, `sk_test_...`)
- **PayPal Client Secret**
- **Square Access Token**
- **Shopify API Key** (`shpat_...`)

### Communication & Services
- **Twilio API Key**
- **SendGrid API Key** (`SG....`)
- **Mailgun API Key** (`key-...`)
- **Heroku API Key** (UUID format)

### Generic Patterns
- **Generic API Key** (`api_key=...`)
- **Key-Value Secret** (catches ANY key name with secret-like value)
- **Token** (authentication tokens)
- **Private Key** (RSA, etc.)

## 💳 Personal Data (PII) (12 patterns)

### Financial
- **Credit Card Number** (Visa, Mastercard, Amex, Discover)
- **CVV/CVC Code**
- **Bank Account Number**
- **IBAN** (International Bank Account Number)
- **UPI ID** (India)

### Government IDs
- **SSN** (US Social Security Number)
- **SIN** (Canadian Social Insurance Number)
- **PAN Card** (India)
- **Aadhaar Number** (India)
- **Driver License**
- **Passport Number**

### Contact Information
- **Email Address**
- **Phone Number**
- **Email + Password** (credential leak)

## 🌐 Browser Data Leaks (6 patterns - WARN)

These patterns detect secrets that could leak through browser storage or console:

- **localStorage.setItem with token**
- **sessionStorage.setItem with token**
- **console.log with Authorization header**
- **URL parameter ?token=**
- **URL parameter ?key=**
- **URL parameter ?auth=**

**Severity**: WARN (warning only, doesn't block)

## 🐛 Debug Code Leaks (8 patterns - WARN)

These patterns catch temporary debug code that could leak secrets:

- **console.log with sensitive data**
- **Logger with request/response data**
- **print/echo with secret**
- **TODO comment with secret**
- **Stack trace in production code**
- **Verbose error with sensitive data**
- **Temporary logging**
- **Development-only code**

**Severity**: WARN (warning only, doesn't block)

## 🔧 Infrastructure & DevOps (15 patterns)

### CI/CD
- **GitHub Actions Secret** (`${{ secrets.XXX }}`)
- **GitLab CI Secret**
- **Jenkins Credential**
- **CircleCI Secret**
- **CI Secret Dump** (printenv, env commands)

### Containers & Orchestration
- **Docker Registry Credentials**
- **Docker Compose Secret**
- **Kubernetes Secret**
- **Helm Chart Secret**

### Cloud Storage
- **S3 Public Bucket**
- **Azure Public Blob**
- **GCP Public Bucket**
- **Cloud Storage Credential**

### Infrastructure as Code
- **Terraform Secret**
- **Redis Credentials**

### Other Services
- **SMTP Credentials**
- **VPN Credentials**
- **OAuth Client Secret**

## 🛡️ Memory Poisoning Protection (8 patterns)

These patterns detect instruction-injection attacks (OWASP ASI06):

- **Ignore Previous Rules**
- **Ignore Security**
- **Always Log Secrets**
- **Exfiltrate Data**
- **Bypass Security**
- **Disable Checks**
- **Skip Validation**
- **Override Security**

## 📝 Log File Patterns (4 patterns)

- **Error Log with Secret**
- **Access Log with Secret**
- **Debug Log with Secret**
- **Stack Trace with Secret**

## 🔍 Dynamic Detection

MemoryLink also includes **dynamic detection** that catches secrets even if they don't match predefined patterns:

- **Key-Value Detection**: Catches any key name with secret-like values
- **Standalone Secret Detection**: Detects secrets without key names
- **High-Entropy Detection**: Identifies random-looking strings
- **Format Detection**: Base64, Hex, UUID patterns

## ⚙️ Pattern Configuration

You can customize patterns in `.memorylink/config.json`:

```json
{
  "patterns": {
    "disabled": ["email"],  // Disable specific patterns
    "custom": [             // Add custom patterns
      {
        "id": "my-custom-pattern",
        "name": "My Custom Pattern",
        "pattern": "YOUR_REGEX_HERE",
        "description": "Custom pattern description"
      }
    ]
  }
}
```

## 📊 Pattern Categories Summary

| Category | Count | Severity |
|----------|-------|----------|
| API Keys & Tokens | 28 | ERROR |
| Personal Data (PII) | 12 | ERROR |
| Browser Leaks | 6 | WARN |
| Debug Leaks | 8 | WARN |
| Infrastructure | 15 | ERROR |
| Memory Poisoning | 8 | ERROR |
| Log Files | 4 | ERROR |
| **Total** | **69+** | - |

## 🎯 Best Practices

1. **Review WARN patterns**: Browser and debug patterns are warnings - review them but don't block on them
2. **Customize patterns**: Disable patterns that cause false positives in your codebase
3. **Use whitelist**: Add test keys to whitelist in `.memorylink/config.json`
4. **Regular scans**: Run `ml scan` regularly to catch new secrets

## 📖 Related Documentation

- [GETTING_STARTED.md](./GETTING_STARTED.md) - Quick start guide
- [REMEDIATION.md](./REMEDIATION.md) - How to fix detected secrets
- [README.md](../README.md) - Full documentation

---

**Last Updated**: Based on MemoryLink v1.0.0

