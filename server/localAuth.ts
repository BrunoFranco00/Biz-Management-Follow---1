/**
 * localAuth.ts
 * Autenticação local para org_users — independente do OAuth Manus.
 * Fluxo: login com username+senha → JWT próprio → cookie "biz_local_session"
 */
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { orgUsers, orgSessions, organizations } from "../drizzle/schema";

const LOCAL_COOKIE = "biz_local_session";
const JWT_SECRET_LOCAL = new TextEncoder().encode(
  process.env.JWT_SECRET + "_local_org"
);
const SESSION_DURATION_HOURS = 24;

// ─── Hash de senha ────────────────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── Gerar JWT de sessão local ────────────────────────────────────────────────
export async function signLocalJWT(payload: {
  orgUserId: number;
  organizationId: number;
  slot: number;
  role: string;
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(JWT_SECRET_LOCAL);
}

// ─── Verificar JWT de sessão local ────────────────────────────────────────────
export async function verifyLocalJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_LOCAL);
    return payload as {
      orgUserId: number;
      organizationId: number;
      slot: number;
      role: string;
    };
  } catch {
    return null;
  }
}

// ─── Login local ─────────────────────────────────────────────────────────────
export async function localLogin(username: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const rows = await db
    .select()
    .from(orgUsers)
    .where(and(eq(orgUsers.username, username.toLowerCase().trim()), eq(orgUsers.active, true)))
    .limit(1);

  const orgUser = rows[0];
  if (!orgUser) return null;

  const valid = await verifyPassword(password, orgUser.passwordHash);
  if (!valid) return null;

  // Atualizar lastSignedIn
  await db
    .update(orgUsers)
    .set({ lastSignedIn: new Date() })
    .where(eq(orgUsers.id, orgUser.id));

  const token = await signLocalJWT({
    orgUserId: orgUser.id,
    organizationId: orgUser.organizationId,
    slot: orgUser.slot,
    role: orgUser.role,
  });

  // Salvar sessão no banco
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 3600 * 1000);
  await db.insert(orgSessions).values({
    orgUserId: orgUser.id,
    organizationId: orgUser.organizationId,
    token,
    expiresAt,
  });

  return { token, orgUser };
}

// ─── Resolver usuário a partir do cookie ─────────────────────────────────────
export async function resolveLocalUser(token: string) {
  const payload = await verifyLocalJWT(token);
  if (!payload) return null;

  const db = await getDb();
  if (!db) return null;

  // Verificar se sessão ainda existe no banco
  const sessions = await db
    .select()
    .from(orgSessions)
    .where(eq(orgSessions.token, token))
    .limit(1);

  const session = sessions[0];
  if (!session || session.expiresAt < new Date()) return null;

  const users = await db
    .select()
    .from(orgUsers)
    .where(and(eq(orgUsers.id, payload.orgUserId), eq(orgUsers.active, true)))
    .limit(1);

  return users[0] ?? null;
}

// ─── Criar lote de slots para uma organização ─────────────────────────────────
export async function createOrgUserSlots(
  organizationId: number,
  orgSlug: string,
  count: number,
  defaultPassword: string = "Biz@102030"
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const hash = await hashPassword(defaultPassword);

  const slots: Array<{
    organizationId: number;
    slot: number;
    username: string;
    passwordHash: string;
    displayName: string | null;
    role: "user" | "admin";
    active: boolean;
  }> = Array.from({ length: count }, (_, i) => ({
    organizationId,
    slot: i + 1,
    username: `${orgSlug}_user${i + 1}`,
    passwordHash: hash,
    displayName: null,
    role: "user" as "user" | "admin",
    active: true,
  }));

  // Primeiro slot é admin da organização
  if (slots[0]) slots[0].role = "admin";

  await db.insert(orgUsers).values(slots);
  return slots;
}

// ─── Resetar senha de um slot ─────────────────────────────────────────────────
export async function resetOrgUserPassword(
  orgUserId: number,
  organizationId: number,
  newPassword: string = "Biz@102030"
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const hash = await hashPassword(newPassword);
  await db
    .update(orgUsers)
    .set({ passwordHash: hash })
    .where(and(eq(orgUsers.id, orgUserId), eq(orgUsers.organizationId, organizationId)));

  // Invalidar todas as sessões do usuário
  await db
    .delete(orgSessions)
    .where(eq(orgSessions.orgUserId, orgUserId));
}

// ─── Invalidar sessão por token ─────────────────────────────────────────────
export async function invalidateSession(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.delete(orgSessions).where(eq(orgSessions.token, token));
  } catch {
    // ignore
  }
}

// ─── Atualizar perfil do usuário ──────────────────────────────────────────────
export async function updateOrgUserProfile(
  orgUserId: number,
  organizationId: number,
  data: { displayName?: string; newPassword?: string; currentPassword?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const rows = await db
    .select()
    .from(orgUsers)
    .where(and(eq(orgUsers.id, orgUserId), eq(orgUsers.organizationId, organizationId)))
    .limit(1);

  const user = rows[0];
  if (!user) throw new Error("Usuário não encontrado");

  const updates: Record<string, unknown> = {};

  if (data.displayName !== undefined) {
    updates.displayName = data.displayName;
  }

  if (data.newPassword) {
    if (!data.currentPassword) throw new Error("Senha atual obrigatória");
    const valid = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!valid) throw new Error("Senha atual incorreta");
    updates.passwordHash = await hashPassword(data.newPassword);
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(orgUsers)
      .set(updates)
      .where(eq(orgUsers.id, orgUserId));
  }

  return { success: true };
}

export { LOCAL_COOKIE };
