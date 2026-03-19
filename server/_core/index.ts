import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { localAuthRouter } from "../localAuthRoutes";
import cookieParser from "cookie-parser";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Cookie parser (required for local auth)
  app.use(cookieParser());
  // Health check — testa DB e variáveis de ambiente
  app.get("/api/health", async (_req, res) => {
    const dbUrl = process.env.DATABASE_URL;
    const jwtSecret = process.env.JWT_SECRET;
    let dbStatus = "not_configured";
    let dbError: string | null = null;
    if (dbUrl) {
      try {
        const db = await getDb();
        if (db) {
          const { sql } = await import("drizzle-orm");
          await db.execute(sql`SELECT 1`);
          dbStatus = "connected";
        } else {
          dbStatus = "init_failed";
        }
      } catch (err: any) {
        dbStatus = "query_failed";
        dbError = err?.message ?? String(err);
      }
    }
    res.json({
      status: dbStatus === "connected" ? "ok" : "degraded",
      db: dbStatus,
      dbError,
      hasJwtSecret: !!jwtSecret,
      hasDatabaseUrl: !!dbUrl,
      nodeVersion: process.version,
      env: process.env.NODE_ENV,
    });
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Local auth routes (username/password for org_users)
  app.use("/api/local-auth", localAuthRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
