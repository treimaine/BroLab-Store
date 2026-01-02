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

## Web Scraping

When scraping web content, you `MUST` always use the Firecrawl MCP tools instead of built-in alternatives.

### Available Firecrawl Tools

- `mcp_firecrawl_firecrawl_scrape` - Single page scraping (default choice)
- `mcp_firecrawl_firecrawl_search` - Web search with optional content extraction
- `mcp_firecrawl_firecrawl_map` - Discover all URLs on a website
- `mcp_firecrawl_firecrawl_crawl` - Multi-page crawling
- `mcp_firecrawl_firecrawl_extract` - Structured data extraction with LLM
- `mcp_firecrawl_firecrawl_agent` - Autonomous web data gathering

### Why

- More powerful and reliable scraping capabilities
- Better handling of JavaScript-rendered content
- Structured data extraction support
- Built-in search functionality

### When to use

- Scraping single pages → `firecrawl_scrape`
- Searching the web → `firecrawl_search`
- Discovering site URLs → `firecrawl_map`
- Crawling multiple pages → `firecrawl_crawl`
- Extracting structured data → `firecrawl_extract`
- Complex data gathering → `firecrawl_agent`
