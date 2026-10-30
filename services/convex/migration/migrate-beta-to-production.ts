import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { countByOwner, migrateSnapshot, type Row, type Snapshot } from './beta-snapshot';

const clerkApiUrl = 'https://api.clerk.com/v1';
const appleRelayDomain = '@privaterelay.appleid.com';

interface ClerkEmail {
  id: string;
  email_address: string;
  verification: { status: string } | null;
}

interface ClerkUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  external_id: string | null;
  primary_email_address_id: string | null;
  email_addresses: ClerkEmail[];
}

interface OwnerMapping {
  legacyOwnerId: string;
  ownerId: string;
  email: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value === '') {
    throw new Error(`Set ${name}`);
  }

  return value;
}

async function clerk<T>(secretKey: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${clerkApiUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Clerk ${init.method ?? 'GET'} ${path} failed with ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as T;
}

function listUsers(secretKey: string, query = ''): Promise<ClerkUser[]> {
  return clerk<ClerkUser[]>(secretKey, `/users?limit=500${query}`);
}

function verifiedPrimaryEmail(user: ClerkUser): string {
  const primary = user.email_addresses.find((email) => email.id === user.primary_email_address_id);

  if (primary === undefined || primary.verification?.status !== 'verified') {
    throw new Error(`User ${user.id} has no verified primary email address`);
  }

  return primary.email_address;
}

async function productionUserFor(
  secretKey: string,
  betaUser: ClerkUser,
  shouldCreate: boolean,
): Promise<ClerkUser | null> {
  const email = verifiedPrimaryEmail(betaUser);
  const [linked] = await listUsers(secretKey, `&external_id=${encodeURIComponent(betaUser.id)}`);

  if (linked !== undefined) {
    return linked;
  }

  const [sameEmail] = await listUsers(secretKey, `&email_address=${encodeURIComponent(email)}`);

  if (sameEmail !== undefined) {
    throw new Error(
      `Production account ${sameEmail.id} already uses the email of ${betaUser.id}. Check it and set its external_id by hand.`,
    );
  }

  if (!shouldCreate) {
    return null;
  }

  return clerk<ClerkUser>(secretKey, '/users', {
    method: 'POST',
    body: JSON.stringify({
      email_address: [email],
      first_name: betaUser.first_name ?? undefined,
      last_name: betaUser.last_name ?? undefined,
      external_id: betaUser.id,
      skip_password_requirement: true,
    }),
  });
}

async function createUsers(mappingPath: string, shouldApply: boolean): Promise<void> {
  const betaKey = requireEnv('CLERK_BETA_SECRET_KEY');
  const productionKey = requireEnv('CLERK_PRODUCTION_SECRET_KEY');

  if (!betaKey.startsWith('sk_test_') || !productionKey.startsWith('sk_live_')) {
    throw new Error('Expected a development key for beta and a live key for production');
  }

  const mappings: OwnerMapping[] = [];

  for (const betaUser of await listUsers(betaKey)) {
    const email = verifiedPrimaryEmail(betaUser);

    if (email.endsWith(appleRelayDomain)) {
      console.log(`skip ${betaUser.id}: hidden Apple address, link after the first sign-in`);
      continue;
    }

    const productionUser = await productionUserFor(productionKey, betaUser, shouldApply);
    console.log(`${betaUser.id} -> ${productionUser?.id ?? '(would create)'}`);

    if (productionUser !== null) {
      mappings.push({ legacyOwnerId: betaUser.id, ownerId: productionUser.id, email });
    }
  }

  if (shouldApply) {
    await writeFile(mappingPath, `${JSON.stringify(mappings, null, 2)}\n`);
    console.log(`wrote ${mappings.length} mappings to ${mappingPath}`);
  }
}

async function readSnapshot(directory: string): Promise<Snapshot> {
  const snapshot: Snapshot = {};

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) {
      continue;
    }

    const lines = (await readFile(join(directory, entry.name, 'documents.jsonl'), 'utf8')).split('\n');
    snapshot[entry.name] = lines.filter((line) => line.trim() !== '').map((line) => JSON.parse(line) as Row);
  }

  return snapshot;
}

async function writeSnapshot(directory: string, snapshot: Snapshot): Promise<void> {
  for (const [table, rows] of Object.entries(snapshot)) {
    await mkdir(join(directory, table), { recursive: true });
    await writeFile(
      join(directory, table, 'documents.jsonl'),
      rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length > 0 ? '\n' : ''),
    );
  }
}

async function migrate(betaDirectory: string, mappingPath: string, outputDirectory: string): Promise<void> {
  const mappings = JSON.parse(await readFile(mappingPath, 'utf8')) as OwnerMapping[];
  const ownerIds = new Map(mappings.map((mapping) => [mapping.legacyOwnerId, mapping.ownerId]));
  const beta = await readSnapshot(betaDirectory);
  const { snapshot, leftBehind } = migrateSnapshot(beta, ownerIds, Date.now());
  const before = countByOwner(beta);
  const after = countByOwner(snapshot);

  for (const mapping of mappings) {
    const betaCounts = before[mapping.legacyOwnerId] ?? {};
    const { owners: _owners, ...productionCounts } = after[mapping.ownerId] ?? {};
    const { owners: _betaOwners, ...betaRows } = betaCounts;
    const matches = JSON.stringify(Object.entries(betaRows).sort()) === JSON.stringify(Object.entries(productionCounts).sort());
    const premium = snapshot.profiles?.find((profile) => profile.ownerId === mapping.ownerId)?.isPremium === true;

    console.log(
      `${matches ? 'ok  ' : 'DIFF'} ${mapping.email}: ${JSON.stringify(productionCounts)}${premium ? ' premium' : ''}`,
    );
  }

  for (const owner of leftBehind) {
    console.log(`left behind ${owner}: ${JSON.stringify(before[owner])}`);
  }

  await writeSnapshot(outputDirectory, snapshot);
  await mkdir(join(outputDirectory, '_tables'), { recursive: true });
  await copyFile(join(betaDirectory, '_tables', 'documents.jsonl'), join(outputDirectory, '_tables', 'documents.jsonl'));
  console.log(`wrote the production snapshot to ${outputDirectory}`);
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    apply: { type: 'boolean', default: false },
    beta: { type: 'string' },
    mapping: { type: 'string' },
    out: { type: 'string' },
  },
});

const [command] = positionals;

if (command === 'users' && values.mapping !== undefined) {
  await createUsers(values.mapping, values.apply);
} else if (command === 'snapshot' && values.beta !== undefined && values.mapping !== undefined && values.out !== undefined) {
  await migrate(values.beta, values.mapping, values.out);
} else {
  console.log('Usage:');
  console.log('  bun migration/migrate-beta-to-production.ts users --mapping mapping.json [--apply]');
  console.log('  bun migration/migrate-beta-to-production.ts snapshot --beta <export dir> --mapping mapping.json --out <dir>');
  process.exit(2);
}
