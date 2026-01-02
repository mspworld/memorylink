# Changelog

All notable changes to MemoryLink will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2026-01-03

### Fixed
- **False Positive Fix**: Vercel and Netlify token patterns were too generic, causing false positives on normal code
- **Documentation**: Corrected pattern count from 129 to 127 across all docs

---

## [2.1.0] - 2026-01-02

### Added

#### New Commands
- **`ml doctor`**: Health check command with optional performance analysis
  - `ml doctor` - Basic health checks
  - `ml doctor --full` - Full diagnostics including benchmarks
  - `ml doctor --json` - JSON output for automation

#### Enhanced Scan Command
- **`ml scan --json`**: JSON output format for CI/automation pipelines
  - Structured output with summary and findings
  - Category groupings for analysis
  - Safe output (no secret previews)

#### Security Hardening
- **Symlink Protection**: Scanner now skips symbolic links to prevent traversal attacks
- **Key Permissions**: Enhanced `ml self-check` verifies 600 permissions on encryption keys

#### New Secret Patterns (15 new → 127 total)
- **Database Services**: Supabase, PlanetScale, Turso, Neon, Upstash
- **AI Services**: Replicate, Together AI, Groq, Perplexity
- **Auth Services**: Clerk
- **Email Services**: Resend
- **India Payments**: PhonePe, Cashfree, Instamojo (expanded)

### Changed
- Pattern count increased from 112 to 127
- Improved performance benchmarking in doctor command
- Better error messages with JSON output support

### Security
- Symlinks are now safely skipped during scans
- Enhanced key permission verification

---

## [2.0.0] - 2026-01-02

### Added

#### Enhanced Secret Detection
- **112 Secret Patterns**: Expanded from 20+ to 112 detection patterns
- **India-specific Patterns**: Aadhaar, PAN, GSTIN, UPI, IFSC, Paytm, PhonePe
- **Browser Storage**: localStorage, sessionStorage, cookie detection
- **Cloud Providers**: AWS, Azure, GCP, DigitalOcean, Heroku, and more
- **AI/ML Keys**: OpenAI, Anthropic, HuggingFace, Cohere patterns

#### Smart Mode System
- **ACTIVE Mode**: Blocks commits/pushes when secrets detected
- **INACTIVE Mode** (default): Warns but allows commits
- **Smart Resolution**: CLI flag > ENV var > CI detection > config > default
- **CI Auto-Enforce**: 19 CI platforms automatically enforce ACTIVE mode
- **One-time Override**: `ML_MODE=active git push` for temporary enforcement

#### Git Hooks Integration
- **Pre-commit Hook**: Scans only staged files (fast)
- **Pre-push Hook**: Full repository scan before push
- **Easy Install**: `ml hooks --install` command
- **Smart Bypass**: `git commit --no-verify` for emergencies

#### New Commands
- `ml scan` - Comprehensive secret scanning with beautiful output
- `ml mode` - View and switch between ACTIVE/INACTIVE modes
- `ml self-check` - Verify installation and configuration
- `ml ci` - Setup CI/CD integration (GitHub Actions workflow)
- `ml hooks` - Manage Git hooks installation

#### CI/CD Support
- **19 CI Platforms**: GitHub Actions, GitLab CI, Jenkins, CircleCI, Travis, Buildkite, Azure Pipelines, TeamCity, Bitbucket, Drone, AppVeyor, Semaphore, Buddy, Vercel, Netlify, Bitrise, Codeship, and more
- **Auto-Detection**: Automatically enables ACTIVE mode in CI environments
- **Exit Codes**: 0=pass, 1=blocked, 2=error for pipeline integration

#### Enhanced User Experience
- **Color-Coded Output**: Beautiful terminal output with emoji indicators
- **Secret Masking**: All output shows `AKIA****MPLE` format
- **Actionable Hints**: Shows exact commands to fix issues
- **Progress Indicators**: Real-time feedback during scans

### Changed
- **Mode Default**: Changed default from blocking to warn-only (INACTIVE)
- **Scan Performance**: Optimized scanning for large repositories
- **Documentation**: Complete rewrite of README and docs

### Security
- **AES-256-GCM Encryption**: For quarantined secrets
- **Zero Telemetry**: 100% local, no network calls ever
- **Key Isolation**: Encryption keys stored in `~/.memorylink/keys/` (not in project)

---

## [1.0.0] - 2025-12-30

### Added

#### Core Features
- **Evidence Grading System**: E0 (raw), E1 (curated), E2 (verified) evidence levels
- **Quarantine System**: Automatic secret detection and isolation
- **Policy Gates**: CI/CD enforcement with `block-quarantined` rule
- **Conflict Resolution**: Deterministic 3-level hierarchy (Evidence > Recency > ID)
- **Audit Trail**: Append-only logging with optional hash chaining

#### Commands
- `ml capture` - Capture memories (E0/E1 only)
- `ml query` - Query memories (ACTIVE only, excludes QUARANTINED)
- `ml promote` - Promote memories to E2 (only path to E2)
- `ml audit` - View audit trail (timeline, security, verify)
- `ml gate` - Run policy gate checks (CI/CD integration)

#### Security
- **20+ Secret Detection Patterns**: 
  - API keys (OpenAI, Anthropic, Generic)
  - AWS credentials (Access keys, Secret keys)
  - Database URLs (with credentials)
  - Private keys (RSA, etc.)
  - Tokens (GitHub, Slack, JWT, Discord, etc.)
  - Payment keys (Stripe, PayPal, Square, Shopify)
  - Cloud keys (Google, Azure, Heroku, Mailgun, SendGrid)
  - And more...

#### Storage
- File-based storage in `.memorylink/` directory
- Scope-based organization (project, user, org)
- Atomic write operations
- Quarantine isolation (global, gitignored)

#### Testing
- Unit tests (48 tests)
- Integration tests (end-to-end workflows)
- Performance tests (gate < 100ms)
- Security audit tests

#### Documentation
- Comprehensive README.md
- CONTRIBUTING.md
- API documentation (docs/API.md)
- Examples and usage guides

### Technical Details

- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 18+
- **CLI Framework**: Commander.js
- **Validation**: Ajv (JSON Schema)
- **Testing**: Vitest
- **Storage**: JSON files + fs-extra

### Security

- Gate output NEVER prints secrets
- QUARANTINED records never returned in queries
- DEPRECATED records excluded from truth
- Hash chaining for tamper-evident audit trail

### Performance

- Gate command completes in < 100ms (tested with 100+ records)
- Atomic file operations
- Efficient conflict resolution

### Compliance

- 100% compliant with SPEC.md v4.3.10
- All 5 required commands implemented
- All security requirements met
- All storage requirements met

---

## [Unreleased]

### Planned Features
- `ml resolve` command (automated quarantine resolution)
- Additional gate rules (require-e2-for-topics)
- Dashboard (localhost UI)
- Team collaboration features
- Advanced analytics

---

[2.1.0]: https://github.com/mspworld/memorylink/releases/tag/v2.1.0
[2.0.0]: https://github.com/mspworld/memorylink/releases/tag/v2.0.0
[1.0.0]: https://github.com/mspworld/memorylink/releases/tag/v1.0.0

