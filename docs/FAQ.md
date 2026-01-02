# Frequently Asked Questions

---

## General

### What is MemoryLink?
MemoryLink is a CLI tool that prevents secret leaks in AI-assisted development. It scans your code for API keys, passwords, and personal data before they can be committed to Git or leaked through AI coding assistants like Cursor, Copilot, or Claude Code.

### Is MemoryLink free?
Yes, MemoryLink is 100% free and open source (MIT license).

### Does MemoryLink work offline?
Yes, MemoryLink runs 100% locally. It never sends your code or secrets to any server.

### Does MemoryLink have telemetry?
No. MemoryLink has zero telemetry. All operations are local-only. You can verify this with `ml doctor --network`.

---

## Installation

### What are the requirements?
- Node.js 18 or higher
- npm or pnpm
- Git (for hook integration)

### How do I install MemoryLink?
```bash
npm install -g memorylink
cd your-project
ml init
```

### Does it work on Windows?
Yes, MemoryLink supports Windows, macOS, and Linux. On Windows, we recommend using Git Bash for the best experience.

---

## Usage

### What mode should I use?
- **Inactive (default)**: Warns about secrets but allows commits. Good for learning.
- **Active**: Blocks commits if secrets are found. Recommended for production.

```bash
ml mode inactive  # Warn only
ml mode active    # Block on secrets
```

### Will it slow down my commits?
No. Pre-commit hooks only scan staged files (changed files), which typically takes less than 1 second.

### How do I handle false positives?
Three options:
1. **Inline ignore**: Add `// ml:ignore` at the end of the line
2. **File ignore**: `ml ignore add --file path/to/file.js`
3. **Pattern ignore**: `ml ignore add --pattern "pattern-id"`

### Can I bypass the hooks temporarily?
Yes, but use with caution:
```bash
git commit --no-verify
git push --no-verify
```

Or for a single command:
```bash
ML_MODE=inactive git push
```

---

## Security

### Where are encryption keys stored?
Keys are stored in your home directory: `~/.memorylink/keys/`

Each project gets a unique key based on its path hash. Keys are never stored in your project directory.

### What encryption does MemoryLink use?
AES-256-GCM (Advanced Encryption Standard with 256-bit key, Galois/Counter Mode). This is industry-standard authenticated encryption.

### Are my secrets safe?
Yes:
- Secrets are encrypted at rest in quarantine
- Full secrets are never printed in output (always masked)
- No data is sent to external servers
- Keys are stored with 600 permissions (owner-only)

### Can other users access my quarantined secrets?
No. The encryption key is in your home directory with restricted permissions. Without the key, quarantined data cannot be decrypted.

---

## Patterns

### How many patterns does MemoryLink detect?
112 patterns including:
- Cloud providers (AWS, Azure, GCP)
- AI APIs (OpenAI, Claude, HuggingFace)
- Payment gateways (Stripe, PayPal, Razorpay)
- Authentication (GitHub, GitLab, Slack, Discord)
- Personal data (SSN, credit cards, Aadhaar, PAN)
- Browser leaks (localStorage, cookies, console.log)

### Does it support India-specific patterns?
Yes! MemoryLink includes patterns for:
- Aadhaar numbers
- PAN cards
- GSTIN
- UPI IDs
- IFSC codes
- Razorpay keys
- Paytm merchant keys

### Can I add custom patterns?
Yes, create a `memorylink.config.js` file:
```javascript
module.exports = {
  customPatterns: [
    {
      id: 'my-pattern',
      name: 'My Custom Pattern',
      pattern: /my-secret-[a-z0-9]+/i,
      description: 'Custom secret format'
    }
  ]
};
```

---

## CI/CD

### Does it work in CI/CD?
Yes! MemoryLink auto-detects CI environments and enforces blocking mode automatically.

### Which CI systems are supported?
- GitHub Actions
- GitLab CI
- Jenkins
- CircleCI
- Travis CI
- Buildkite
- Azure Pipelines
- TeamCity
- Bitbucket Pipelines
- Drone CI
- Vercel
- Netlify
- And more...

### How do I set it up in GitHub Actions?
```yaml
- name: Install MemoryLink
  run: npm install -g memorylink

- name: Security Scan
  run: ml gate --enforce
```

---

## Comparison

### How is MemoryLink different from Gitleaks?
| Feature | MemoryLink | Gitleaks |
|---------|------------|----------|
| AI-focused | ✅ | ❌ |
| Easy ignore system | ✅ Interactive | ❌ YAML config |
| Memory governance | ✅ | ❌ |
| India patterns | ✅ | ❌ |

### How is MemoryLink different from TruffleHog?
| Feature | MemoryLink | TruffleHog |
|---------|------------|------------|
| Speed | Fast (<1s hooks) | Slower |
| Memory usage | Low | High (16GB+) |
| AI memory layer | ✅ | ❌ |
| Local-first | ✅ | ✅ |

### How is MemoryLink different from Mem0?
| Feature | MemoryLink | Mem0 |
|---------|------------|------|
| Secret scanning | ✅ | ❌ |
| Zero telemetry | ✅ Provable | ❌ Has telemetry |
| Local-first | ✅ | ❌ Cloud-hosted |
| Free | ✅ | Freemium |

---

## Troubleshooting

### Where can I get help?
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Run `ml self-check` for diagnostics
3. Open an issue on GitHub

### How do I report a bug?
1. Run `ml self-check`
2. Include the output in your bug report
3. Open an issue at: [GitHub Issues](https://github.com/memorylink/memorylink/issues)

---

## Updates

### How do I update MemoryLink?
```bash
npm update -g memorylink
```

### Where can I see the changelog?
Check [CHANGELOG.md](../CHANGELOG.md) for version history.

---

## Contributing

### Can I contribute?
Yes! MemoryLink is open source. Check [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### How do I suggest a new pattern?
Open an issue or PR with:
- Pattern name
- Regex
- Example matches
- Description

