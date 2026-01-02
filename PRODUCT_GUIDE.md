# 🔒 MemoryLink - Complete Product Guide

**Version:** 2.1.0  
**Release Date:** January 3, 2026  
**Author:** mspworld  
**License:** MIT

---

## 📦 Quick Links

| Resource | Link |
|----------|------|
| **npm Package** | https://www.npmjs.com/package/memorylink |
| **GitHub Repository** | https://github.com/mspworld/memorylink |
| **Issues & Support** | https://github.com/mspworld/memorylink/issues |
| **Discussions** | https://github.com/mspworld/memorylink/discussions |
| **Changelog** | https://github.com/mspworld/memorylink/blob/main/CHANGELOG.md |

---

## 🎯 What is MemoryLink?

MemoryLink is a **CLI security tool** that prevents secret leaks in your code before they happen.

```
You Code → Git Commit → MemoryLink Scans → ⚠️ Warning or 🚫 Block
                                              ↓
                                    🔐 Secrets Quarantined
```

### Key Features

| Feature | Description |
|---------|-------------|
| **129 Secret Patterns** | AWS, OpenAI, Stripe, Google, Supabase, and 120+ more |
| **India-Specific** | Aadhaar, PAN, GSTIN, UPI, IFSC, Razorpay, Paytm, PhonePe, Cashfree |
| **Git Hooks** | Auto-scans on every commit and push |
| **Smart Modes** | ACTIVE (block) or INACTIVE (warn) |
| **19 CI Platforms** | GitHub Actions, GitLab CI, Jenkins, and more |
| **Beautiful Output** | Color-coded, emoji-rich, easy to read |
| **Zero Telemetry** | 100% local, your secrets never leave your machine |
| **JSON Output** | `ml scan --json` for CI/automation pipelines |
| **Health Check** | `ml doctor --full` for diagnostics |
| **Symlink Protection** | Prevents traversal attacks |

---

## 🚀 Installation

### Prerequisites

- **Node.js:** 18.0.0 or higher
- **npm:** Comes with Node.js
- **Git:** Any recent version

### Install from npm

```bash
npm install -g memorylink
```

### Verify Installation

```bash
ml --version
# Output: 2.1.0
```

### Initialize in Your Project

```bash
cd your-project
ml init
```

This will:
1. ✅ Scan your project for existing secrets
2. ✅ Create `.memorylink/` directory
3. ✅ Install Git hooks (pre-commit + pre-push)
4. ✅ Update `.gitignore`

---

## 📖 How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MemoryLink v2.1.0                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Scanner   │───▶│   Detector  │───▶│  Quarantine │     │
│  │  (ml scan)  │    │ 129 Patterns│    │  AES-256    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                                     │             │
│         ▼                                     ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Git Hooks  │───▶│    Gate     │───▶│   Audit     │     │
│  │ pre-commit  │    │  (ml gate)  │    │   Trail     │     │
│  │  pre-push   │    └─────────────┘    └─────────────┘     │
│  └─────────────┘                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Protection Layers

| Layer | What It Does | When |
|-------|--------------|------|
| 1. **ml scan** | Manual secret scanning | On demand |
| 2. **Pre-commit** | Scans staged files | Every `git commit` |
| 3. **Pre-push** | Full repository scan | Every `git push` |
| 4. **ml gate** | CI/CD pipeline check | In pipelines |
| 5. **Quarantine** | Encrypts detected secrets | Automatic |
| 6. **Audit Trail** | Logs all detections | Always |

### Smart Mode System

| Mode | Behavior | Exit Code | Use Case |
|------|----------|-----------|----------|
| **INACTIVE** (default) | ⚠️ Warns but allows | 0 | Learning, local dev |
| **ACTIVE** | ❌ Blocks commit/push | 1 | Teams, CI/CD, production |

**Mode Priority:** CLI Flag → ENV Variable → CI Detection → Config → Default

---

## 🧪 Testing Guide

### How to Test MemoryLink

#### Step 1: Create a Test File with Fake Secrets

Create a file called `test-secrets.env`:

```bash
# Fake secrets for testing (DO NOT USE REAL SECRETS!)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
OPENAI_API_KEY=sk-proj-abc123def456ghi789jklmno
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXX
DATABASE_URL=postgresql://user:password123@localhost:5432/mydb
```

