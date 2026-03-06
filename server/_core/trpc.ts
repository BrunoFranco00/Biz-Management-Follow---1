import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware: requer qualquer usuário autenticado (OAuth ou Local)
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.resolvedUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      resolvedUser: ctx.resolvedUser,
      // Mantém ctx.user compatível para procedures que ainda o usam
      user: ctx.user ?? {
        id: ctx.resolvedUser.id,
        role: ctx.resolvedUser.role,
        organizationId: ctx.resolvedUser.organizationId,
        openId: ctx.orgUser?.username ?? 'local',
        name: ctx.resolvedUser.displayName ?? ctx.resolvedUser.name ?? null,
        email: null,
        loginMethod: 'local',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    const role = ctx.resolvedUser?.role;
    if (!ctx.resolvedUser || (role !== 'admin' && role !== 'super_admin')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        resolvedUser: ctx.resolvedUser,
        user: ctx.user ?? {
          id: ctx.resolvedUser.id,
          role: ctx.resolvedUser.role,
          organizationId: ctx.resolvedUser.organizationId,
          openId: ctx.orgUser?.username ?? 'local',
          name: ctx.resolvedUser.displayName ?? ctx.resolvedUser.name ?? null,
          email: null,
          loginMethod: 'local',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        },
      },
    });
  }),
);

export const superAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.resolvedUser || ctx.resolvedUser.role !== 'super_admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao Super Admin" });
    }

    return next({
      ctx: {
        ...ctx,
        resolvedUser: ctx.resolvedUser,
        user: ctx.user ?? {
          id: ctx.resolvedUser.id,
          role: ctx.resolvedUser.role,
          organizationId: ctx.resolvedUser.organizationId,
          openId: ctx.orgUser?.username ?? 'local',
          name: ctx.resolvedUser.displayName ?? null,
          email: null,
          loginMethod: 'local',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        },
      },
    });
  }),
);
