# 🔐 MemoryLink Threat Model

**Version:** 2.0.2  
**Last Updated:** January 2, 2026  
**Status:** Production

This document describes the security boundaries, threat model, and trust assumptions for MemoryLink.

---

## 📋 Overview

MemoryLink is a **local-first** secret detection tool. It operates entirely on your machine with:
- No network calls
- No telemetry
- No cloud dependencies

---

## 🎯 Security Goals

| Goal | Description | Status |
|------|-------------|--------|
| **Prevent Secret Leaks** | Block secrets from reaching Git remotes | ✅ Implemented |
| **Protect Detected Secrets** | Encrypt quarantined secrets at rest | ✅ Implemented |
| **Maintain Audit Trail** | Log all security events immutably | ✅ Implemented |
| **Zero Data Exfiltration** | No data leaves user's machine | ✅ Implemented |
| **Minimal Attack Surface** | No network, minimal dependencies | ✅ Implemented |

---

## 🏗️ Architecture Security

### Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER'S MACHINE                            │
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │  Your Code  │────▶│  MemoryLink │────▶│   Git Repo  │        │
│  │  (Scanned)  │     │  (Scanner)  │     │   (Clean)   │        │
│  └─────────────┘     └──────┬──────┘     └─────────────┘        │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │   If Secrets    │                          │
│                    │    Detected     │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│         ┌───────────────────┼───────────────────┐               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │  Quarantine │     │ Audit Trail │     │    Block    │        │
│  │ (Encrypted) │     │   (Logs)    │     │   Commit    │        │
│  └─────────────┘     └─────────────┘     └─────────────┘        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  NETWORK NEVER  │
                    │    ACCESSED     │
                    └─────────────────┘
```

### Trust Boundaries

| Zone | Trust Level | Data |
|------|-------------|------|
| **User's Home Dir** | High | `~/.memorylink/keys/` (encryption keys) |
| **Project Dir** | Medium | `.memorylink/` (project config, quarantine) |
| **Git Working Tree** | Low | Scanned for secrets |
| **Git Remote** | Untrusted | Should never receive secrets |
| **Network** | N/A | Never accessed |

---

## 🔑 Cryptographic Design

### Encryption

| Component | Algorithm | Key Size | Notes |
|-----------|-----------|----------|-------|
| **Quarantine Encryption** | AES-256-GCM | 256-bit | Authenticated encryption |
| **Key Derivation** | Random | 256-bit | Crypto-secure random |
| **IV Generation** | Random | 96-bit | Unique per encryption |

### Key Storage

```
~/.memorylink/
└── keys/
    └── <project-hash>.key    # 256-bit AES key
