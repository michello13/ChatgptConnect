import { readFile } from 'node:fs/promises';

async function main() {
  const url = new URL((process.env.TURSO_DATABASE_URL || '').replace(/^(libsql|turso):/, 'https:'));
  const token = process.env.TURSO_AUTH_TOKEN;
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.turso.io') || !token)
    throw new Error('Missing or invalid Turso preview configuration.');
  if (!url.hostname.startsWith('database-bole-ladder-'))
    throw new Error('Refusing to initialize a database other than the confirmed HonestyBox preview database.');

  async function execute(sql) {
    const response = await fetch(new URL('/v2/pipeline', url), {
      method: 'POST',
      redirect: 'error',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql } }, { type: 'close' }] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error('Turso HTTP error: ' + response.status);
    const result = (await response.json()).results?.[0];
    if (result?.type !== 'ok') throw new Error('SQL error: ' + (result?.error?.code || 'unknown'));
    return result.response.result;
  }

  const schema = await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8');
  // Schema statements start on their own lines; retain the complete trigger body.
  const statements = schema.trim().split(/\r?\n(?=(?:PRAGMA|CREATE (?:TABLE|TRIGGER))\b)/i);
  for (const sql of statements) {
    const label = sql.match(/^CREATE (?:TABLE|TRIGGER) IF NOT EXISTS (\w+)/i)?.[1];
    if (!label && sql.trim() !== 'PRAGMA foreign_keys=ON;')
      throw new Error('Unexpected schema statement; review the migration.');
    if (!label) continue;
    try { await execute(sql); }
    catch (error) { throw new Error(label + ': ' + error.message); }
    console.log('OK: ' + label);
  }
  const expected = ['products','orders','order_items','admin_sessions','login_attempts','checkout_requests','checkout_atomic'];
  const result = await execute("SELECT name FROM sqlite_schema WHERE type IN ('table','trigger')");
  const names = new Set(result.rows.map(row => row[0].value));
  for (const name of expected) if (!names.has(name)) throw new Error('Missing schema object: ' + name);
  console.log('HonestyBox preview schema verified.');
}
main().catch(error => {
  // Do not dump request objects, URLs or credentials.
  console.error(error instanceof TypeError ? 'Database connection failed. Check preview configuration.' : error.message);
  process.exitCode = 1;
});
