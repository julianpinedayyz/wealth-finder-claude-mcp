# Tests

## Tool tests (live Supabase)

```bash
npm test
```

## Watch mode

```bash
npm run test:watch
```

## Requirements

Your `.env` must include:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `MCP_USER_ID`

Before running tests, ensure you already ran:

```bash
npm run seed:supabase
```
