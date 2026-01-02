# Troubleshooting Guide

Common issues and solutions for MemoryLink.

---

## 🔴 "ml: command not found"

**Cause:** npm global bin directory is not in your PATH.

**Solutions:**

### Option 1: Add npm global bin to PATH
```bash
# Find npm global bin
npm bin -g

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$(npm bin -g):$PATH"

# Reload shell
source ~/.bashrc  # or ~/.zshrc
```

### Option 2: Use npx
```bash
npx memorylink init
npx memorylink scan
```

### Option 3: Reinstall globally
```bash
npm uninstall -g memorylink
npm install -g memorylink
```

---

## 🔴 "Git hooks not running"

**Cause:** Hooks not installed or Git configured differently.

**Solutions:**

### Check hooks exist
```bash
ls -la .git/hooks/pre-commit
ls -la .git/hooks/pre-push
```

### Reinstall hooks
```bash
ml hooks install
```

### Check Git hooks path
```bash
git config core.hooksPath
# If set to something other than .git/hooks, run:
git config --unset core.hooksPath
ml hooks install
```

### Verify hook permissions
```bash
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
```

---

## 🔴 "Database locked" or file access errors

**Cause:** Concurrent operations or crashed process left lock file.

**Solutions:**

### Remove stale lock files
```bash
rm -f .memorylink/*.lock
rm -f ~/.memorylink/*.lock
```

### Retry the command
```bash
ml scan
```

---

## 🔴 False positives

**Cause:** Pattern matches non-secret content.

**Solutions:**

### Option 1: Inline ignore (single line)
```javascript
const testKey = "AKIAIOSFODNN7EXAMPLE"; // ml:ignore - test data
```

### Option 2: Ignore specific file
```bash
ml ignore add --file path/to/file.js
```

### Option 3: Ignore specific pattern
```bash
ml ignore add --pattern "api-key-2"
```

### Option 4: Interactive ignore
```bash
ml ignore --interactive
```

---

## 🔴 Slow scans (large repositories)

**Cause:** Scanning too many files.

**Solutions:**

### Check what's being scanned
```bash
ml scan --verbose
```

### Add excludes to config
```json
// .memorylink/config.json
{
  "scan": {
    "exclude": [
      "vendor/**",
      "*.min.js",
      "dist/**"
    ]
  }
}
```

### Use diff mode for commits
```bash
ml gate --diff  # Only scan changed files
```

---

## 🔴 Windows-specific issues

### Path issues
```powershell
# Use forward slashes
ml scan src/config.js

# Or escape backslashes
ml scan "src\\config.js"
```

### Line ending issues
```bash
# Configure Git for Windows
git config --global core.autocrlf true
```

### Permission issues
```powershell
# Run as Administrator if needed
# Or use Git Bash instead of CMD/PowerShell
```

---

## 🔴 Encryption/decryption errors

**Cause:** Key file missing or corrupted.

**Solutions:**

### Check key exists
```bash
ls -la ~/.memorylink/keys/
```

### Regenerate key (WARNING: loses access to old quarantine)
```bash
rm ~/.memorylink/keys/*.key
ml init
```

### Check key permissions
```bash
chmod 600 ~/.memorylink/keys/*.key
```

---

## 🔴 CI/CD not blocking secrets

**Cause:** Mode set to inactive or ml gate not running.

**Solutions:**

### Verify CI detection
```bash
CI=true ml mode
# Should show: Source: ci
```

### Ensure ml gate is called in CI
```yaml
# GitHub Actions example
- name: Security Scan
  run: ml gate --enforce
```

### Check mode in CI
```bash
CI=true ml gate --verbose
```

---

## 🔴 "No patterns matched" but secrets exist

**Cause:** File type not scanned or pattern not matching.

**Solutions:**

### Check file is scanned
```bash
ml scan path/to/file.js --verbose
```

### Test specific pattern
```bash
echo "AKIAIOSFODNN7EXAMPLE" | ml scan --stdin
```

### Check for binary detection
```bash
# SVG and .min.js ARE scanned (they're text)
# PNG, PDF, etc. are skipped (binary)
```

---

## 🔴 Need more help?

### Debug mode
```bash
DEBUG=memorylink ml scan
```

### Self-check
```bash
ml self-check
```

### Report an issue
1. Run `ml self-check`
2. Include output in your issue
3. Open issue at: [GitHub Issues](https://github.com/memorylink/memorylink/issues)

---

## Quick Reference

| Problem | Quick Fix |
|---------|-----------|
| Command not found | `npx memorylink` or fix PATH |
| Hooks not running | `ml hooks install` |
| Database locked | `rm .memorylink/*.lock` |
| False positive | Add `// ml:ignore` comment |
| Slow scans | Add excludes to config |
| Windows paths | Use forward slashes |
| CI not blocking | Add `--enforce` flag |

