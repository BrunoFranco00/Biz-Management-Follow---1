/**
 * seed-local-users.mjs
 * Cria o usuário super_admin local e slots de usuários para as organizações existentes.
 * Uso: node scripts/seed-local-users.mjs
 */
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const DEFAULT_PASSWORD = 'Biz@102030';
const SALT_ROUNDS = 10;

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('✅ Conectado ao banco de dados');

  // 1. Buscar organizações existentes
  const [orgs] = await conn.query('SELECT id, name, segment FROM organizations WHERE active = 1');
  console.log(`\n📋 Organizações encontradas: ${orgs.length}`);
  orgs.forEach(o => console.log(`  - [${o.id}] ${o.name} (${o.segment})`));

  // 2. Criar usuário super_admin local (sem organização específica, org_id = null)
  const [existingAdmin] = await conn.query(
    "SELECT id FROM org_users WHERE username = 'superadmin' LIMIT 1"
  );
  
  if (existingAdmin.length === 0) {
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
    await conn.query(
      `INSERT INTO org_users (organizationId, slot, username, passwordHash, displayName, role, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [orgs[0]?.id ?? 1, 0, 'superadmin', hash, 'Super Admin', 'super_admin', 1]
    );
    console.log('\n✅ Usuário super_admin criado: username=superadmin, senha=Biz@102030');
  } else {
    console.log('\n⚠️  Usuário superadmin já existe, pulando...');
  }

  // 3. Criar slots para cada organização
  for (const org of orgs) {
    const slotsCount = org.segment === 'agribusiness' ? 20 : 10;
    console.log(`\n🏢 Criando ${slotsCount} slots para: ${org.name}`);

    for (let slot = 1; slot <= slotsCount; slot++) {
      const username = `user${slot}_org${org.id}`;
      const displayName = `Usuário ${slot}`;

      // Verificar se já existe
      const [existing] = await conn.query(
        'SELECT id FROM org_users WHERE organizationId = ? AND slot = ? LIMIT 1',
        [org.id, slot]
      );

      if (existing.length === 0) {
        const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
        await conn.query(
          `INSERT INTO org_users (organizationId, slot, username, passwordHash, displayName, role, active, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [org.id, slot, username, hash, displayName, 'user', 1]
        );
        process.stdout.write('.');
      } else {
        process.stdout.write('s'); // skipped
      }
    }
    console.log(` ✅ ${slotsCount} slots prontos`);
  }

  // 4. Criar admin para cada organização (slot 0)
  for (const org of orgs) {
    const adminUsername = `admin_org${org.id}`;
    const [existing] = await conn.query(
      'SELECT id FROM org_users WHERE organizationId = ? AND role = ? LIMIT 1',
      [org.id, 'admin']
    );

    if (existing.length === 0) {
      const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
      await conn.query(
        `INSERT INTO org_users (organizationId, slot, username, passwordHash, displayName, role, active, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [org.id, 0, adminUsername, hash, `Admin ${org.name}`, 'admin', 1]
      );
      console.log(`✅ Admin criado para ${org.name}: username=${adminUsername}, senha=Biz@102030`);
    } else {
      console.log(`⚠️  Admin para ${org.name} já existe, pulando...`);
    }
  }

  // 5. Resumo final
  const [allUsers] = await conn.query('SELECT organizationId, role, COUNT(*) as count FROM org_users GROUP BY organizationId, role');
  console.log('\n📊 Resumo final de usuários criados:');
  allUsers.forEach(u => console.log(`  Org ${u.organizationId} | ${u.role}: ${u.count} usuários`));

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📝 Credenciais de acesso:');
  console.log('  Super Admin: username=superadmin | senha=Biz@102030');
  for (const org of orgs) {
    console.log(`  Admin ${org.name}: username=admin_org${org.id} | senha=Biz@102030`);
    console.log(`  Vendedores ${org.name}: username=user1_org${org.id} até user${org.segment === 'agribusiness' ? 20 : 10}_org${org.id} | senha=Biz@102030`);
  }

  await conn.end();
}

main().catch(e => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