```

**Key Properties:**
- ✅ Stored outside project directory
- ✅ Never committed to Git
- ✅ One key per project (isolated)
- ⚠️ Should be 600 permissions (Unix) / User-only ACL (Windows)

### Key Rotation

Currently, keys are:
- Created on first `ml init`
- Never automatically rotated
- Manual rotation: Delete key file, re-run `ml init`

**Future (v2.1):** Automatic key rotation with `ml keys rotate`

---

## 🚨 Threat Analysis

### Threats Mitigated

| Threat | Mitigation | Effectiveness |
|--------|------------|---------------|
| **Accidental secret commit** | Pre-commit hook | ✅ High |
| **Accidental secret push** | Pre-push hook | ✅ High |
| **Secret in CI logs** | Masked output | ✅ High |
| **Quarantine file theft** | AES-256-GCM encryption | ✅ High |
| **Telemetry/tracking** | No network calls | ✅ Complete |

### Threats NOT Mitigated

| Threat | Why | Recommendation |
|--------|-----|----------------|
| **Malicious user disabling hooks** | User has full control | Use CI enforcement (`ml gate`) |
| **Key file theft** | If attacker has machine access | Use disk encryption (FileVault/BitLocker) |
| **Memory dump attacks** | Secrets in RAM during scan | Use secure OS, avoid shared machines |
| **Supply chain attacks** | npm dependency risks | Audit dependencies, use lockfile |
| **Secrets in Git history** | Already committed secrets | Use `ml gate --history` + `git filter-branch` |

### Out of Scope

These threats are explicitly NOT in MemoryLink's threat model:

1. **Malware on user's machine** - MemoryLink cannot protect against rootkits/keyloggers
2. **Physical access attacks** - Use full-disk encryption
3. **Social engineering** - User education required
4. **Zero-day vulnerabilities** - Keep MemoryLink updated

---

## 🛡️ Security Controls

### Input Validation

| Input | Validation | Risk |
|-------|------------|------|
| **File paths** | Normalized, no symlinks | Path traversal |
| **Regex patterns** | Pre-tested for ReDoS | Denial of service |
| **Config files** | JSON schema validation | Injection |
| **CLI arguments** | Type-checked | Command injection |

### File System Security

| Control | Implementation |
|---------|----------------|
| **Symlink handling** | Skipped by default |
| **Binary files** | Skipped (detected by magic bytes) |
| **Large files** | Size limit configurable |
| **Hidden files** | Scanned by default (configurable) |

### Git Integration Security

| Hook | Security Property |
|------|-------------------|
| **pre-commit** | Blocks staged files with secrets |
| **pre-push** | Full repo scan before push |
| **Bypass** | `--no-verify` (logged in audit) |

---

## 📊 Security Comparison

| Feature | MemoryLink | gitleaks | truffleHog | GitGuardian |
|---------|-----------|----------|------------|-------------|
| **Local-only** | ✅ | ✅ | ✅ | ❌ Cloud |
| **Zero telemetry** | ✅ | ✅ | ⚠️ Opt-out | ❌ Required |
| **Encrypted quarantine** | ✅ | ❌ | ❌ | ❌ |
| **Audit trail** | ✅ | ❌ | ❌ | ✅ Cloud |
| **Key isolation** | ✅ Home dir | N/A | N/A | N/A |

---

## 🔍 Security Verification

### Self-Check Command

```bash
ml self-check
```

Verifies:
- ✅ Installation integrity
- ✅ Git hooks installed
- ✅ Config file valid
- ✅ Key file exists and accessible

### Manual Verification

```bash
# Verify no network calls (run while scanning)
sudo lsof -i -P | grep memorylink
# Expected: No output (no network connections)

# Verify key permissions (Unix)
ls -la ~/.memorylink/keys/
# Expected: -rw------- (600)

# Verify quarantine encryption
file .memorylink/quarantined/*
# Expected: "data" (encrypted, not readable)
```

---

## 🚨 Incident Response

### If Secrets Were Committed

1. **Don't push** - If not pushed, secret is still local
2. **Remove from history**: `git filter-branch` or BFG Repo Cleaner
3. **Rotate the secret** - Consider it compromised
4. **Run `ml gate --history`** - Find all historical secrets
5. **Review audit logs** - `.memorylink/audit/`

### If Key File Compromised

1. **Delete the key**: `rm ~/.memorylink/keys/<project>.key`
2. **Re-initialize**: `ml init`
3. **Quarantined secrets** are now unreadable (acceptable loss)
4. **Audit logs** remain readable (not encrypted)

---

## 📋 Compliance Notes

### Relevant Standards

| Standard | Relevance | Status |
|----------|-----------|--------|
| **OWASP ASVS** | Secret management | Aligned |
| **OWASP ASI06** | AI security | Planned v3.0 |
| **PCI DSS** | Payment card data | Detects card patterns |
| **GDPR** | Personal data (India: Aadhaar) | Detects PII patterns |

### Audit Support

MemoryLink provides:
- ✅ Immutable audit logs (append-only)
- ✅ Timestamped events
- ✅ Detection fingerprints
- ✅ User action logging

---

## 📞 Security Contact

**Report security issues:** security@memorylink.dev (or GitHub Security Advisory)

**Response time:** 48 hours for initial response

**Disclosure policy:** Coordinated disclosure, 90-day window

---

## 📝 Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-02 | Initial threat model |

---

*This document is part of MemoryLink's security documentation.*

