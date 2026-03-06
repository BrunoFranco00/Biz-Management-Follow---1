import { db } from './server/db';
import { orgUsers } from './drizzle/schema';

async function main() {
  const users = await db.select().from(orgUsers);
  console.log('Total users:', users.length);
  for (const u of users) {
    console.log(`id=${u.id} | username=${u.username} | role=${u.role} | orgId=${u.organizationId} | active=${u.active} | displayName=${u.displayName}`);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
