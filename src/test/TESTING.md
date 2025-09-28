# Unit Testing Setup

This extension includes a comprehensive unit testing setup using Mocha, Chai, and Sinon.

## Quick Start

```bash
# Install dependencies
npm install

# Run basic tests (no VS Code dependencies)
npx mocha --require ts-node/register src/test/unit/basic.test.ts

# Compile and run all tests
npm run compile-tests
npm run test:unit:compiled
```

## Test Files

- `basic.test.ts` - Basic utility and interface tests (no VS Code dependencies)
- `rssProvider.test.ts` - RSS provider tests (requires compilation due to VS Code API)
- `exportManager.test.ts` - Export manager tests (requires compilation due to VS Code API)

## VS Code Integration Testing

Due to VS Code API dependencies, full integration tests must be run in the VS Code test environment:

```bash
npm test  # Runs integration tests in VS Code
```

## Test Coverage

✅ **Working Tests:**
- BlogPost interface validation
- Date parsing and validation  
- HTML string processing
- URL validation
- Category keyword matching
- Configuration validation

🚧 **Advanced Tests (require VS Code environment):**
- RSS feed parsing with network mocking
- Export functionality with file system mocking
- VS Code tree view integration
- Extension command registration

## Development Workflow

1. **Write basic tests first** - Use `basic.test.ts` pattern for business logic
2. **Test complex integrations** - Use compiled tests for VS Code API interactions
3. **Run integration tests** - Use `npm test` for full end-to-end testing

This setup provides a foundation for comprehensive testing while demonstrating different testing approaches for VS Code extensions.