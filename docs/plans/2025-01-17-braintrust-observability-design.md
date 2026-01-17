# Braintrust Observability Integration

**Date:** 2025-01-17
**Status:** Implemented

## Overview

Added Braintrust observability to capture LLM calls, tool executions, and multi-step agent loops for debugging, production monitoring, and evaluation.

## Approach

Used OpenTelemetry integration via `@vercel/otel` with `BraintrustExporter`. This approach:
- Works with AI SDK v6's `ToolLoopAgent`
- Captures streaming responses
- Auto-reads `BRAINTRUST_API_KEY` and `BRAINTRUST_PARENT` from environment
- Filters to only AI-related spans

## Changes

| File | Change |
|------|--------|
| `package.json` | Added `braintrust`, `@braintrust/otel`, `@vercel/otel` |
| `.env.example` | Added `BRAINTRUST_API_KEY` and `BRAINTRUST_PARENT` |
| `instrumentation.ts` | Created with `BraintrustExporter` configuration |
| `lib/agent/index.ts` | Added `experimental_telemetry` to `ToolLoopAgent` |

## Configuration

Environment variables:
```
BRAINTRUST_API_KEY=sk-...
BRAINTRUST_PARENT=project_name:resume-tailor-ai
```

## What Gets Captured

- All LLM calls (input/output tokens, latency, model)
- Tool calls and their results
- Multi-step agent loops
- Streaming chunks
- Custom metadata via `functionId`

## Notes

- Next.js 16 has `instrumentation.ts` support built-in (no experimental flag needed)
- Telemetry is opt-in via `experimental_telemetry.isEnabled`
- Traces appear in Braintrust project dashboard automatically
