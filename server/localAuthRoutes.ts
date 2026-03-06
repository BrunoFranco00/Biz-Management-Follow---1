/**
 * localAuthRoutes.ts
 * Rotas Express para autenticação local de org_users.
 * Usa Authorization: Bearer <token> em vez de cookies para evitar problemas cross-site.
 * POST /api/local-auth/login  → login com username + senha, retorna { token, user }
 * POST /api/local-auth/logout → invalida a sessão no banco
 * GET  /api/local-auth/me     → retorna usuário local via Authorization header
 */
import { Router, Request, Response } from "express";
import { localLogin, resolveLocalUser, invalidateSession } from "./localAuth";

const router = Router();

// Helper para extrair o token do header Authorization
function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

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

    return res.json({
      success: true,
      token: result.token,
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
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const token = extractBearerToken(req);
    if (token) {
      await invalidateSession(token);
    }
    return res.json({ success: true });
  } catch {
    return res.json({ success: true });
  }
});

// GET /api/local-auth/me
router.get("/me", async (req: Request, res: Response) => {
  try {
    const token = extractBearerToken(req);
    if (!token) return res.json({ user: null });

    const orgUser = await resolveLocalUser(token);
    if (!orgUser) {
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
