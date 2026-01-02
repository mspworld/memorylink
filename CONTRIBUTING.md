# Contributing to MemoryLink

Thank you for your interest in contributing to MemoryLink! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Documentation](#documentation)

---

## 🤝 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and professional in all interactions.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Git

### Setup

1. **Fork the repository**

2. **Clone your fork:**
   ```bash
   git clone https://github.com/your-username/memorylink.git
   cd memorylink
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Link for local development:**
   ```bash
   npm link
   ```

6. **Verify setup:**
   ```bash
   npm test
   ml --version
   ```

---

## 🔄 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**Branch naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `test/` - Tests
- `refactor/` - Code refactoring

### 2. Make Changes

- Follow [Coding Standards](#coding-standards)
- Write tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build
npm run build
```

### 4. Commit Your Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new secret pattern for Stripe keys"
git commit -m "fix: resolve conflict resolution edge case"
git commit -m "docs: update README with new examples"
```

**Commit types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## 📝 Coding Standards

### TypeScript

- **Strict mode:** Always enabled
- **ES Modules:** Use `import/export`, not `require`
- **Type safety:** No `any` types (use proper types)
- **Naming:**
  - Functions: `camelCase`
  - Classes: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Files: `kebab-case.ts`

### Code Style

- **Indentation:** 2 spaces
- **Semicolons:** Required
- **Quotes:** Single quotes for strings
- **Line length:** Max 100 characters
- **Trailing commas:** Yes in multi-line

### Example

```typescript
import type { MemoryRecord, Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';

export async function myFunction(
  param1: string,
  param2: number
): Promise<Result<MemoryRecord, Error>> {
  if (!param1) {
    return Err(new Error('param1 is required'));
  }
  
  return Ok({ /* ... */ });
}
```

---

## 🧪 Testing

### Test-Driven Development (TDD)

We follow TDD principles:
1. Write test first
2. Make it pass
3. Refactor

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../src/my-module.js';

describe('myFunction', () => {
  it('should return Ok for valid input', () => {
    const result = myFunction('valid', 123);
    expect(result.ok).toBe(true);
  });

  it('should return Err for invalid input', () => {
    const result = myFunction('', 123);
    expect(result.ok).toBe(false);
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test tests/core/validator.test.ts
```

### Test Requirements

- **Coverage:** Aim for 100% on core modules
- **Unit tests:** All functions
- **Integration tests:** End-to-end workflows
- **Edge cases:** Test error conditions

---

## 📤 Submitting Changes

### Pull Request Checklist

- [ ] Code follows coding standards
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Build succeeds

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring

## Testing
How was this tested?

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows standards
```

---

## 📚 Documentation

### Code Comments

- **Functions:** JSDoc comments for public functions
- **Complex logic:** Inline comments explaining why
- **Types:** TypeScript types are self-documenting

### Example

```typescript
/**
 * Validate evidence level
 * E2 can ONLY be created via promote, not capture
 * 
 * @param level - Evidence level string
 * @param allowE2 - Whether to allow E2 (default: false)
 * @returns Result with validated EvidenceLevel or ValidationError
 */
export function validateEvidenceLevel(
  level: string,
  allowE2: boolean = false
): Result<EvidenceLevel, ValidationError> {
  // ...
}
```

### Documentation Files

- **README.md:** User-facing documentation
- **SPEC.md:** Technical specification (do not modify without approval)
- **API.md:** API reference (auto-generated or manual)

---

## 🎯 Areas for Contribution

### High Priority

- Additional secret detection patterns
- Integration tests
- Performance optimizations
- Documentation improvements

### Medium Priority

- Additional gate rules
- Error message improvements
- CLI UX enhancements

### Low Priority

- Code refactoring
- Test coverage improvements
- Documentation polish

---

## ❓ Questions?

- **GitHub Issues:** [Open an issue](https://github.com/your-org/memorylink/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-org/memorylink/discussions)

---

## 🙏 Thank You!

Your contributions make MemoryLink better for everyone. Thank you for taking the time to contribute!

---

**Happy Contributing!** 🚀

