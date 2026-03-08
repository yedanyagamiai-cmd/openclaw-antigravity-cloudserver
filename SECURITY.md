# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.x     | Yes       |
| < 3.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Email**: [openclaw-intel@proton.me](mailto:openclaw-intel@proton.me)
2. **Subject**: `[SECURITY] openclaw-antigravity-cloudserver — {brief description}`
3. **Do not** open a public issue for security vulnerabilities

We will acknowledge your report within 48 hours and provide a fix within 7 days for critical issues.

## Security Measures

- All tool inputs validated with Zod schemas
- Rate limiting (50 req/day per IP) prevents abuse
- No user data stored beyond rate limit counters (KV, 24h TTL)
- No API keys or credentials required from users
- CORS headers configured for MCP client compatibility
- Custom error classes prevent information leakage
- TypeScript strict mode catches type-related vulnerabilities at compile time
