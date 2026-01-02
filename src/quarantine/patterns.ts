/**
 * Secret detection patterns
 * Week 2 Day 8-9: Secret detection
 * Based on SPEC.md v4.3.10 - 10 secret patterns
 */

/**
 * Secret pattern definition
 */
/**
 * Severity levels for patterns
 * Week 7: Context-aware severity classification
 */
export enum PatternSeverity {
  ERROR = 'error',  // Blocking - real secrets (28 patterns)
  WARN = 'warn',    // Warning - potential leaks (browser, debug patterns)
}

export interface SecretPattern {
  id: string;
  name: string;
  pattern: RegExp;
  description: string;
  severity?: PatternSeverity; // Week 7: ERROR (block) or WARN (alert)
}

/**
 * 20+ Secret Detection Patterns
 * Based on SPEC.md Week 4 requirement: 20+ security patterns
 * Week 2: Initial 10 patterns
 * Week 4: Expanded to 20+ patterns
 */
export const SECRET_PATTERNS: SecretPattern[] = [
  // Original 10 patterns (Week 2)
  {
    id: 'api-key-1',
    name: 'OpenAI/Anthropic API Key',
    pattern: /sk-[a-zA-Z0-9]{32,}/,
    description: 'OpenAI or Anthropic API key pattern (sk-...)',
  },
  {
    id: 'claude-api-key',
    name: 'Claude AI API Key (Anthropic)',
    pattern: /sk-ant-[a-zA-Z0-9_-]{95,}/,
    description: 'Anthropic Claude API key pattern (sk-ant-...)',
  },
  {
    id: 'api-key-2',
    name: 'Generic API Key',
    pattern: /api[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9]{20,}['"]?/i,
    description: 'Generic API key pattern',
  },
  {
    id: 'key-value-secret',
    name: 'Key-Value Secret (Generic)',
    pattern: /(?:secret|key|token|password|credential|auth|api[_-]?key|access[_-]?token|private[_-]?key|client[_-]?secret|api[_-]?secret)\s*[:=]\s*['"]?([a-zA-Z0-9\-_!@#$%^&*()+=]{16,})['"]?/i,
    description: 'Generic key-value secret pattern (catches ANY key name with secret-like value)',
  },
  {
    id: 'key-value-any',
    name: 'Any Key-Value with Secret Pattern',
    pattern: /[a-zA-Z_][a-zA-Z0-9_]*\s*[:=]\s*['"]?(sk-[a-zA-Z0-9-]{32,}|[a-zA-Z0-9\-_!@#$%^&*()+=]{32,})['"]?/i,
    description: 'Catches ANY key name with secret-like value (32+ chars, alphanumeric + special chars)',
  },
  {
    id: 'aws-key',
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/,
    description: 'AWS access key ID',
  },
  {
    id: 'password',
    name: 'Password',
    pattern: /password\s*[:=]\s*['"]?[^\s'"]{8,}['"]?/i,
    description: 'Password in config',
  },
  {
    id: 'token',
    name: 'Token',
    pattern: /token\s*[:=]\s*['"]?[a-zA-Z0-9]{20,}['"]?/i,
    description: 'Authentication token',
  },
  {
    id: 'private-key',
    name: 'Private Key',
    pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
    description: 'Private key (RSA, etc.)',
  },
  {
    id: 'db-url',
    name: 'Database URL',
    pattern: /(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@/i,
    description: 'Database connection string with credentials',
  },
  {
    id: 'github-token',
    name: 'GitHub Token',
    pattern: /ghp_[a-zA-Z0-9]{36}/,
    description: 'GitHub personal access token',
  },
  {
    id: 'slack-token',
    name: 'Slack Token',
    pattern: /xox[baprs]-[0-9a-zA-Z-]{10,}/,
    description: 'Slack API token',
  },
  {
    id: 'jwt',
    name: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
    description: 'JWT token pattern',
  },
  // Week 4: Additional 10+ patterns
  {
    id: 'stripe-key',
    name: 'Stripe API Key',
    pattern: /sk_live_[a-zA-Z0-9]{24,}|sk_test_[a-zA-Z0-9]{24,}/,
    description: 'Stripe live or test API key',
  },
  {
    id: 'aws-secret',
    name: 'AWS Secret Key',
    pattern: /aws_secret_access_key\s*[:=]\s*['"]?[A-Za-z0-9\/+=]{40}['"]?/i,
    description: 'AWS secret access key',
  },
  {
    id: 'google-api-key',
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z-_]{35}/,
    description: 'Google API key',
  },
  {
    id: 'azure-key',
    name: 'Azure Key',
    pattern: /AccountKey\s*[:=]\s*['"]?[a-zA-Z0-9+\/]{86}==['"]?/i,
    description: 'Azure storage account key',
  },
  {
    id: 'docker-registry',
    name: 'Docker Registry Credentials',
    pattern: /docker.*password\s*[:=]\s*['"]?[^\s'"]{8,}['"]?/i,
    description: 'Docker registry password',
  },
  {
    id: 'kubernetes-secret',
    name: 'Kubernetes Secret',
    pattern: /kind:\s*Secret|apiVersion:\s*v1.*Secret/i,
    description: 'Kubernetes secret YAML',
  },
  {
    id: 'slack-webhook',
    name: 'Slack Webhook URL',
    pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[a-zA-Z0-9]+/i,
    description: 'Slack webhook URL',
  },
  {
    id: 'discord-token',
    name: 'Discord Token',
    pattern: /[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/,
    description: 'Discord bot token',
  },
  {
    id: 'twilio-key',
    name: 'Twilio API Key',
    pattern: /SK[0-9a-fA-F]{32}/,
    description: 'Twilio API key',
  },
  {
    id: 'sendgrid-key',
    name: 'SendGrid API Key',
    pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/,
    description: 'SendGrid API key',
  },
  {
    id: 'mailgun-key',
    name: 'Mailgun API Key',
    pattern: /key-[0-9a-f]{32}/i,
    description: 'Mailgun API key',
  },
  {
    id: 'heroku-key',
    name: 'Heroku API Key',
    pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    description: 'Heroku API key (UUID format)',
  },
  {
    id: 'paypal-key',
    name: 'PayPal Client Secret',
    pattern: /client_secret\s*[:=]\s*['"]?[A-Za-z0-9_-]{50,}['"]?/i,
    description: 'PayPal client secret',
  },
  {
    id: 'square-key',
    name: 'Square Access Token',
    pattern: /EAAA[a-zA-Z0-9_-]{40,}/,
    description: 'Square access token',
  },
  {
    id: 'shopify-key',
    name: 'Shopify API Key',
    pattern: /shpat_[a-zA-Z0-9]{32,}/,
    description: 'Shopify private app access token',
  },
  // Personal Data Patterns
  {
    id: 'credit-card',
    name: 'Credit Card Number',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/,
    description: 'Credit card number (Visa, Mastercard, Amex, Discover)',
  },
  {
    id: 'pan-card',
    name: 'PAN Card (India)',
    pattern: /[A-Z]{5}[0-9]{4}[A-Z]{1}/,
    description: 'Indian PAN (Permanent Account Number) card',
  },
  {
    id: 'aadhaar',
    name: 'Aadhaar Number (India)',
    pattern: /\b[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}\b/,
    description: 'Indian Aadhaar number (12 digits)',
  },
  {
    id: 'ssn',
    name: 'Social Security Number (US)',
    pattern: /\b\d{3}-?\d{2}-?\d{4}\b/,
    description: 'US Social Security Number',
  },
  // Week 5: Standalone email pattern (PII)
  {
    id: 'email',
    name: 'Email Address',
    pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
    description: 'Email address (personal data leak)',
  },
  {
    id: 'bank-account',
    name: 'Bank Account Number',
    pattern: /(?:account|acc|bank)[\s_-]*(?:number|no|num)[\s:]*['"]?\d{9,18}['"]?/i,
    description: 'Bank account number',
  },
  {
    id: 'upi-id',
    name: 'UPI ID (India)',
    // More specific pattern: name@bank with known UPI handles (ybl, paytm, okicici, oksbi, etc.)
    // Avoids false positives like actions/checkout@v4
    pattern: /[a-zA-Z0-9._-]+@(?:ybl|paytm|okaxis|okicici|oksbi|okhdfcbank|upi|apl|axisbank|icici|hdfc|sbi|pnb|kotak|ibl)\b/i,
    description: 'UPI payment ID (format: name@bank)',
  },
  // Browser Data Leak Patterns
  {
    id: 'localstorage-secret',
    name: 'localStorage with Secret',
    pattern: /localStorage\.(setItem|getItem)\s*\(\s*['"](?:api[_-]?key|secret|token|password|credential)['"]/i,
    description: 'localStorage storing secrets (browser data leak risk)',
  },
  {
    id: 'sessionstorage-secret',
    name: 'sessionStorage with Secret',
    pattern: /sessionStorage\.(setItem|getItem)\s*\(\s*['"](?:api[_-]?key|secret|token|password|credential)['"]/i,
    description: 'sessionStorage storing secrets (browser data leak risk)',
  },
  {
    id: 'cookie-secret',
    name: 'Cookie with Secret',
    pattern: /document\.cookie\s*[=+].*(?:api[_-]?key|secret|token|password|credential)/i,
    description: 'Cookies storing secrets (browser data leak risk)',
  },
  {
    id: 'url-secret',
    name: 'Secret in URL',
    pattern: /(?:https?|ftp):\/\/[^\/\s]+(?:api[_-]?key|secret|token|password|credential)=[^\s&"']+/i,
    description: 'Secrets exposed in URL parameters (browser history leak)',
  },
  {
    id: 'console-log-secret',
    name: 'Console.log with Secret',
    // Only match if console.log contains an actual secret VALUE, not just the word "secret"
    // Pattern: console.log(..., actual_secret_value, ...)
    // Must have: console.log + actual secret pattern (sk-..., API_KEY=..., etc.)
    pattern: /console\.(log|warn|error|info)\s*\([^)]*(?:sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+|(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?)[^)]*\)/i,
    description: 'Secrets logged to console (browser dev tools leak) - only matches actual secret values, not messages about secrets',
  },
  // Real-World Data Leak Scenarios
  {
    id: 'email-password',
    name: 'Email with Password',
    pattern: /(?:email|mail|username)\s*[:=]\s*['"]?[^\s'"]+@[^\s'"]+['"]?\s*[,;]\s*(?:password|pass|pwd)\s*[:=]\s*['"]?[^\s'"]{8,}['"]?/i,
    description: 'Email and password together (credential leak risk)',
  },
  {
    id: 'phone-number',
    name: 'Phone Number',
    pattern: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/,
    description: 'Phone number (personal data leak)',
  },
  {
    id: 'ip-address',
    name: 'IP Address',
    pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/,
    description: 'IP address (privacy leak)',
  },
  {
    id: 'driver-license',
    name: 'Driver License',
    pattern: /(?:driver|driving)[\s_-]*(?:license|licence|id)[\s:]*['"]?[A-Z0-9]{6,12}['"]?/i,
    description: 'Driver license number',
  },
  {
    id: 'passport',
    name: 'Passport Number',
    pattern: /(?:passport)[\s:]*['"]?[A-Z]{1,2}[0-9]{6,9}['"]?/i,
    description: 'Passport number',
  },
  {
    id: 'cvv',
    name: 'CVV/CVC Code',
    pattern: /(?:cvv|cvc|cid)\s*[:=]\s*['"]?\d{3,4}['"]?/i,
    description: 'Credit card CVV/CVC code',
  },
  {
    id: 'pin-code',
    name: 'PIN Code',
    pattern: /(?:pin|pincode)[\s:]*['"]?\d{4,6}['"]?/i,
    description: 'PIN or pincode',
  },
  // Phase 1: High-Priority Missing Patterns (Based on AI Research)
  {
    id: 'gcp-service-account',
    name: 'GCP Service Account JSON',
    pattern: /"type"\s*:\s*"service_account".*?"(?:private_key|client_email)"\s*:\s*"[^"]+"/s,
    description: 'GCP service account JSON with private key or client email',
  },
  {
    id: 'redis-credentials',
    name: 'Redis Credentials',
    pattern: /redis:\/\/[^:]+:[^@]+@[^\s"']+/i,
    description: 'Redis connection string with credentials',
  },
  {
    id: 'terraform-secret',
    name: 'Terraform Secret',
    pattern: /(?:variable|secret|password|api_key)\s*[=:]\s*["']?[a-zA-Z0-9\-_]{20,}["']?/i,
    description: 'Terraform variable or secret with sensitive value',
  },
  {
    id: 'helm-secret',
    name: 'Helm Chart Secret',
    pattern: /(?:secret|secretKeyRef|secretName):\s*["']?[a-zA-Z0-9+\/]{20,}={0,2}["']?/i,
    description: 'Helm chart secret or secretKeyRef',
  },
  {
    id: 'docker-compose-secret',
    name: 'Docker Compose Secret',
    pattern: /(?:environment|secrets):\s*[\s\S]*?(?:API_KEY|SECRET|PASSWORD|TOKEN)\s*[=:]\s*["']?[^\s"']{8,}["']?/i,
    description: 'Docker Compose environment variable or secret',
  },
  {
    id: 'smtp-credentials',
    name: 'SMTP Credentials',
    pattern: /(?:smtp|SMTP)[:\/\/].*?[:\/\/][^:]+:[^@\s"']+@[^\s"']+|SMTP_(?:PASSWORD|PASS|PWD)\s*[=:]\s*["']?[^\s"']{8,}["']?/i,
    description: 'SMTP connection string or password',
  },
  {
    id: 'vpn-credentials',
    name: 'VPN Credentials',
    pattern: /(?:vpn|VPN)[:\/\/].*?[:\/\/][^:]+:[^@\s"']+@[^\s"']+|VPN_(?:PASSWORD|PASS|PWD|SECRET)\s*[=:]\s*["']?[^\s"']{8,}["']?/i,
    description: 'VPN connection string or password',
  },
  {
    id: 'oauth-client-secret',
    name: 'OAuth Client Secret',
    pattern: /(?:oauth|OAuth).*?client[_-]?secret\s*[=:]\s*["']?[a-zA-Z0-9\-_]{20,}["']?/i,
    description: 'OAuth client secret',
  },
  {
    id: 'iban',
    name: 'IBAN (International Bank Account Number)',
    pattern: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}\b/,
    description: 'International Bank Account Number',
  },
  {
    id: 'sin',
    name: 'SIN (Canadian Social Insurance Number)',
    pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{3}\b/,
    description: 'Canadian Social Insurance Number',
  },
  // Phase 3: Specialized Patterns (CI/CD, Logs, Cloud Storage)
  // CI/CD Pipeline Patterns
  {
    id: 'github-actions-secret',
    name: 'GitHub Actions Secret',
    pattern: /\$\{\{\s*secrets\.[A-Z_][A-Z0-9_]*\s*\}\}/i,
    description: 'GitHub Actions secret reference (should not be in code)',
  },
  {
    id: 'gitlab-ci-secret',
    name: 'GitLab CI Secret',
    pattern: /\$(?:CI_JOB_TOKEN|CI_REGISTRY_PASSWORD|CI_DEPLOY_PASSWORD|CI_BUILD_TOKEN)/i,
    description: 'GitLab CI secret variable',
  },
  {
    id: 'jenkins-credential',
    name: 'Jenkins Credential',
    pattern: /credentials\(['"]([^'"]+)['"]\)|withCredentials\s*\{[^}]*credentialsId[^}]*\}/i,
    description: 'Jenkins credential reference',
  },
  {
    id: 'circleci-secret',
    name: 'CircleCI Secret',
    pattern: /\$(?:CIRCLE_TOKEN|CIRCLE_API_KEY|CIRCLE_PROJECT_TOKEN)/i,
    description: 'CircleCI secret variable',
  },
  {
    id: 'ci-secret-dump',
    name: 'CI Secret Dump',
    // Only match actual commands, not comments
    // Skip lines that start with // or # (comments)
    pattern: /^(?!\s*[\/#]).*(?:printenv|env|set)\s+.*(?:API_KEY|SECRET|TOKEN|PASSWORD)\s*[:=]/im,
    description: 'CI/CD secret dump in logs or scripts (actual commands, not comments)',
  },
  // Log File Patterns
  {
    id: 'error-log-secret',
    name: 'Error Log with Secret',
    pattern: /(?:ERROR|FATAL|CRITICAL).*?(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/i,
    description: 'Secret exposed in error log',
  },
  {
    id: 'access-log-secret',
    name: 'Access Log with Secret',
    pattern: /(?:GET|POST|PUT|DELETE).*\?(?:api[_-]?key|secret|token|password)=[^\s"']+/i,
    description: 'Secret in access log (URL parameter)',
  },
  {
    id: 'debug-log-secret',
    name: 'Debug Log with Secret',
    pattern: /(?:DEBUG|TRACE|LOG).*?(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/i,
    description: 'Secret exposed in debug log',
  },
  {
    id: 'stack-trace-secret',
    name: 'Stack Trace with Secret',
    pattern: /(?:at\s+\w+\.\w+|Exception|Error).*?(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/i,
    description: 'Secret in stack trace or exception',
  },
  // Cloud Storage Configuration Patterns
  {
    id: 's3-public-bucket',
    name: 'S3 Public Bucket',
    pattern: /(?:ACL|PublicAccessBlock|BlockPublicAcls)\s*[:=]\s*(?:public-read|public-read-write|false|none)/i,
    description: 'S3 bucket configured as public (data leak risk)',
  },
  {
    id: 'azure-public-blob',
    name: 'Azure Public Blob',
    pattern: /(?:publicAccessLevel|accessType)\s*[:=]\s*(?:blob|container|public)/i,
    description: 'Azure blob storage configured as public',
  },
  {
    id: 'gcp-public-bucket',
    name: 'GCP Public Bucket',
    pattern: /(?:iamConfiguration|publicAccessPrevention)\s*[:=]\s*(?:none|unspecified)/i,
    description: 'GCP bucket configured as public',
  },
  {
    id: 'cloud-storage-credential',
    name: 'Cloud Storage Credential',
    pattern: /(?:s3|azure|gcp|gcs).*?(?:access[_-]?key|secret[_-]?key|account[_-]?key|service[_-]?account)\s*[:=]\s*['"]?[a-zA-Z0-9+\/]{20,}['"]?/i,
    description: 'Cloud storage credentials in config',
  },
  // Week 6: Instruction-injection patterns (OWASP ASI06 - Memory Poisoning Protection)
  {
    id: 'injection-ignore-rules',
    name: 'Ignore Previous Rules',
    pattern: /ignore\s+(previous|all|all\s+previous)\s+(rules?|instructions?|guidelines?)/i,
    description: 'Attempt to ignore previous rules (memory poisoning risk)',
  },
  {
    id: 'injection-ignore-security',
    name: 'Ignore Security',
    pattern: /ignore\s+(security|safety|protection|safeguards?)/i,
    description: 'Attempt to ignore security measures (memory poisoning risk)',
  },
  {
    id: 'injection-always-log',
    name: 'Always Log Secrets',
    pattern: /always\s+(log|print|output|display|show)\s+(secrets?|credentials?|passwords?|keys?|tokens?)/i,
    description: 'Instruction to always log secrets (memory poisoning risk)',
  },
  {
    id: 'injection-exfiltrate',
    name: 'Exfiltrate Data',
    pattern: /(exfiltrate|send|transmit|upload|export)\s+(data|secrets?|credentials?|information)/i,
    description: 'Instruction to exfiltrate data (memory poisoning risk)',
  },
  {
    id: 'injection-bypass-security',
    name: 'Bypass Security',
    pattern: /bypass\s+(security|safety|protection|safeguards?|checks?|validation)/i,
    description: 'Instruction to bypass security (memory poisoning risk)',
  },
  {
    id: 'injection-disable-checks',
    name: 'Disable Checks',
    pattern: /disable\s+(checks?|validation|verification|safeguards?|security)/i,
    description: 'Instruction to disable security checks (memory poisoning risk)',
  },
  {
    id: 'injection-skip-validation',
    name: 'Skip Validation',
    pattern: /skip\s+(validation|verification|checks?|safeguards?|security)/i,
    description: 'Instruction to skip validation (memory poisoning risk)',
  },
  {
    id: 'injection-override-security',
    name: 'Override Security',
    pattern: /override\s+(security|safety|protection|safeguards?|checks?|validation)/i,
    description: 'Instruction to override security (memory poisoning risk)',
  },
  // Week 7: Browser patterns (6 - WARN only, not blocking)
  {
    id: 'browser-localstorage',
    name: 'localStorage.setItem with token',
    pattern: /localStorage\.setItem\s*\(\s*['"](?:token|key|auth|secret|password|api[_-]?key|access[_-]?token)['"]\s*,\s*['"]?([^'"]{16,})['"]?/i,
    description: 'localStorage.setItem with sensitive data (browser leak risk)',
    severity: PatternSeverity.WARN,
  },
  {
    id: 'browser-sessionstorage',
    name: 'sessionStorage.setItem with token',
    pattern: /sessionStorage\.setItem\s*\(\s*['"](?:token|key|auth|secret|password|api[_-]?key|access[_-]?token)['"]\s*,\s*['"]?([^'"]{16,})['"]?/i,
    description: 'sessionStorage.setItem with sensitive data (browser leak risk)',
    severity: PatternSeverity.WARN,
  },
  {
    id: 'browser-console-log-header',
    name: 'console.log with Authorization header',
    pattern: /console\.(log|warn|error|info|debug)\s*\([^)]*(?:header|headers|authorization|Authorization|AUTHORIZATION)[^)]*['"]?([A-Za-z0-9+/=_-]{20,})['"]?/i,
    description: 'console.log with sensitive headers (browser leak risk)',
    severity: PatternSeverity.WARN,
  },
  {
    id: 'browser-url-token',
    name: 'URL parameter ?token=',
    pattern: /[?&](?:token|key|auth|secret|password|api[_-]?key|access[_-]?token)\s*=\s*['"]?([A-Za-z0-9+/=_-]{16,})['"]?/i,
    description: 'URL parameter with token (browser leak risk)',
    severity: PatternSeverity.WARN,
  },
  {
    id: 'browser-url-key',
    name: 'URL parameter ?key=',
    pattern: /[?&]key\s*=\s*['"]?([A-Za-z0-9+/=_-]{16,})['"]?/i,
    description: 'URL parameter with key (browser leak risk)',
    severity: PatternSeverity.WARN,
  },
  {
    id: 'browser-url-auth',
    name: 'URL parameter ?auth=',
    pattern: /[?&]auth\s*=\s*['"]?([A-Za-z0-9+/=_-]{16,})['"]?/i,
    description: 'URL parameter with auth (browser leak risk)',
    severity: PatternSeverity.WARN,
  },
  // Week 7: Debug patterns (8 - WARN only)
  {
    id: 'debug-console-log-sensitive',
    name: 'console.log with sensitive data',
    pattern: /console\.(log|warn|error|info|debug)\s*\([^)]*(?:password|secret|token|key|auth|credential|api[_-]?key|access[_-]?token)\s*[:=]\s*['"]?([A-Za-z0-9+/=_-]{16,})['"]?/i,
    description: 'console.log with sensitive data (debug leak risk)',
    severity: PatternSeverity.WARN,
  },
  {
    id: 'debug-logger-request-response',
    name: 'Logger with request/response data',
    pattern: /(?:logger|log)\.(?:info|debug|warn|error|log)\s*\([^)]*(?:request|response|headers?|body|params?)[^)]*(?:password|secret|token|key|auth|credential|api[_-]?key|access[_-]?token)\s*[:=]\s*['"]?([A-Za-z0-9+/=_-]{16,})['"]?/i,
    description: 'Logger with request/response containing secrets (debug leak risk)',
    severity: PatternSeverity.WARN,
  },
  {
    id: 'debug-print-echo-secret',
    name: 'print/echo with secret',
    pattern: /(?:print|echo|printf|puts)\s+(?:.*?)(?:password|secret|token|key|auth|credential|api[_-]?key|access[_-]?token)\s*[:=]\s*['"]?([A-Za-z0-9+/=_-]{16,})['"]?/i,
    description: 'print/echo with secret (debug leak risk)',
    severity: PatternSeverity.WARN,
  },
  {
    id: 'debug-todo-secret',
    name: 'TODO comment with secret',
    pattern: /TODO[^:]*[:]\s*.*?(?:password|secret|token|key|auth|credential|api[_-]?key|access[_-]?token)\s*[:=]\s*['"]?([A-Za-z0-9+/=_-]{16,})['"]?/i,
    description: 'TODO comment containing secret (debug leak risk)',
    severity: PatternSeverity.WARN,
  },
  {
    id: 'debug-stack-trace-production',
    name: 'Stack trace in production code',
    pattern: /(?:printStackTrace|console\.trace|logger\.trace|log\.trace|traceback|stackTrace)\s*\(/i,
    description: 'Stack trace logging in production (debug leak risk)',
    severity: PatternSeverity.WARN,
  },
  {
    id: 'debug-verbose-error',
    name: 'Verbose error with sensitive data',
    pattern: /(?:error|exception|throw)\s+.*?(?:password|secret|token|key|auth|credential|api[_-]?key|access[_-]?token)\s*[:=]\s*['"]?([A-Za-z0-9+/=_-]{16,})['"]?/i,
    description: 'Verbose error containing secrets (debug leak risk)',
    severity: PatternSeverity.WARN,
  },
  {
    id: 'debug-temporary-logging',
    name: 'Temporary logging statement',
    pattern: /(?:TEMP|TMP|DEBUG|FIXME|HACK|XXX)\s*[:]\s*.*?(?:console\.(?:log|warn|error|info|debug)|logger\.(?:info|debug|warn|error)|print|echo)/i,
    description: 'Temporary logging statement (debug leak risk)',
    severity: PatternSeverity.WARN,
  },
  {
    id: 'debug-development-only',
    name: 'Development-only code with secrets',
    pattern: /(?:if\s*\([^)]*(?:development|dev|debug|test|local)[^)]*\)|process\.env\.NODE_ENV\s*[!=]=\s*['"]production['"]).*?(?:password|secret|token|key|auth|credential|api[_-]?key|access[_-]?token)\s*[:=]\s*['"]?([A-Za-z0-9+/=_-]{16,})['"]?/i,
    description: 'Development-only code with secrets (debug leak risk)',
    severity: PatternSeverity.WARN,
  },
  // Additional patterns from AI expert review (Quick Polish)
  {
    id: 'sentry-dsn',
    name: 'Sentry DSN',
    pattern: /https:\/\/[a-f0-9]{32}@[a-z0-9]+\.ingest\.sentry\.io\/\d+/i,
    description: 'Sentry DSN with secret key (error tracking credentials)',
  },
  {
    id: 'digitalocean-token',
    name: 'DigitalOcean Token',
    pattern: /dop_v1_[a-f0-9]{64}/i,
    description: 'DigitalOcean personal access token',
  },
  {
    id: 'vercel-token',
    name: 'Vercel Token',
    pattern: /[a-zA-Z0-9]{24}/i,
    description: 'Vercel deployment token',
  },
  {
    id: 'netlify-token',
    name: 'Netlify Token',
    pattern: /[a-zA-Z0-9_-]{40,}/i,
    description: 'Netlify personal access token',
  },
  {
    id: 'razorpay-key',
    name: 'Razorpay Key (India)',
    pattern: /rzp_(?:live|test)_[a-zA-Z0-9]{14}/i,
    description: 'Razorpay API key (India payment gateway)',
  },
  // AI Reviewer Suggestions (January 2026)
  {
    id: 'firebase-admin',
    name: 'Firebase Admin SDK Key',
    pattern: /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/,
    description: 'Firebase Admin SDK private key',
  },
  {
    id: 'huggingface-token',
    name: 'HuggingFace Token',
    pattern: /hf_[a-zA-Z0-9]{34,}/,
    description: 'HuggingFace API token',
  },
  {
    id: 'railway-token',
    name: 'Railway.app Token',
    pattern: /railway\.(?:token|projectToken)\s*[:=]\s*['"]?([a-zA-Z0-9_\-\.]{32,})['"]?/i,
    description: 'Railway.app deployment token',
  },
  {
    id: 'openssh-private-key',
    name: 'OpenSSH Private Key',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/,
    description: 'OpenSSH private key header',
  },
  {
    id: 'mongodb-srv',
    name: 'MongoDB SRV Connection String',
    pattern: /mongodb\+srv:\/\/[^\s"']+/i,
    description: 'MongoDB Atlas connection string with credentials',
  },
  {
    id: 'linear-api-key',
    name: 'Linear API Key',
    pattern: /lin_api_[a-zA-Z0-9]{40,}/,
    description: 'Linear project management API key',
  },
  {
    id: 'notion-token',
    name: 'Notion Integration Token',
    pattern: /secret_[a-zA-Z0-9]{43}/,
    description: 'Notion internal integration token',
  },
  {
    id: 'cohere-api-key',
    name: 'Cohere API Key',
    pattern: /[a-zA-Z0-9]{40}/,
    description: 'Cohere AI API key',
  },
  {
    id: 'gitlab-token',
    name: 'GitLab Personal Access Token',
    pattern: /glpat-[a-zA-Z0-9\-_]{20,}/,
    description: 'GitLab personal access token',
  },
  {
    id: 'bitbucket-token',
    name: 'Bitbucket App Password',
    pattern: /ATBB[a-zA-Z0-9]{32,}/,
    description: 'Bitbucket app password',
  },
  {
    id: 'datadog-api-key',
    name: 'Datadog API Key',
    pattern: /[a-f0-9]{32}/i,
    description: 'Datadog API or app key',
  },
  {
    id: 'newrelic-key',
    name: 'New Relic License Key',
    pattern: /NRAK-[A-Z0-9]{27}/,
    description: 'New Relic license key',
  },
  {
    id: 'gstin',
    name: 'GSTIN (India)',
    pattern: /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/,
    description: 'Indian Goods and Services Tax Identification Number',
  },
  {
    id: 'ifsc-code',
    name: 'IFSC Code (India)',
    pattern: /[A-Z]{4}0[A-Z0-9]{6}/,
    description: 'Indian Financial System Code for bank branches',
  },
  {
    id: 'paytm-key',
    name: 'Paytm Merchant Key (India)',
    pattern: /(?:PAYTM|paytm).*?(?:merchant[_-]?key|MID)\s*[:=]\s*['"]?[a-zA-Z0-9]{16,}['"]?/i,
    description: 'Paytm merchant key',
  },
  // v2.1: New patterns based on expert feedback
  {
    id: 'supabase-key',
    name: 'Supabase API Key',
    pattern: /sbp_[a-f0-9]{40}|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
    description: 'Supabase service role or anon key',
  },
  {
    id: 'supabase-url',
    name: 'Supabase Database URL',
    pattern: /postgresql:\/\/postgres:[^@]+@[a-z0-9-]+\.supabase\.co:\d+\/postgres/i,
    description: 'Supabase database connection string',
  },
  {
    id: 'planetscale-token',
    name: 'PlanetScale Database Token',
    pattern: /pscale_tkn_[a-zA-Z0-9_-]{43}/,
    description: 'PlanetScale database token',
  },
  {
    id: 'upstash-token',
    name: 'Upstash Redis Token',
    pattern: /AX[a-zA-Z0-9]{34,}/,
    description: 'Upstash Redis REST API token',
  },
  {
    id: 'clerk-key',
    name: 'Clerk API Key',
    pattern: /sk_(?:live|test)_[a-zA-Z0-9]{24,}/,
    description: 'Clerk authentication API key',
  },
  {
    id: 'resend-key',
    name: 'Resend API Key',
    pattern: /re_[a-zA-Z0-9]{24,}/,
    description: 'Resend email API key',
  },
  {
    id: 'turso-token',
    name: 'Turso Database Token',
    pattern: /[a-zA-Z0-9_-]+\.turso\.io/,
    description: 'Turso database URL or token',
  },
  {
    id: 'neon-connection',
    name: 'Neon Database Connection',
    pattern: /postgres:\/\/[^:]+:[^@]+@[a-z0-9-]+\.neon\.tech/i,
    description: 'Neon serverless Postgres connection string',
  },
  {
    id: 'phonepe-key',
    name: 'PhonePe Merchant Key (India)',
    pattern: /(?:PHONEPE|phonepe).*?(?:merchant[_-]?(?:key|id)|salt[_-]?key)\s*[:=]\s*['"]?[a-zA-Z0-9-]{16,}['"]?/i,
    description: 'PhonePe payment gateway key',
  },
  {
    id: 'cashfree-key',
    name: 'Cashfree API Key (India)',
    pattern: /(?:CASHFREE|cashfree).*?(?:app[_-]?id|secret[_-]?key)\s*[:=]\s*['"]?[a-zA-Z0-9]{16,}['"]?/i,
    description: 'Cashfree payment gateway credentials',
  },
  {
    id: 'instamojo-key',
    name: 'Instamojo API Key (India)',
    pattern: /(?:INSTAMOJO|instamojo).*?(?:api[_-]?key|auth[_-]?token)\s*[:=]\s*['"]?[a-zA-Z0-9]{16,}['"]?/i,
    description: 'Instamojo payment gateway key',
  },
  {
    id: 'replicate-token',
    name: 'Replicate API Token',
    pattern: /r8_[a-zA-Z0-9]{37}/,
    description: 'Replicate AI model API token',
  },
  {
    id: 'together-key',
    name: 'Together AI API Key',
    pattern: /[a-f0-9]{64}/,
    description: 'Together AI API key',
  },
  {
    id: 'groq-key',
    name: 'Groq API Key',
    pattern: /gsk_[a-zA-Z0-9]{52}/,
    description: 'Groq AI inference API key',
  },
  {
    id: 'perplexity-key',
    name: 'Perplexity API Key',
    pattern: /pplx-[a-f0-9]{48}/,
    description: 'Perplexity AI API key',
  },
];

/**
 * Get pattern by ID
 */
export function getPatternById(id: string): SecretPattern | undefined {
  return SECRET_PATTERNS.find(p => p.id === id);
}

/**
 * Get all pattern IDs
 */
export function getAllPatternIds(): string[] {
  return SECRET_PATTERNS.map(p => p.id);
}

