import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User, OrgUser } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { resolveLocalUser } from "../localAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  /** OAuth Manus user (null if using local auth) */
  user: User | null;
  /** Local org user (null if using OAuth) */
  orgUser: OrgUser | null;
  /** Unified resolved user — whichever auth method is active */
  resolvedUser: {
    id: number;
    role: "user" | "admin" | "super_admin";
    organizationId: number | null;
    username?: string;
    displayName?: string | null;
    name?: string | null;
  } | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let orgUser: OrgUser | null = null;

  // 1. Try local auth via Authorization: Bearer <token> header
  try {
    const authHeader = opts.req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const localToken = authHeader.slice(7);
      orgUser = await resolveLocalUser(localToken);
    }
  } catch {
    orgUser = null;
  }

  // 2. If no local user, try OAuth Manus
  if (!orgUser) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  // 3. Build unified resolvedUser
  let resolvedUser: TrpcContext["resolvedUser"] = null;
  if (orgUser) {
    resolvedUser = {
      id: orgUser.id,
      role: orgUser.role as "user" | "admin" | "super_admin",
      organizationId: orgUser.organizationId,
      username: orgUser.username,
      displayName: orgUser.displayName,
    };
  } else if (user) {
    resolvedUser = {
      id: user.id,
      role: user.role as "user" | "admin" | "super_admin",
      organizationId: user.organizationId ?? null,
      name: user.name,
    };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    orgUser,
    resolvedUser,
  };
}
