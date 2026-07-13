import { spawnSync } from 'node:child_process';

const neonDatabaseUrl =
  process.env.NEON_POSTGRES_PRISMA_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.NEON_POSTGRES_URL;
const databaseUrl = process.env.VERCEL ? neonDatabaseUrl || process.env.DATABASE_URL : process.env.DATABASE_URL || neonDatabaseUrl;

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

const commands = [
  ['npx', ['prisma', 'generate']],
  ['npx', ['prisma', 'migrate', 'deploy']],
  ['npx', ['next', 'build']],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
