# Moving beta testers to production

Beta testers signed in through the Clerk development instance, and their data lives in the Convex `beta` deployment (`calm-monitor-518`). Production uses the Clerk production instance, which issues new user IDs, and the default production deployment (`content-bison-766`). These steps copy every tester to production without losing data. The `beta` deployment is only read.

Run everything from `services/convex`. Keep the keys, the export and `mapping.json` outside the repository.

1. Deploy the current functions and schema to production: `npx convex deploy`.
2. Export beta: `npx convex export --deployment calm-monitor-518 --path <dir>/beta.zip`, then unzip it to `<dir>/beta`.
3. Create the production accounts. Set `CLERK_BETA_SECRET_KEY` (`sk_test_…`) and `CLERK_PRODUCTION_SECRET_KEY` (`sk_live_…`), then run `bun migration/migrate-beta-to-production.ts users --mapping <dir>/mapping.json`. It prints the plan. Add `--apply` to create the accounts and write the mapping. Each production account gets the tester's email address and name, and the beta user ID as `external_id`. Signing in with Google, Apple or an email code links the tester to it by email address. Only verified primary addresses are used, the script stops if a production account already has the same address, and testers with a hidden Apple address are skipped.
4. Build the production snapshot: `bun migration/migrate-beta-to-production.ts snapshot --beta <dir>/beta --mapping <dir>/mapping.json --out <dir>/production`. Every row moves to the production account with the same sync position. Each production owner records its beta account in `legacyOwnerId`, which the app uses to hand the phone over. Beta Premium becomes lifetime Premium without the sandbox subscription. The report compares the row counts per tester and lists what was left behind.
5. Zip the contents of `<dir>/production` and import it into the empty production deployment: `npx convex import --prod --replace-all <dir>/production.zip`.
6. After a tester with a hidden Apple address signs in for the first time, link the new account and restore Premium:
   - `npx convex run --prod owners:linkLegacyOwner '{"ownerId":"user_live…","legacyOwnerId":"user_beta…"}'`
   - `npx convex run --prod profiles:setPremium '{"ownerId":"user_live…","isPremium":true}'`
