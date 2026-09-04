const fs = require('fs');
const path = require('path');
const { getPool, isFallbackMode } = require('./index');

async function runMigrations() {
  if (isFallbackMode()) {
    console.log('[Migration] Running in memory fallback mode. Migrations skipped.');
    return;
  }

  const pool = getPool();
  if (!pool) {
    console.log('[Migration] No pool available, running in fallback mode.');
    return;
  }

  const client = await pool.connect();
  try {
    console.log('[Migration] Starting database migration...');
    const migrationPath = path.join(__dirname, 'migrations', '001_initial.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await client.query(sql);
    console.log('[Migration] 001_initial.sql applied successfully.');
  } catch (err) {
    console.error('[Migration] Failed to run migration:', err.message);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
