# Getting Started with MemoryLink

Welcome to MemoryLink! This guide will help you get started with MemoryLink in just a few minutes.

## 🚀 Quick Start

### 1. Installation

```bash
# Install globally
npm install -g @memorylink/cli

# Or install from source
git clone https://github.com/your-org/memorylink.git
cd memorylink
npm install
npm run build
npm link
```

### 2. Initialize Your Project

```bash
# Navigate to your project
cd /path/to/your/project

# Initialize MemoryLink (runs automatic security scan)
ml init
```

The `ml init` command will:
- ✅ Scan your entire project for secrets and personal data
- ✅ Create `.memorylink/` directory structure
- ✅ Generate `AGENTS.md` (universal hub for AI tools)
- ✅ Create tool pointer files (`.cursorrules`, `CLAUDE.md`, etc.)
- ✅ Install Git hooks (pre-commit, pre-push)

### 3. Your First Memory

```bash
# Capture a memory (E0 = raw, unverified)
ml capture --topic "project setup" --content "Use TypeScript strict mode"

# Query memories
ml query --topic "project setup"

# Promote to E2 (verified) - requires reason
ml promote --record-id "mem_..." --to E2 --reason "Verified in production"
```

## 📚 Core Concepts

### Evidence Levels

- **E0** (Raw): Just captured, unverified
- **E1** (Curated): Reviewed, seems valid
- **E2** (Verified): Proven true, policy-gated - **ONLY via `ml promote`**

### Memory Status

- **ACTIVE**: Currently in use, eligible for queries
- **DEPRECATED**: Superseded, excluded from truth queries
- **QUARANTINED**: Unsafe content detected, never returned in queries

### Commands Overview

| Command | Purpose | Example |
|---------|---------|---------|
| `ml init` | First-time setup | `ml init` |
| `ml capture` | Capture memory (E0/E1) | `ml capture -t "topic" -c "content"` |
| `ml query` | Query memories | `ml query -t "topic"` |
| `ml promote` | Promote to E2 | `ml promote -r "mem_..." --to E2 --reason "..."` |
| `ml gate` | Policy gate check | `ml gate -r block-quarantined` |
| `ml audit` | View audit trail | `ml audit --view timeline` |
| `ml scan` | Scan for secrets | `ml scan` |

## 🔒 Security Features

### Automatic Secret Detection

MemoryLink automatically detects and quarantines:
- API keys (OpenAI, AWS, GitHub, etc.)
- Passwords and tokens
- Personal data (SSN, credit cards, etc.)
- Browser data leaks (localStorage, console.log)
- Debug code with secrets

### Policy Gates

```bash
# Check for quarantined content (blocks CI/CD if found)
ml gate --rule block-quarantined

# Check only changed files
ml gate --rule block-quarantined --diff

# Check commit history
ml gate --rule block-quarantined --history

# Check validity (active/inactive secrets)
ml gate --rule block-quarantined --check-validity
```

### Git Hooks

MemoryLink automatically installs Git hooks:
- **pre-commit**: Scans changed files before commit
- **pre-push**: Full repository scan before push

## 🎯 Common Workflows

### Workflow 1: First-Time Setup

```bash
# 1. Initialize
ml init

# 2. Review scan results
# Fix any secrets found

# 3. Start capturing memories
ml capture --topic "architecture" --content "Use microservices pattern"
```

### Workflow 2: Daily Development

```bash
# Capture learnings
ml capture --topic "bug fix" --content "Fixed memory leak in cache"

# Query for context
ml query --topic "bug fix"

# Promote verified knowledge
ml promote --record-id "mem_..." --to E2 --reason "Tested in production"
```

### Workflow 3: CI/CD Integration

```yaml
# .github/workflows/gate.yml
- name: MemoryLink Gate
  run: ml gate --rule block-quarantined
```

## 📖 Next Steps

- Read [PATTERNS.md](./PATTERNS.md) - All 69+ detection patterns
- Read [REMEDIATION.md](./REMEDIATION.md) - How to fix detected secrets
- Read [COMPARISONS.md](./COMPARISONS.md) - MemoryLink vs alternatives

## ❓ Troubleshooting

### Issue: "Not a Git repository"

**Solution**: Initialize Git first:
```bash
git init
ml init
```

### Issue: "Secret detected" during capture

**Solution**: Remove the secret from your content, or use `--approve` if it's intentional:
```bash
ml capture --topic "..." --content "..." --approve
```

### Issue: Gate fails in CI/CD

**Solution**: Check for quarantined content:
```bash
ml gate --rule block-quarantined --json
```

## 🆘 Need Help?

- Check the [README.md](../README.md) for full documentation
- Review [PATTERNS.md](./PATTERNS.md) for all detection patterns
- See [REMEDIATION.md](./REMEDIATION.md) for fixing issues

---

**Ready to go?** Run `ml init` in your project to get started! 🚀

