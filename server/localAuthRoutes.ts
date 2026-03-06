/**
 * localAuthRoutes.ts
 * Rotas Express para autenticação local de org_users.
 * POST /api/local-auth/login  → login com username + senha
 * POST /api/local-auth/logout → limpa cookie de sessão local
 * GET  /api/local-auth/me     → retorna usuário local da sessão atual
 */
import { Router, Request, Response } from "express";
import { localLogin, resolveLocalUser, LOCAL_COOKIE } from "./localAuth";

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "none" as const,
  path: "/",
  maxAge: 24 * 60 * 60 * 1000, // 24h
};

// POST /api/local-auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username: string; password: string };
    if (!username || !password) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    }

    const result = await localLogin(username, password);
    if (!result) {
      return res.status(401).json({ error: "Usuário ou senha incorretos" });
    }

    res.cookie(LOCAL_COOKIE, result.token, COOKIE_OPTIONS);

    return res.json({
      success: true,
      user: {
        id: result.orgUser.id,
        username: result.orgUser.username,
        displayName: result.orgUser.displayName,
        slot: result.orgUser.slot,
        role: result.orgUser.role,
        organizationId: result.orgUser.organizationId,
      },
    });
  } catch (err) {
    console.error("[LocalAuth] login error:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// POST /api/local-auth/logout
router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie(LOCAL_COOKIE, { ...COOKIE_OPTIONS, maxAge: -1 });
  return res.json({ success: true });
});

// GET /api/local-auth/me
router.get("/me", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[LOCAL_COOKIE];
    if (!token) return res.json({ user: null });

    const orgUser = await resolveLocalUser(token);
    if (!orgUser) {
      res.clearCookie(LOCAL_COOKIE, { ...COOKIE_OPTIONS, maxAge: -1 });
      return res.json({ user: null });
    }

    return res.json({
      user: {
        id: orgUser.id,
        username: orgUser.username,
        displayName: orgUser.displayName,
        slot: orgUser.slot,
        role: orgUser.role,
        organizationId: orgUser.organizationId,
        lastSignedIn: orgUser.lastSignedIn,
      },
    });
  } catch (err) {
    console.error("[LocalAuth] me error:", err);
    return res.json({ user: null });
  }
});

export { router as localAuthRouter };
