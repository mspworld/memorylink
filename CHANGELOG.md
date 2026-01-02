# Changelog

All notable changes to MemoryLink will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/your-org/memorylink/releases/tag/v1.0.0