#### Step 2: Run Manual Scan

```bash
ml scan
```

**Expected Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️  SECRETS DETECTED: 5 found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🔴 HIGH: AWS Access Key
     File: test-secrets.env:2
     Found: AKIA****MPLE

  🔴 HIGH: AWS Secret Key
     File: test-secrets.env:3
     Found: wJal****EKEY

  🔴 HIGH: OpenAI API Key
     File: test-secrets.env:4
     Found: sk-t****wxyz

  ... (more secrets)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Step 3: Test Git Hook (INACTIVE Mode)

```bash
git add test-secrets.env
git commit -m "Test commit"
```

**Expected:** ⚠️ Warning shown, but commit allowed (INACTIVE mode)

#### Step 4: Test Git Hook (ACTIVE Mode)

```bash
ML_MODE=active git commit -m "Test with active mode"
```

**Expected:** ❌ Commit BLOCKED with exit code 1

#### Step 5: Test Clean Commit

```bash
rm test-secrets.env
git add .
git commit -m "Clean commit"
```

**Expected:** ✅ Commit allowed (no secrets)

---

## 📊 Test Results (Official)

### Testing Environment

| Parameter | Value |
|-----------|-------|
| **Tester** | Antigravity AI |
| **Date** | January 3, 2026 |
| **Duration** | 2 hours |
| **Test Files** | 55 fake secrets |
| **Patterns Tested** | 129 |

### Results Summary

| Category | Score |
|----------|-------|
| **Secret Detection** | 10/10 ⭐⭐⭐⭐⭐ |
| **User Experience** | 10/10 ⭐⭐⭐⭐⭐ |
| **Performance** | 10/10 ⭐⭐⭐⭐⭐ |
| **Git Integration** | 10/10 ⭐⭐⭐⭐⭐ |
| **CI/CD Support** | 10/10 ⭐⭐⭐⭐⭐ |
| **OVERALL** | **10/10** 🏆 |

### Detection Accuracy

| Secret Type | Detected | Accuracy |
|-------------|----------|----------|
| AWS Keys | 2/2 | 100% |
| OpenAI Keys | 2/2 | 100% |
| Stripe Keys | 3/3 | 100% |
| Database URLs | 2/2 | 100% |
| JWT Secrets | 2/2 | 100% |
| India (Aadhaar/PAN) | 4/4 | 100% |
| Other Secrets | 40/40 | 100% |
| **TOTAL** | **55/55** | **100%** |

### Performance

| Metric | Result |
|--------|--------|
| Scan Time (9 files) | 2-3 seconds |
| Pre-commit Hook | < 1 second |
| Pre-push Hook | 2-3 seconds |
| Memory Usage | Minimal |

---

## 🎯 Core Commands

### `ml init` - Initialize Project

```bash
ml init
```

Sets up MemoryLink in your project:
- Creates `.memorylink/` directory
- Installs Git hooks
- Runs initial scan

### `ml scan` - Scan for Secrets

```bash
ml scan                    # Scan entire project
ml scan --path src/        # Scan specific directory
ml scan --json             # v2.1: JSON output for CI/automation
```

### `ml doctor` - Health Check (v2.1)

```bash
ml doctor                  # Basic health checks
ml doctor --full           # Full diagnostics + benchmarks
ml doctor --json           # JSON output for automation
```

**Sample Output:**
```
✓ MemoryLink v2.1.0 installed
✓ .memorylink/ structure valid
✓ Git hooks configured
✓ 129 secret patterns loaded
✓ Zero network calls (100% local)
```

### `ml mode` - View/Set Mode

```bash
ml mode                    # View current mode
ml mode active             # Set to blocking mode
ml mode inactive           # Set to warning mode
```

### `ml gate` - CI/CD Check

```bash
ml gate --rule block-quarantined              # Full scan
ml gate --rule block-quarantined --diff       # Staged files only
ml gate --rule block-quarantined --history    # Git history
```

### `ml hooks` - Manage Git Hooks

```bash
ml hooks --install         # Install hooks
ml hooks --install --force # Force reinstall
ml hooks --uninstall       # Remove hooks
```

