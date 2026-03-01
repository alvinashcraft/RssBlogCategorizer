# Unit Testing for Dev Feed Curator

This document describes the unit testing setup for the Dev Feed Curator VS Code extension.

## Testing Architecture

The extension uses a multi-layered testing approach:

1. **Basic Tests** (`src/test/basic/`) - Pure TypeScript logic tests without VS Code dependencies
2. **Unit Tests** (`src/test/unit/`) - Component tests that require VS Code API mocking  
3. **Integration Tests** (`src/test/suite/`) - End-to-end tests in VS Code environment

## Running Tests

### Quick Start - Basic Tests ✅

```bash
# Run basic business logic tests (fastest, no dependencies)
npm run test:basic
```

**Output:**
```
Basic Tests
  BlogPost Interface
    ✔ should create a valid blog post object
    ✔ should validate required properties exist
  Date Handling  
    ✔ should parse valid date strings
    ✔ should handle RSS date format
    ✔ should detect invalid dates
  String Utilities
    ✔ should handle HTML stripping logic
    ✔ should handle URL validation
    ✔ should handle category keyword matching
  Configuration Validation
    ✔ should validate record count ranges
    ✔ should handle refresh interval bounds

10 passing (10ms)
```

### Advanced Tests (VS Code Required) 🧪

```bash
# Compile TypeScript first
npm run compile-tests

# Run integration tests in VS Code
npm test
```

## Localization Validation (3.7.0+)

Use this quick checklist when changing user-facing text:

1. Set VS Code display language to English and verify:
  - Command titles and settings descriptions
  - Tree view labels, prompts, and notifications
  - HTML and Markdown WYSIWYG editor button labels/tooltips
2. Switch display language to Spanish, German, French, Italian, or Portuguese and repeat the same checks
3. Confirm no raw placeholder keys (`%...%` or `{{...}}`) appear in UI
4. Run compile and basic tests:

```bash
npm run compile
npm run test:basic
```

If a string does not localize, verify matching keys exist in all language files:

- `package.nls.json`, `package.nls.es.json`, `package.nls.de.json`, `package.nls.fr.json`, `package.nls.it.json`, `package.nls.pt.json`
- `l10n/bundle.l10n.json`, `l10n/bundle.l10n.es.json`, `l10n/bundle.l10n.de.json`, `l10n/bundle.l10n.fr.json`, `l10n/bundle.l10n.it.json`, `l10n/bundle.l10n.pt.json`

### Supported Languages (3.8.0+)

The extension supports 6 languages:
- English (en) - Default
- Spanish (es / Español)
- German (de / Deutsch)
- French (fr / Français)
- Italian (it / Italiano)
- Portuguese (pt / Português)

See `docs/LOCALIZATION_TESTING.md` for detailed localization testing procedures.

## Test Coverage Summary

### ✅ Currently Working (basic.test.ts)

- **BlogPost Interface**: TypeScript interface validation
- **Date Parsing**: RSS date formats and validation  
- **String Processing**: HTML stripping and URL validation
- **Configuration**: Parameter range validation
- **Category Logic**: Keyword matching algorithms

### 🚧 Advanced Tests Available (requires compilation)

- **RSS Provider**: Feed parsing, categorization, date filtering
- **Export Manager**: Markdown/HTML generation, file operations
- **VS Code Integration**: Tree view, commands, configuration

## Development Workflow

1. **Start with Basic Tests**: Write business logic tests in `src/test/basic/`
2. **Add Component Tests**: Create mocked tests in `src/test/unit/` 
3. **Validate Integration**: Use `npm test` for end-to-end verification

## Adding New Tests

### Basic Test Example

```typescript
// src/test/basic/myfeature.test.ts
import { expect } from 'chai';

describe('My Feature', () => {
  it('should validate input correctly', () => {
    const input = 'test-input';
    const result = processInput(input);
    
    expect(result).to.equal('processed-test-input');
  });
});
```

### Component Test Example (Advanced)

```typescript
// src/test/unit/mycomponent.test.ts
import { expect, use } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

use(sinonChai);

describe('My Component', () => {
  let mockContext: any;
  
  beforeEach(() => {
    mockContext = { /* mock VS Code context */ };
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  it('should interact with VS Code API correctly', () => {
    // Test with mocked VS Code APIs
  });
});
```

## Benefits

- **Fast Feedback**: Basic tests run in <100ms
- **Comprehensive Coverage**: Multiple test layers catch different issues
- **CI/CD Ready**: Tests can run in automated pipelines
- **Developer Friendly**: Clear separation between simple and complex tests

## Next Steps

1. Run `npm run test:basic` to see working tests
2. Explore `src/test/basic/basic.test.ts` for examples
3. Add tests for new features using the same patterns
4. Use `npm test` for full integration testing when needed

This testing setup provides a solid foundation for maintaining code quality while keeping the development workflow fast and efficient.