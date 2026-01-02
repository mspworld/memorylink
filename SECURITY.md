# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Scope

MemoryLink v1.0 is a **local-first, project-scoped CLI tool**:

- **Local execution**: All scanning and quarantine operations run on your machine
- **No network calls**: MemoryLink never sends data to external servers
- **Project-scoped**: Each project has its own `.memorylink/` directory
- **File-based storage**: All data stored as local JSON files

### What MemoryLink Protects Against

✅ Secrets accidentally written by AI agents  
✅ API keys in code files  
✅ Passwords in configuration  
✅ Personal data patterns (SSN, credit cards, etc.)  
✅ Debug/console statements with sensitive data  

### Current Limitations (v1.0)

- Detection is pattern-based (not semantic analysis)
- Quarantine files stored locally (no cloud sync)
- Single-user scope (no team features in v1.0)

## How Secrets Are Handled

### Detection
1. **112 built-in patterns** detect common secret formats (AWS, OpenAI, Stripe, Aadhaar, PAN, etc.)
2. **Dynamic key-value detection** catches generic `key=value` secrets
3. **Configurable whitelist** prevents false positives

### Quarantine
1. Detected secrets are moved to `.memorylink/quarantined/`
2. Files are **encrypted at rest** using AES-256-GCM
3. Only the project owner can decrypt quarantined files

### Storage Security
- `.memorylink/` is auto-added to `.gitignore`
- Quarantine directory has restricted permissions (700)
- Encryption key stored separately from encrypted data

## Reporting a Vulnerability

**DO NOT** open a public GitHub issue for security vulnerabilities.

### How to Report

1. **Email**: Send details to [security contact - add your email]
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

| Action | Timeline |
|--------|----------|
| Initial acknowledgment | 48 hours |
| Severity assessment | 7 days |
| Fix development | 14-30 days |
| Public disclosure | After fix released |

### What to Expect

- We take all reports seriously
- You'll receive regular updates on progress
- Credit will be given (unless you prefer anonymity)
- No legal action for good-faith security research

## Security Best Practices

When using MemoryLink:

```bash
# Always run scan before committing
ml scan

# Check git hooks are installed
ml hooks status

# Review quarantined files regularly
ml audit

# Use block mode for critical projects
ml config --set block_mode=true
```

## Encryption Details

### Algorithm
- **AES-256-GCM** for quarantine encryption
- **PBKDF2** for key derivation (100,000 iterations)
- **Random IV** for each encrypted file

### Key Storage
- Encryption key stored in `~/.memorylink-key` (user home)
- Key file permissions: `600` (owner read/write only)
- Key is never stored in project directory

## Updates and Patches

Security patches are released as:
- **Critical**: Same day patch release
- **High**: Within 7 days
- **Medium**: Next minor release
- **Low**: Next major release

## Contact

For security concerns:
- GitHub Security Advisories: [Create advisory on GitHub]
- Email: [Add security contact email]

---

**Last Updated**: 2026-01-01  
**Version**: 1.0.0