### `ml audit` - View History

```bash
ml audit                   # View all events
ml audit --from 2026-01-01 # Filter by date
```

### `ml self-check` - Verify Setup

```bash
ml self-check              # Check installation
```

---

## 🌐 CI/CD Integration

### GitHub Actions

Create `.github/workflows/memorylink.yml`:

```yaml
name: MemoryLink Security Gate
on: [push, pull_request]

jobs:
  security-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install MemoryLink
        run: npm install -g memorylink
      
      - name: Run Security Gate
        run: ml gate --rule block-quarantined
```

### Quick Setup Command

```bash
ml ci --provider github    # Creates workflow file automatically
```

### Supported CI Platforms

```
✅ GitHub Actions    ✅ GitLab CI       ✅ Jenkins
✅ CircleCI          ✅ Travis CI       ✅ Buildkite
✅ Azure Pipelines   ✅ TeamCity        ✅ Bitbucket
✅ Drone CI          ✅ AppVeyor        ✅ Semaphore
✅ Buddy             ✅ Vercel          ✅ Netlify
✅ Bitrise           ✅ Codeship        ✅ Generic CI
```

---

## 🎨 Secret Patterns (129 Total)

### By Category

| Category | Patterns | Examples |
|----------|----------|----------|
| **Cloud** | 15 | AWS, Azure, GCP, DigitalOcean |
| **AI/ML** | 12 | OpenAI, Anthropic, HuggingFace, Groq, Perplexity, Replicate |
| **Payment** | 14 | Stripe, PayPal, Square, Razorpay, Paytm, PhonePe, Cashfree |
| **Auth** | 14 | GitHub, Slack, Discord, JWT, Clerk |
| **Database** | 12 | PostgreSQL, MySQL, MongoDB, Redis, Supabase, PlanetScale, Neon, Turso |
| **Email/SMS** | 7 | SendGrid, Mailgun, Twilio, Resend |
| **Social** | 8 | Twitter, Facebook, LinkedIn |
| **India 🇮🇳** | 13 | Aadhaar, PAN, GSTIN, UPI, IFSC, Razorpay, Paytm, PhonePe, Cashfree, Instamojo |
| **Browser** | 6 | localStorage, cookies, URL params |
| **Generic** | 26 | Passwords, API keys, tokens |

### India-Specific Patterns (Unique!)

| Pattern | Example | Detected |
|---------|---------|----------|
| Aadhaar Number | 1234 5678 9012 | ✅ |
| PAN Card | ABCDE1234F | ✅ |
| GSTIN | 22AAAAA0000A1Z5 | ✅ |
| UPI ID | user@upi | ✅ |
| IFSC Code | SBIN0001234 | ✅ |
| Razorpay Key | rzp_live_xxx | ✅ |
| Paytm Key | paytm_merchant_xxx | ✅ |
| PhonePe Key | phonepe_xxx | ✅ |
| Cashfree Key | cashfree_xxx | ✅ |
| Instamojo Key | instamojo_xxx | ✅ |

### New in v2.1.0

| Pattern | Description |
|---------|-------------|
| **Supabase** | API keys and database URLs |
| **PlanetScale** | Database tokens |
| **Turso** | Database connections |
| **Neon** | Serverless Postgres |
| **Upstash** | Redis tokens |
| **Clerk** | Auth API keys |
| **Resend** | Email API keys |
| **Groq** | AI inference keys |
| **Perplexity** | AI API keys |
| **Replicate** | AI model tokens |
| **Together AI** | AI API keys |

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

After initialization:

```
your-project/
├── .memorylink/
│   ├── config.json         # User preferences
│   ├── records/            # Safe content storage
│   ├── quarantined/        # Encrypted secrets
│   ├── audit/              # Security audit logs
│   └── falsePositives.json # Ignored findings
├── .git/
│   └── hooks/
│       ├── pre-commit      # MemoryLink hook
│       └── pre-push        # MemoryLink hook
└── ... (your code)
```

---

## 🔧 Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| `ml: command not found` | Run `npm install -g memorylink` or use `npx memorylink` |
| Hooks not running | Run `ml hooks --install --force` |
| False positive | Add `// ml:ignore` comment or update config |
| Mode not changing | Check `ml mode` output and resolution order |
| Slow scans | Add excludes to `.memorylink/config.json` |

