# Remediation Guides

When MemoryLink detects a secret, follow these provider-specific remediation steps to secure your codebase.

## 🔄 General Remediation Process

1. **Identify** the secret type
2. **Revoke** the exposed secret immediately
3. **Generate** a new secret
4. **Update** your code/config
5. **Remove** from Git history
6. **Review** access logs

## 🔐 Provider-Specific Guides

### GitHub

**Patterns Detected**: `ghp_...`, `gho_...`, `ghu_...`, `ghs_...`, `ghr_...`

**Steps**:
1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Find the exposed token and click **"Revoke"**
3. Generate a new token if needed
4. Update your code/config with the new token
5. Remove the old token from Git history:
   ```bash
   # Using git filter-branch
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch PATH_TO_FILE" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Or use BFG Repo-Cleaner (recommended)
   bfg --replace-text passwords.txt
   ```
6. Review [GitHub audit log](https://github.com/settings/security-log) for unauthorized access

**Reference**: [GitHub Personal Access Tokens Documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

---

### AWS

**Patterns Detected**: `AKIA...`, AWS secret keys, S3 credentials

**Steps**:
1. Go to [AWS IAM Console → Users → Security credentials](https://console.aws.amazon.com/iam/home#/users)
2. Find the exposed access key and click **"Delete"**
3. Create a new access key if needed
4. Update your code/config with the new key
5. **Rotate the secret access key immediately**
6. Review [CloudTrail logs](https://console.aws.amazon.com/cloudtrail) for unauthorized access
7. Check S3 bucket access logs if applicable

**Reference**: [AWS Access Keys Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)

---

### OpenAI / Anthropic

**Patterns Detected**: `sk-...`, `sk-ant-...`

**Steps**:
1. Go to [OpenAI Dashboard → API keys](https://platform.openai.com/api-keys) or [Anthropic Console](https://console.anthropic.com/)
2. Find the exposed key and click **"Revoke"** or **"Delete"**
3. Generate a new API key
4. Update your code/config with the new key
5. Monitor API usage for suspicious activity:
   - OpenAI: [Usage Dashboard](https://platform.openai.com/usage)
   - Anthropic: Check usage logs in console

**Reference**: 
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [Anthropic API Keys](https://docs.anthropic.com/claude/docs/authentication)

---

### Database

**Patterns Detected**: Database URLs, connection strings, passwords

**Steps**:
1. **Change the database password immediately**
2. Update connection strings in your code/config
3. Review database access logs for unauthorized connections
4. Consider rotating all database credentials
5. Use environment variables or secret managers going forward:
   ```bash
   # Use environment variables
   export DB_PASSWORD="new_password"
   
   # Or use secret managers (AWS Secrets Manager, HashiCorp Vault, etc.)
   ```
6. Update `.env` files and ensure they're in `.gitignore`

**Best Practices**:
- Never commit `.env` files
- Use secret managers in production
- Rotate credentials regularly

---

### Generic API Keys

**Patterns Detected**: Generic `api_key=...`, `API_KEY=...`, etc.

**Steps**:
1. **Identify the API provider**
2. Log into the provider dashboard
3. Revoke the exposed API key
4. Generate a new API key
5. Update your code/config with the new key
6. Review API usage logs for unauthorized access

**Common Providers**:
- Stripe: [API Keys](https://dashboard.stripe.com/apikeys)
- Twilio: [API Keys](https://console.twilio.com/)
- SendGrid: [API Keys](https://app.sendgrid.com/settings/api_keys)
- Mailgun: [API Keys](https://app.mailgun.com/app/account/security/api_keys)

---

### Personal Data (PII)

**Patterns Detected**: SSN, Credit Cards, Email, Phone, etc.

**Steps**:
1. **Identify what type of personal data** this is
2. **Assess the risk**:
   - If it's your own data: Remove it
   - If it's customer data: **Notify affected parties** (GDPR/CCPA compliance)
3. **Remove the data** from code/config
4. **Remove from Git history** (critical for PII)
5. **Review access logs** for unauthorized access
6. **Consider legal requirements** (data breach notification)

**Legal Considerations**:
- GDPR (EU): 72-hour breach notification
- CCPA (California): Consumer notification required
- HIPAA (US Healthcare): Breach notification required

---

## 🛠️ Git History Cleanup

### Using git filter-branch

```bash
# Remove file from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch PATH_TO_FILE" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: Rewrites history)
git push origin --force --all
```

### Using BFG Repo-Cleaner (Recommended)

```bash
# Install BFG
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Create passwords file
echo "OLD_SECRET" > passwords.txt

# Clean repository
bfg --replace-text passwords.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Using git-filter-repo (Modern Alternative)

```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove secrets
git filter-repo --invert-paths --path PATH_TO_FILE
```

## ✅ Verification

After remediation, verify the fix:

```bash
# Scan again
ml scan

# Check gate
ml gate --rule block-quarantined

# Check Git history
ml gate --rule block-quarantined --history
```

## 🚨 Emergency Response

If a secret is exposed in a public repository:

1. **Immediately revoke** the secret
2. **Generate new secret**
3. **Update all systems** using the old secret
4. **Review access logs** for unauthorized usage
5. **Consider rotating all related secrets**
6. **Clean Git history** (if repository is public)
7. **Monitor for abuse** (unauthorized API calls, etc.)

## 📋 Remediation Checklist

- [ ] Secret revoked/rotated
- [ ] New secret generated
- [ ] Code/config updated
- [ ] Git history cleaned (if public repo)
- [ ] Access logs reviewed
- [ ] Team notified (if applicable)
- [ ] Legal/compliance notified (if PII)
- [ ] Monitoring enabled for suspicious activity
- [ ] Documentation updated
- [ ] Prevention measures implemented

## 🔗 Additional Resources

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP: Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [NIST: Incident Response](https://www.nist.gov/cyberframework)

---

**Remember**: Speed is critical when secrets are exposed. Revoke immediately, then investigate.

