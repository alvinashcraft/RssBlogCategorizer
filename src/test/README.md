# Testing Guide

This document explains how to run and write tests for the Dev Feed Curator extension.

## Test Structure

```
src/test/
├── unit/                     # Unit tests
│   ├── rssProvider.test.ts   # RSS provider functionality tests
│   └── exportManager.test.ts # Export manager functionality tests
├── suite/                    # Integration tests
│   ├── index.ts             # Test suite runner
│   └── extension.test.ts    # Extension integration tests
├── mocks/                   # Test utilities and mocks
│   ├── testData.ts         # Mock RSS feeds, configs, and test data
│   └── mockVscode.ts       # Mock VS Code API implementations
└── runTest.ts              # VS Code extension test runner
```

## Running Tests

### Unit Tests (Recommended for Development)

Run unit tests directly with TypeScript (no compilation needed):

```bash
npm run test:unit
```

This runs unit tests using Mocha with ts-node, testing individual components in isolation.

### Compiled Unit Tests

If you prefer to run compiled JavaScript tests:

```bash
npm run compile-tests
npm run test:unit:compiled
```

### Integration Tests

Run full integration tests in a VS Code instance:

```bash
npm test
```

This will:
1. Compile the extension and tests
2. Launch a VS Code instance 
3. Run integration tests that verify the extension works end-to-end

## Writing Tests

### Unit Tests

Unit tests should:
- Test individual functions and classes in isolation
- Use mocks for external dependencies (VS Code API, file system, network)
- Be fast and reliable
- Follow the pattern in `rssProvider.test.ts` and `exportManager.test.ts`

Example unit test:
```typescript
import { expect } from 'chai';
import * as sinon from 'sinon';
import { RSSBlogProvider } from '../../rssProvider';
import { MockExtensionContext } from '../mocks/mockVscode';

describe('RSSBlogProvider', () => {
  let provider: RSSBlogProvider;
  let mockContext: MockExtensionContext;

  beforeEach(() => {
    mockContext = new MockExtensionContext();
    provider = new RSSBlogProvider(mockContext);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should parse RSS feeds correctly', async () => {
    // Your test implementation
  });
});
```

### Integration Tests

Integration tests should:
- Test the extension as a whole in a real VS Code environment
- Verify commands are registered correctly
- Test actual user workflows
- Be placed in `src/test/suite/`

Example integration test:
```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

describe('Extension Integration', () => {
  it('should activate successfully', async () => {
    const extension = vscode.extensions.getExtension('alvinashcraft.rss-blog-categorizer');
    if (extension && !extension.isActive) {
      await extension.activate();
    }
    assert.ok(extension?.isActive);
  });
});
```

## Test Coverage

The tests currently cover:

### RSS Provider (`rssProvider.test.ts`)
- ✅ RSS and Atom feed parsing
- ✅ Post categorization based on keywords
- ✅ Date filtering functionality
- ✅ URL validation and configuration management
- ✅ Tree view item creation
- ✅ Error handling for network issues and malformed data

### Export Manager (`exportManager.test.ts`)
- ✅ Dew Drop title generation and auto-incrementing
- ✅ Markdown export with proper formatting
- ✅ HTML export with proper escaping
- ✅ Book rotation based on day of year
- ✅ Post grouping and deduplication
- ✅ Error handling for file operations

### Integration (`extension.test.ts`)
- ✅ Extension activation
- ✅ Command registration
- ✅ Basic tree view setup

## Mock Data

Test data is provided in `src/test/mocks/testData.ts`:
- `mockRssXml` - Sample RSS feed XML
- `mockAtomXml` - Sample Atom feed XML
- `mockDewDropRss` - Alvin's blog RSS with Dew Drop post
- `mockCategoriesConfig` - Categories configuration
- `mockBooksConfig` - Books configuration for Geek Shelf
- `mockBlogPosts` - Typed test blog post data

## Debugging Tests

### VS Code Integration Tests
1. Set breakpoints in your test files
2. Run "Debug: Start Debugging" in VS Code
3. Select "Extension Tests" configuration
4. Tests will run in a new VS Code window where you can debug

### Unit Tests
1. Set breakpoints in test files or source code
2. Run tests with debugger: `npm run test:unit` with debugger attached
3. Or use VS Code's built-in test runner with breakpoints

## CI/CD Considerations

For automated testing in CI/CD pipelines:

1. **Unit tests** can run in any Node.js environment
2. **Integration tests** require a full VS Code installation
3. Use GitHub Actions with VS Code test runner for full coverage
4. Consider running unit tests for PRs and integration tests for releases

## Best Practices

1. **Mock External Dependencies**: Always mock VS Code API, file system, and network calls
2. **Test Error Cases**: Include tests for network failures, invalid data, etc.
3. **Use Descriptive Names**: Test names should clearly describe what they verify
4. **Keep Tests Focused**: Each test should verify one specific behavior
5. **Clean Up**: Always restore stubs and clean up resources in `afterEach`
6. **Use Type-Safe Mocks**: Leverage TypeScript for better mock implementations

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**: Run `npm install` to ensure all test dependencies are installed
2. **VS Code API not available**: Make sure you're using the correct mock objects for unit tests
3. **Tests timing out**: Increase timeout in `.mocharc.json` or individual test files
4. **Extension not activating**: Check that the extension ID matches in integration tests

### Performance Tips

1. Use unit tests for fast feedback during development
2. Run integration tests before commits/releases
3. Mock network calls to avoid dependencies on external services
4. Use `sinon.restore()` in `afterEach` to prevent test interference