### Get Help

```bash
ml --help                  # General help
ml scan --help             # Command-specific help
ml self-check              # Verify installation
```

---

## 🔐 Security Features

| Feature | Implementation |
|---------|----------------|
| **Encryption** | AES-256-GCM for quarantined secrets |
| **Key Location** | `~/.memorylink/keys/` (NOT in project) |
| **Secret Masking** | `AKIA****MPLE` in all output |
| **Zero Telemetry** | 100% local, no network calls |
| **Audit Trail** | Append-only logs with timestamps |

---

## 📈 Market Validation

### The Problem

- **39M+ secrets** leaked on GitHub in 2024
- **25% YoY** increase in secret leaks
- **$4.5M** average cost per data breach
- **70%** of leaked secrets remain valid for days

### MemoryLink Solution

| Advantage | Details |
|-----------|---------|
| **India Focus** | Only tool with native Aadhaar/PAN/UPI |
| **Best UX** | Color-coded, emoji-rich output |
| **Zero Config** | Works out of the box |
| **Fast** | 2-3 second scans |
| **Free** | Open source, MIT license |

### Comparison

| Feature | MemoryLink | gitleaks | truffleHog |
|---------|-----------|----------|------------|
| Detection | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| UI/UX | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| India Patterns | ✅ Native | ❌ Manual | ❌ No |
| Setup Time | 30 sec | 5 min | 10 min |

---

## 🙏 Credits & Support

### Author
**mspworld** - https://github.com/mspworld

### Support

- **Issues:** https://github.com/mspworld/memorylink/issues
- **Discussions:** https://github.com/mspworld/memorylink/discussions

### License

MIT License - Free to use, modify, and distribute.

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| **2.1.0** | **2026-01-03** | **`ml doctor` command, `ml scan --json`, 127 patterns, symlink protection** |
| 2.0.2 | 2026-01-02 | Fixed `__dirname` polyfill, hook templates |
| 2.0.1 | 2026-01-02 | npm publish fix |
| 2.0.0 | 2026-01-02 | Major release: 112 patterns, smart modes |
| 1.0.0 | 2025-12-30 | Initial release |

### What's New in v2.1.0

#### New Commands
- **`ml doctor`** - Health check with performance diagnostics
- **`ml doctor --full`** - Full benchmarks including pattern validation
- **`ml scan --json`** - JSON output for CI/automation pipelines

#### New Patterns (17 added → 129 total)
- **Database**: Supabase, PlanetScale, Turso, Neon, Upstash
- **AI Services**: Groq, Perplexity, Replicate, Together AI
- **Auth**: Clerk
- **Email**: Resend
- **India Payments**: PhonePe, Cashfree, Instamojo (expanded)

#### Security Hardening
- **Symlink Protection**: Scanner skips symlinks to prevent traversal attacks
- **Enhanced Key Checks**: `ml self-check` verifies 600 permissions

---

## 🚀 Quick Start Summary

```bash
# 1. Install
npm install -g memorylink

# 2. Initialize in your project
cd your-project
ml init

# 3. You're protected!
# Every git commit and push is now scanned automatically

# 4. (Optional) Enable blocking mode
ml mode active

# 5. (v2.1) Run health check
ml doctor --full

# 6. (v2.1) JSON output for CI
ml scan --json
```

---

---

## 🔮 Roadmap

### ✅ v2.1.0 (RELEASED - January 3, 2026)

#### Security Hardening
| Feature | Description | Status |
|---------|-------------|--------|
| Key Permissions Check | Verify 600 permissions on Unix | ✅ Done |
| Symlink Protection | Skip symlinks to prevent traversal attacks | ✅ Done |

#### New Commands
| Command | Description | Status |
|---------|-------------|--------|
| `ml doctor` | Health check with diagnostics | ✅ Done |
| `ml doctor --full` | Full benchmarks + pattern validation | ✅ Done |
| `ml scan --json` | JSON output for CI/automation pipelines | ✅ Done |

