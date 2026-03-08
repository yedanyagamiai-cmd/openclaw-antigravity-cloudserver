# Contributing

Thanks for your interest in contributing to OpenClaw Antigravity Cloud Server!

## Development Setup

```bash
git clone https://github.com/yedanyagamiai-cmd/openclaw-antigravity-cloudserver
cd openclaw-antigravity-cloudserver
npm install
npm run dev       # start local dev server
```

## Code Standards

- **TypeScript**: strict mode, no `any` (warn level)
- **Validation**: Zod schema for every tool input
- **Errors**: use custom `McpError` classes, never empty catch blocks
- **Constants**: no magic numbers — use named constants from `src/constants.ts`
- **Linting**: `npm run lint` must pass (ESLint flat config)
- **Types**: `npm run typecheck` must pass

## Pull Request Process

1. Fork the repo and create a feature branch
2. Make your changes following the code standards above
3. Ensure `npm run typecheck && npm run lint` pass
4. Open a PR with a clear description of what changed and why

## Adding a New Tool

1. Create `src/tools/{name}.ts` with Zod schema + handler function
2. Add tool definition to `src/tools/index.ts` (TOOLS array + HANDLERS map)
3. Update `src/constants.ts` if new model or limits needed
4. Update README with the new tool

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
