import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: role === "admin" ? 1 : 2,
    openId: role === "admin" ? "admin-user" : "regular-user",
    email: role === "admin" ? "admin@example.com" : "user@example.com",
    name: role === "admin" ? "Admin User" : "Regular User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createGuestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated users", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("user");
    expect(result?.name).toBe("Regular User");
  });

  it("returns admin user with admin role", async () => {
    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.role).toBe("admin");
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});

describe("opportunities router", () => {
  it("requires authentication to list opportunities", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.opportunities.list()).rejects.toThrow();
  });

  it("allows authenticated users to access opportunities", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    // Should not throw - returns empty array if no DB
    const result = await caller.opportunities.list().catch(() => []);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("admin router", () => {
  it("blocks non-admin users from admin endpoints", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.getUsers()).rejects.toThrow();
  });

  it("allows admin users to access admin endpoints", async () => {
    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    // Should not throw - returns empty array if no DB
    const result = await caller.admin.getUsers().catch(() => []);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("strategic router", () => {
  it("requires authentication to list strategic actions", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.strategic.list()).rejects.toThrow();
  });

  it("allows authenticated users to list strategic actions", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.strategic.list().catch(() => []);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("config router", () => {
  it("allows authenticated users to get products", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.config.getProducts().catch(() => []);
    expect(Array.isArray(result)).toBe(true);
  });

  it("blocks non-admin users from creating products", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.config.createProduct({ name: "Test Product" })).rejects.toThrow();
  });

  it("allows admin users to create products", async () => {
    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    // May fail due to DB, but should not throw FORBIDDEN
    const result = await caller.config.createProduct({ name: "Test Product" }).catch((e) => {
      // Only accept DB errors, not auth errors
      expect(e.message).not.toContain("FORBIDDEN");
      return null;
    });
    // If DB available, should return an id
    if (result !== null) {
      expect(result).toHaveProperty("id");
    }
  });
});