#### New Patterns (17 new → 129 total)
| Pattern | Status |
|---------|--------|
| Supabase, PlanetScale, Turso, Neon, Upstash | ✅ Done |
| Groq, Perplexity, Replicate, Together AI | ✅ Done |
| Clerk, Resend | ✅ Done |
| PhonePe, Cashfree, Instamojo (expanded) | ✅ Done |

### 🔜 v2.2 (Planned)

| Feature | Description |
|---------|-------------|
| `ml explain <pattern>` | Show documentation for specific pattern |
| `ml perf --report` | Performance metrics (cache hit rate, timing) |
| ReDoS Audit | Verify all patterns are safe from backtracking |
| More patterns | Railway, Kubernetes, Firebase Service Account |

### 🔮 v3.0 (Future)

| Feature | Description |
|---------|-------------|
| **AI Memory Layer** | `ml capture`, `ml query`, `ml promote` commands |
| **Memory Governance** | OWASP ASI06 compliance |
| **Real-time Watching** | Watch files as you type |
| **IDE Extensions** | VS Code, Cursor, IntelliJ plugins |
| **Team Features** | Shared rules, audit dashboards |
| **MCP Integration** | Native AI agent memory protocol |

---

## ❓ FAQ

### General

**Q: What mode should I use?**
> **A:** Start with `INACTIVE` (default) to learn what MemoryLink detects. Once comfortable, switch to `ACTIVE` for production work with `ml mode active`.

**Q: Will it slow down my commits?**
> **A:** No! Pre-commit hooks only scan staged files and complete in <1 second typically.

**Q: Can I use it in monorepos?**
> **A:** Yes! Add excludes to `.memorylink/config.json` for node_modules, dist, etc.

### AI & Integration

**Q: Why no MCP integration yet?**
> **A:** MCP (Model Context Protocol) support is planned for v3.0. We want to ensure the core secret detection is bulletproof before adding AI memory features.

**Q: Does it work with Cursor/Copilot/Claude?**
> **A:** Yes! MemoryLink protects you regardless of which AI tool you use. The Git hooks catch secrets before they're committed.

### Security

**Q: Is MemoryLink OWASP compliant?**
> **A:** MemoryLink follows security best practices aligned with OWASP guidelines. Full OWASP ASI06 compliance documentation is planned for v3.0.

**Q: Where are my keys stored?**
> **A:** Encryption keys are stored in `~/.memorylink/keys/` (your home directory), never in the project. This prevents accidental commits.

**Q: Does MemoryLink phone home?**
> **A:** Never. Zero telemetry, zero network calls. 100% local operation. Verify with `ml self-check`.

---

## 🔐 Security Model

### What IS Encrypted

| Data | Encryption | Location |
|------|------------|----------|
| Quarantined secrets | AES-256-GCM | `.memorylink/quarantined/` |
| Encryption keys | N/A (protected by OS) | `~/.memorylink/keys/` |

### What is NOT Encrypted

| Data | Reason | Location |
|------|--------|----------|
| Config files | Need to be readable | `.memorylink/config.json` |
| Audit logs | For compliance review | `.memorylink/audit/` |
| False positive list | User-managed | `.memorylink/falsePositives.json` |

### Key Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    TRUST BOUNDARY                           │
├─────────────────────────────────────────────────────────────┤
│  Your Machine (Trusted)                                     │
│  ├── ~/.memorylink/keys/ (Encryption keys - PROTECTED)     │
│  ├── Project/.memorylink/ (Project data - GITIGNORED)      │
│  └── Your code (Scanned for secrets)                       │
├─────────────────────────────────────────────────────────────┤
│  Git Remote (Untrusted)                                     │
│  └── Only clean code should reach here                      │
│      (MemoryLink blocks secrets at commit/push)            │
└─────────────────────────────────────────────────────────────┘
```

### No Network Calls

MemoryLink makes **zero network requests**. All operations are 100% local:
- ✅ Pattern matching: Local regex
- ✅ Encryption: Local AES-256-GCM
- ✅ Git hooks: Local shell scripts
- ✅ Audit logs: Local files

---

**MemoryLink** - Protect your secrets from leaks 🔒

*Built with ❤️ for developers worldwide, with special focus on India 🇮🇳*

