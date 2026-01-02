---
inclusion: always
---

# MCP Tools Usage Rules

## Web Content Fetching

When fetching content from URLs, you `MUST` always use the `mcp_fetch_fetch` tool from the fetch MCP server instead of the built-in `webFetch` tool.

### Why

- The fetch MCP server provides better HTML to markdown conversion
- More reliable content extraction
- Consistent formatting for LLM consumption

### Usage

```typescript
// Always use this for URL fetching
mcp_fetch_fetch({ url: "https://example.com" });
```

### When to use

- Reading documentation from URLs
- Fetching API references
- Extracting content from web pages
- Any task requiring web content retrieval
