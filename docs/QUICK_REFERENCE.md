# MemoryLink Quick Reference

## 5-Minute Setup
```bash
npm install -g memorylink
cd your-project
ml init
# Done! Hooks installed, scanning active.
```

---

## Essential Commands

| Command | What It Does |
|---------|--------------|
| `ml init` | Setup project + Git hooks |
| `ml scan` | Scan project for secrets |
| `ml gate` | Check before commit/push |
| `ml mode` | View/change security mode |
| `ml audit` | View security history |

---

## Mode Switching

```bash
# View current mode
ml mode

# Set mode permanently
ml mode active      # Block on secrets
ml mode inactive    # Warn only (default)

# One-time override
ML_MODE=active git push     # Block this push
ML_MODE=inactive git push   # Allow this push
```

---

## Scanning

```bash
# Scan entire project
ml scan

# Scan specific file
ml scan path/to/file.js

# Scan with details
ml scan --verbose

# Scan only changed files
ml gate --diff
```

---

## Handling False Positives

```javascript
// Option 1: Inline ignore
const testKey = "AKIAEXAMPLE"; // ml:ignore

// Option 2: Block ignore
// ml:ignore-start
const testData = {...};
// ml:ignore-end
```

```bash
# Option 3: Command line
ml ignore add --file path/to/file.js
ml ignore add --pattern "api-key-2"
```

---

## Git Hooks

```bash
# Install hooks
ml hooks install

# Uninstall hooks
ml hooks uninstall

# Bypass temporarily (use with caution!)
git commit --no-verify
git push --no-verify
```

---

## CI/CD Integration

```yaml
# GitHub Actions
- run: npm install -g memorylink
- run: ml gate --enforce

# Or with environment variable
- run: ML_MODE=active ml gate
```

---

## Memory Commands

```bash
# Store memory
ml capture --topic "config" "Use React 18"

# Query memories
ml query --topic "config"

# Promote evidence grade
ml promote <memory-id> --to E2
```

---

## Audit & History

```bash
# View audit log
ml audit

# Scan git history
ml gate --history

# View quarantined items
ml release --list
```

---

## Diagnostics

```bash
# Self-check
ml self-check

# View version
ml --version

# Debug mode
DEBUG=memorylink ml scan
```

---

## Configuration

```json
// .memorylink/config.json
{
  "block_mode": false,
  "scan": {
    "exclude": ["dist/**", "*.min.js"]
  }
}
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success / No issues |
| 1 | Secrets found (active mode) |
| 2 | Configuration error |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `ML_MODE` | Override mode (active/inactive) |
| `CI` | Auto-detected, forces active mode |
| `DEBUG` | Enable debug output |

---

## Quick Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| Command not found | `npx memorylink` |
| Hooks not running | `ml hooks install` |
| False positive | `// ml:ignore` |
| Database locked | `rm .memorylink/*.lock` |
| Slow scans | Add excludes to config |

---

## Getting Help

```bash
ml --help           # All commands
ml scan --help      # Command help
ml self-check       # Diagnostics
```

**Docs:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | [FAQ.md](./FAQ.md)

