# MemoryLink

**CLI tool that prevents secret leaks before they happen.**

[![npm](https://img.shields.io/npm/v/memorylink)](https://www.npmjs.com/package/memorylink)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> 🔒 **100% local. Zero telemetry. Your secrets never leave your machine.**

---

## 🎯 What is MemoryLink?

MemoryLink scans your code for secrets (API keys, passwords, tokens) and **blocks them before commit**.

| Protection | What It Does | When |
|------------|--------------|------|
| 🔍 **Scan** | Detects 129 secret patterns (API keys, passwords, PII) | On demand |
| 🪝 **Git Hooks** | Warns before you commit/push secrets | Every commit |
| 🚫 **CI/CD Block** | Blocks PRs with secrets (19 CI platforms) | Every PR |
| 🔐 **Quarantine** | Encrypts detected secrets (AES-256-GCM) | Automatic |
| 📝 **Audit** | Tracks all detections with timestamps | Always |

**How It Works:**
```
You Code → Git Commit → MemoryLink Scans → ⚠️ Warning (or 🚫 Block)
                                              ↓
                                    🔐 Secrets Quarantined
```

**Result:** Code confidently without worrying about leaking secrets!

---

## 🛠️ Works With

| Category | Supported |
|----------|-----------|
| **OS** | macOS, Linux, Windows (WSL2) |
| **Node.js** | v18+ |
| **Git** | Any project with Git |
| **CI/CD** | GitHub Actions, GitLab CI, Jenkins, CircleCI, Travis, Buildkite, Azure Pipelines, and 12 more |

**Use it with any editor, any language, any framework.**

---

## 👀 What You'll See

When MemoryLink finds a secret:

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  WARNING: 2 SECRETS DETECTED                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🔴 HIGH: AWS Access Key                            │
│     File: src/config.ts:15                          │
│     Found: AKIA************WXYZ                     │
│                                                     │
│  🟡 MEDIUM: Generic API Key                         │
│     File: .env.local:3                              │
│     Found: api_key=****...****                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Mode: INACTIVE (warnings only)                     │
│                                                     │
│  💡 To block commits with secrets:                  │
│     ml mode active                                  │
└─────────────────────────────────────────────────────┘
```

**Modes:**
- `INACTIVE` (default): Warns but allows commits ← **Good for learning**
- `ACTIVE`: Blocks commits with secrets ← **Good for teams/CI**

---

## 📦 Installation

### Prerequisites

- Node.js 18+ ([install](https://nodejs.org/))
- npm or pnpm
- **Windows users**: WSL2 recommended ([install guide](https://docs.microsoft.com/en-us/windows/wsl/install))

### Install from npm

```bash
npm install -g memorylink
```

### Verify Installation

```bash
ml --version
```

---

## 🚀 Quick Start (30 seconds)

### 1. Initialize MemoryLink

```bash
cd your-project
ml init
```

**What happens:**
1. ✅ Scans your entire project for existing secrets
2. ✅ Creates `.memorylink/` directory  
3. ✅ Installs Git hooks (pre-commit + pre-push)
4. ✅ Updates `.gitignore`
5. 💡 Shows any detected issues

### 2. That's It! You're Protected

From now on, every `git commit` and `git push` is automatically scanned.

---

## 🎯 Core Commands

| Command | What It Does |
|---------|--------------|
| `ml init` | Setup project + install Git hooks |
| `ml scan` | Find secrets in your project |
| `ml gate` | Check before commit/push |
| `ml mode` | Switch active (block) / inactive (warn) |
| `ml audit` | View security history |

### `ml scan` - Find Secrets

```bash
ml scan                    # Scan entire project
ml scan --path src/        # Scan specific directory
ml scan --json             # JSON output for CI/automation (v2.1)
```

### `ml doctor` - Health Check (v2.1)

```bash
ml doctor                  # Basic health checks
ml doctor --full           # Full diagnostics + benchmarks
ml doctor --json           # JSON output for automation
```

### `ml mode` - Switch Protection Level

```bash
ml mode                    # View current mode
ml mode active             # Block on secrets (teams/CI)
ml mode inactive           # Warn only (default)
```

### `ml gate` - Manual Check

```bash
ml gate --rule block-quarantined              # Check project
ml gate --rule block-quarantined --diff       # Check staged files only
ml gate --rule block-quarantined --history    # Check git history
```

---

## 🔒 6-Layer Protection

```
Layer 1: On-demand scan      → ml scan catches secrets immediately
Layer 2: Pre-commit hook     → Blocks before commit (staged files)
Layer 3: Pre-push hook       → Blocks before push (full scan)
Layer 4: CI/CD gate          → Auto-enforces when running in CI
Layer 5: Quarantine          → AES-256-GCM encrypted isolation
Layer 6: Audit trail         → Tracks everything with timestamps
```

> 💡 **Bonus:** `ml gate --history` scans Git history for old leaks!

---

## 📊 Active vs Inactive Mode

| Mode | Behavior | Exit Code | Use Case |
|------|----------|-----------|----------|
| **INACTIVE** (default) | ⚠️ Warns but allows | 0 | Local development |
| **ACTIVE** | ❌ Blocks commit/push | 1 | Production, CI/CD |

### Mode Priority

MemoryLink checks these in order (highest to lowest):

```
1. CLI Flag         --mode active / --enforce / --monitor
2. ENV Variable     ML_MODE=active / ML_MODE=inactive
3. CI Detection     GitHub Actions, GitLab CI, etc. (auto ACTIVE!)
4. Config File      .memorylink/config.json
5. Default          inactive
```

### One-Time Override

```bash
ML_MODE=active git push      # Force blocking for this push
ML_MODE=inactive git push    # Allow this push (temporary)
git push --no-verify         # Emergency bypass (Git built-in)
```

---

## 🎨 129 Secret Patterns

| Category | Examples |
|----------|----------|
| **Cloud** | AWS, Azure, GCP, DigitalOcean, Heroku |
| **AI/ML** | OpenAI, Claude/Anthropic, HuggingFace, Groq, Perplexity, Replicate |
| **Payment** | Stripe, PayPal, Square, Razorpay, PhonePe, Cashfree |
| **Auth** | GitHub, GitLab, Slack, Discord, JWT, OAuth, Clerk |
| **Database** | Supabase, PlanetScale, Turso, Neon, Upstash |
| **India** | Aadhaar, PAN, GSTIN, UPI, IFSC, Paytm, PhonePe, Instamojo |
| **Personal** | SSN, Credit Card, Phone, Email |
| **Browser** | localStorage, sessionStorage, cookies |

---

## 🌐 19 CI Platforms Auto-Detected

```
✅ GitHub Actions    ✅ GitLab CI       ✅ Jenkins
✅ CircleCI          ✅ Travis CI       ✅ Buildkite
✅ Azure Pipelines   ✅ TeamCity        ✅ Bitbucket
✅ Drone CI          ✅ AppVeyor        ✅ Semaphore
✅ Buddy             ✅ Vercel          ✅ Netlify
✅ Bitrise           ✅ Codeship        ✅ Generic CI
```

**CI always enforces ACTIVE mode automatically!**

---

## 🛠️ CI/CD Setup

### GitHub Actions

Add to `.github/workflows/memorylink.yml`:

```yaml
name: MemoryLink Gate
on: [pull_request, push]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g memorylink
      - run: ml gate --rule block-quarantined
```

### Quick Setup Command

```bash
ml ci --provider github    # Creates the workflow file for you
```

---

## 🚫 Handling False Positives

### Option 1: Inline Comment

```javascript
const API_ENDPOINT = "https://api.example.com"; // ml:ignore
```

### Option 2: Mark as False Positive

```bash
ml gate --mark-false <finding-id>
```

### Option 3: Config File

Add to `.memorylink/config.json`:

```json
{
  "ignores": {
    "values": ["test_key_not_real"],
    "patterns": ["example-api-key"],
    "files": ["tests/**", "docs/**"]
  }
}
```

---

## 📁 Directory Structure

```
.memorylink/
├── config.json         # User preferences
├── records/            # Safe content storage
├── quarantined/        # Encrypted secrets
├── audit/              # Security audit logs
└── falsePositives.json # Ignored findings
```

---

## 🔐 Security Features

| Feature | Implementation |
|---------|----------------|
| **Key Location** | `~/.memorylink/keys/` (NOT in project!) |
| **Encryption** | AES-256-GCM (industry standard) |
| **Secret Masking** | `AKIA****MPLE` in all output |
| **Zero Telemetry** | 100% local, no network calls |
| **Package Safety** | `.gitattributes` + `files` field |

---

## 🔧 Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| `ml: command not found` | `npx memorylink` or fix PATH |
| Hooks not running | `ml hooks --install` |
| False positive | Add `// ml:ignore` comment |
| Mode not changing | Check `ml mode` output |
| CI not blocking | Verify `CI=true` is set |

---

## 📚 Documentation

- [Product Guide](PRODUCT_GUIDE.md) - **Complete guide with testing & results**
- [Quick Reference](docs/QUICK_REFERENCE.md) - Cheat sheet
- [FAQ](docs/FAQ.md) - Common questions
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Problem solutions
- [Patterns](docs/PATTERNS.md) - All 129 patterns
- [Comparisons](docs/COMPARISONS.md) - vs other tools
- [Threat Model](docs/THREAT_MODEL.md) - Security boundaries & design
- [Remediation Guide](docs/REMEDIATION.md) - How to rotate leaked secrets

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

## 🙏 Support

- **Issues:** [GitHub Issues](https://github.com/mspworld/memorylink/issues)
- **Discussions:** [GitHub Discussions](https://github.com/mspworld/memorylink/discussions)

---

---

## ❓ FAQ

**Q: Why no MCP integration yet?**
> MCP (Model Context Protocol) support is planned for v3.0. We're ensuring the core secret detection is bulletproof first.

**Q: Does MemoryLink follow security standards?**
> Yes! MemoryLink follows security best practices aligned with [OWASP guidelines](https://owasp.org/). Full OWASP ASI06 compliance documentation is planned for v3.0.

**Q: Is it safe to use in enterprise environments?**
> Absolutely. 100% local operation, zero telemetry, AES-256-GCM encryption, and project-isolated keys make it enterprise-ready.

**Q: What makes MemoryLink different from gitleaks?**
> Better UX (color-coded output), India-specific patterns (Aadhaar, PAN, UPI), zero-config setup, and smart mode switching.

---

**MemoryLink** - Protect your secrets from AI leaks 🔒
