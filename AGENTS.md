<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Node 22 and npm deps are preinstalled; the startup update script runs `npm install` (its `postinstall` runs `prisma generate`). MySQL 8, the dev/test databases, and `.env` are provisioned in the VM image — the notes below are the non-obvious runtime caveats.

### Start MySQL before anything that touches the DB
MySQL is **not** auto-started (no systemd in the container). Run once per session:
```bash
sudo service mysql start
```
Local MySQL 8 listens on `127.0.0.1:3306`. User `safar` / password `safar` has full privileges over TCP. Databases: `safartrip` (dev) and `safartrip_test` (integration tests). `.env` (gitignored, already present) points `DATABASE_URL` at the `safartrip` dev DB and sets `TEST_DATABASE_URL` at `safartrip_test`.

### Run the app (dev)
`npm run dev` → http://localhost:3000. This is a **custom `ts-node` server** (`server.ts`) embedding Next.js + Socket.IO on one port — not `next dev`. Apply schema changes with `npx prisma migrate deploy` (migrations are already applied on the image; re-run after pulling new migrations).

### Tests
Vitest does **not** auto-load `.env`, so integration tests need both DB env vars exported (as CI does). Run the full suite the same way CI does:
```bash
TEST_DATABASE_URL="mysql://safar:safar@127.0.0.1:3306/safartrip_test" \
DATABASE_URL="mysql://safar:safar@127.0.0.1:3306/safartrip_test" \
npx vitest run
```
`npm run test:unit` needs no DB. `npm test`/integration need MySQL running (see above). The repo's `npm run test:db:up` expects Docker on port 3307; Docker is not installed here — point the test DB at local MySQL `safartrip_test` on 3306 via the env vars above instead.

### Lint
`npm run lint` runs but is intentionally **non-blocking in CI** and currently reports many pre-existing errors across `app/`/`components/`. `npm run typecheck` and `npm run build` are the real gates and both pass clean.

### Known dev-only quirk
`GET /api/travel-plans` returns 500 under `npm run dev` due to a Next.js 16 webpack dev chunk-parse error on a transitive `undici` chunk (`SyntaxError: 'super' keyword unexpected here`). It compiles and runs fine under `npm run build`, and other routes (auth, notifications, hotels) work in dev. Not an environment defect.
