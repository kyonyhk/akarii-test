# OpenAI Analysis Pipeline Test Suite

This directory contains comprehensive tests for the message analysis pipeline with OpenAI integration.

## Test Structure

### Unit Tests (`/convex/`)

- **analysis-utils.test.ts**: Tests for utility functions including parsing, caching, retry logic, and performance metrics
- **openai.test.ts**: Tests for OpenAI configuration and validation
- **prompts.test.ts**: Tests for prompt templates and message formatting

### Integration Tests (`/integration/`)

- **analysis-integration.test.ts**: End-to-end testing of the complete analysis pipeline

### Performance Tests (`/performance/`)

- **analysis-performance.test.ts**: Performance validation including sub-2-second requirement testing

## Running Tests

```bash
# Run all tests
bun test

# Run tests once (CI mode)
bun test:run

# Run with UI
bun test:ui

# Run with coverage
bun test:coverage
```

## Test Coverage Areas

### ✅ Analysis Accuracy Testing

- Validates correct identification of statement types (question, opinion, fact, request, other)
- Tests belief and trade-off extraction
- Validates confidence level scoring (0-100 range)
- Tests edge cases and malformed content

### ✅ Performance Testing

- Verifies sub-2-second response time requirement
- Tests cache performance and hit rates
- Validates timeout mechanisms
- Tests concurrent request handling

### ✅ Error Handling Validation

- Tests retry logic with different error types (rate limiting, server errors, timeouts)
- Validates exponential backoff delays
- Tests maximum retry limits
- Tests non-retryable error identification

### ✅ Database Storage Verification

- Tests end-to-end analysis and storage pipeline
- Validates data persistence and messageId linking
- Tests concurrent write handling
- Tests duplicate detection

### ✅ API Integration Testing

- Tests OpenAI connection and authentication
- Validates API key configuration
- Tests JSON response format enforcement
- Tests model configuration

### ✅ Caching System Testing

- Tests cache hit/miss scenarios
- Validates cache TTL and expiration
- Tests cache size limits and cleanup
- Tests cache key generation

## Performance Benchmarks

The test suite validates the following performance requirements:

- **Response Time**: 95% of analyses complete within 2 seconds
- **Cache Performance**: Cache hits should be <50ms
- **Concurrent Handling**: System should handle 5+ concurrent requests
- **Memory Usage**: No significant memory leaks under load
- **Error Recovery**: Retry logic should recover from transient failures

## Test Data

The test suite uses realistic sample messages in `setup.ts`:

- Question examples
- Opinion statements
- Factual information
- Request messages
- Complex multi-faceted messages

## Mock Configuration

Tests use mocked OpenAI API responses to ensure:

- Consistent test results
- No API costs during testing
- Fast test execution
- Reliable CI/CD pipeline

## Integration with CI/CD

These tests are designed to be run in continuous integration environments and validate:

- Code quality and correctness
- Performance regression detection
- API integration stability
- Error handling robustness

The comprehensive test suite ensures the OpenAI analysis pipeline is production-ready and meets all performance and reliability requirements.
