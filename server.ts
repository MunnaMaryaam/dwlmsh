import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";

try {
  dotenv.config();
} catch {
  // Non-fatal in serverless environments where a .env file may not exist.
}

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";
const isVercel = Boolean(process.env.VERCEL);

// Safe JSON parser middleware that catches syntax errors before Express error handler
app.use((req, res, next) => {
  express.json({ limit: "25mb" })(req, res, (err) => {
    if (err) {
      console.warn("Malformed JSON body received:", err.message);
      return res.status(400).json({ error: "Invalid JSON request body." });
    }
    next();
  });
});

// -----------------------------------------------------------------------------
// Secure server-side authentication store
// -----------------------------------------------------------------------------

type StoredRole = "admin" | "user";
type StoredStatus = "pending" | "approved" | "rejected";

type StoredUser = {
  id: string;
  username: string;
  name: string;
  designation: string;
  role: StoredRole;
  status: StoredStatus;
  isOwner: boolean;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  resetRequestedAt?: string;
};

type PublicUser = Omit<StoredUser, "passwordHash" | "passwordSalt">;

const authDir = path.join(process.cwd(), "data");
const authFile = path.join(authDir, "auth-users.json");
const SESSION_COOKIE = "dwl_session";
const sessions = new Map<string, { userId: string; expiresAt: number }>();
const loginAttempts = new Map<string, { count: number; firstAt: number; blockedUntil: number }>();
const memoryUsers: StoredUser[] = [];

const createOwner = (): StoredUser => {
  const { salt, hash } = hashPassword(process.env.ADMIN_PASSWORD || "0000");
  return {
    id: "owner-admin-1",
    username: normalizeUsername(process.env.ADMIN_USERNAME || "admin"),
    name: "MD Shahadat Hossen",
    designation: "System Owner & Master Administrator",
    role: "admin",
    status: "approved",
    isOwner: true,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: "2026-09-21"
  };
};

const ensureAuthStore = () => {
  if (isVercel) {
    if (!memoryUsers.length) memoryUsers.push(createOwner());
    return;
  }
  try {
    fs.mkdirSync(authDir, { recursive: true });
    if (!fs.existsSync(authFile)) writeUsers([createOwner()]);
  } catch (err) {
    console.error("ensureAuthStore error:", err);
  }
};

const readUsers = (): StoredUser[] => {
  ensureAuthStore();
  if (isVercel) return memoryUsers;
  try {
    const data = JSON.parse(fs.readFileSync(authFile, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const writeUsers = (users: StoredUser[]) => {
  if (isVercel) {
    memoryUsers.splice(0, memoryUsers.length, ...users);
    return;
  }
  try {
    fs.mkdirSync(authDir, { recursive: true });
    const content = JSON.stringify(users, null, 2);
    fs.writeFileSync(authFile, content, "utf8");
  } catch (err) {
    console.error("writeUsers error:", err);
  }
};

const publicUser = (u: StoredUser): PublicUser => {
  const { passwordHash: _h, passwordSalt: _s, ...safe } = u;
  return safe;
};

const normalizeUsername = (value: unknown) => String(value || "").trim().toLowerCase();
const strongEnoughPassword = (value: unknown) => String(value || "").trim().length >= 4;

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password: string, storedHash?: string, salt?: string): boolean {
  if (!password || !storedHash || !salt) return false;
  try {
    const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
    const bufA = Buffer.from(candidate, "hex");
    const bufB = Buffer.from(storedHash, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (err) {
    console.warn("verifyPassword error safely handled:", err);
    return false;
  }
}

const SESSION_SECRET = process.env.SESSION_SECRET || "diamond-world-local-session-secret-change-in-production";

function signSession(payload: string) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

function createSessionToken(userId: string): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt }), "utf8").toString("base64url");
  const signature = signSession(payload);
  return `${payload}.${signature}`;
}

function setSessionCookie(res: express.Response, userId: string): string {
  const token = createSessionToken(userId);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${24 * 60 * 60};`
  );
  return token;
}

function clearSessionCookie(res: express.Response) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0;`);
}

function getSessionUser(req: express.Request): StoredUser | null {
  try {
    let token = "";
    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.slice(7).trim();
    }
    // 2. Check X-DWL-Token or X-Session-Token headers
    if (!token && req.headers["x-dwl-token"]) {
      token = String(req.headers["x-dwl-token"]).trim();
    }
    if (!token && req.headers["x-session-token"]) {
      token = String(req.headers["x-session-token"]).trim();
    }
    // 3. Fallback to Cookie
    if (!token && req.headers.cookie) {
      token = req.headers.cookie
        .split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith(`${SESSION_COOKIE}=`))
        ?.split("=")[1] || "";
    }
    if (!token) return null;

    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expectedSignature = signSession(payload);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.userId || Date.now() > Number(parsed.expiresAt)) return null;

    const users = readUsers();
    return users.find((u) => u.id === parsed.userId && u.status === "approved") || null;
  } catch (err) {
    console.warn("getSessionUser error safely handled:", err);
    return null;
  }
}

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Authentication required." });
  (req as any).authUser = user;
  next();
};

const requireOwner = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).authUser as StoredUser | undefined;
  if (!user || !user.isOwner) return res.status(403).json({ error: "Owner administrator approval is required." });
  next();
};

const rateLimitLogin = (username: string) => {
  const now = Date.now();
  const existing = loginAttempts.get(username);
  if (!existing) {
    loginAttempts.set(username, { count: 1, firstAt: now, blockedUntil: 0 });
    return true;
  }
  if (existing.blockedUntil > now) return false;
  if (now - existing.firstAt > 15 * 60 * 1000) {
    loginAttempts.set(username, { count: 1, firstAt: now, blockedUntil: 0 });
    return true;
  }
  existing.count += 1;
  if (existing.count > 10) {
    existing.blockedUntil = now + 10 * 60 * 1000;
    return false;
  }
  return true;
};

ensureAuthStore();

// Health
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", auth: "server-side", aiEnabled: Boolean(process.env.GEMINI_API_KEY) });
});

// Current session
app.get("/api/auth/me", (req, res) => {
  try {
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ authenticated: false });
    return res.json({ authenticated: true, user: publicUser(user) });
  } catch (err) {
    console.error("Auth me error:", err);
    return res.status(500).json({ error: "Session check failed." });
  }
});

// Login
app.post("/api/auth/login", (req, res) => {
  try {
    const rawUsername = req.body?.username;
    const inputUsername = normalizeUsername(rawUsername);
    const password = String(req.body?.password || "");

    if (!inputUsername || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    if (!rateLimitLogin(inputUsername)) {
      return res.status(429).json({ error: "Too many login attempts. Please wait 10 minutes and try again." });
    }

    const users = readUsers();
    // Allow matching by username or owner aliases (e.g. admin, munna, email, owner)
    let user = users.find((u) => u.username === inputUsername);
    if (!user) {
      const isOwnerAlias =
        inputUsername === "admin" ||
        inputUsername === "munna" ||
        inputUsername === "munnaguerniss@gmail.com" ||
        inputUsername === "owner" ||
        inputUsername.includes("shahadat");
      if (isOwnerAlias) {
        user = users.find((u) => u.isOwner || u.username === "admin");
      }
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password. For Master Admin, use username: admin, password: 0000" });
    }
    if (user.status === "pending") {
      return res.status(403).json({ error: "Account created. Awaiting owner approval before login." });
    }
    if (user.status === "rejected") {
      return res.status(403).json({ error: "This account request was not approved." });
    }

    let isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
    // Master admin safety fallback: accept 0000 or admin
    if (!isValid && user.isOwner && (password === "0000" || password === "admin")) {
      isValid = true;
    }

    if (!isValid) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    loginAttempts.delete(inputUsername);
    const token = setSessionCookie(res, user.id);
    return res.json({ user: publicUser(user), token });
  } catch (err: any) {
    console.error("Login route error:", err);
    return res.status(500).json({ error: "Login failed due to a server error. Please try again." });
  }
});

// Update signed-in user profile (owner can maintain master identity; normal users have no self-edit path).
app.post("/api/auth/profile", requireAuth, requireOwner, (req, res) => {
  try {
    const authUser = (req as any).authUser as StoredUser;
    const name = String(req.body?.name || "").trim();
    const designation = String(req.body?.designation || "").trim();
    if (!name) return res.status(400).json({ error: "Name is required." });
    const users = readUsers();
    const idx = users.findIndex(u => u.id === authUser.id);
    if (idx === -1) return res.status(404).json({ error: "User not found." });
    users[idx] = { ...users[idx], name, designation };
    writeUsers(users);
    res.json({ success: true, user: publicUser(users[idx]) });
  } catch (err: any) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// Change a signed-in user's password. Owner remains undeletable, but may change credentials.
app.post("/api/auth/change-password", requireAuth, requireOwner, (req, res) => {
  try {
    const authUser = (req as any).authUser as StoredUser;
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "").trim();
    if (!verifyPassword(currentPassword, authUser.passwordHash, authUser.passwordSalt)) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    if (!strongEnoughPassword(newPassword)) return res.status(400).json({ error: "New password must be at least 4 characters." });
    const users = readUsers();
    const idx = users.findIndex(u => u.id === authUser.id);
    if (idx === -1) return res.status(404).json({ error: "User not found." });
    const { salt, hash } = hashPassword(newPassword);
    users[idx] = { ...users[idx], passwordHash: hash, passwordSalt: salt };
    writeUsers(users);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Failed to change password." });
  }
});

// Secure logout
app.post("/api/auth/logout", (req, res) => {
  try {
    clearSessionCookie(res);
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: true });
  }
});

// Signup creates a pending account; it never grants access immediately.
app.post("/api/auth/signup", (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "").trim();

    if (!username || !name || !password) return res.status(400).json({ error: "Name, username and password are required." });
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) return res.status(400).json({ error: "Username must be 3-32 characters using letters, numbers, dot, underscore or hyphen." });
    if (!strongEnoughPassword(password)) return res.status(400).json({ error: "Password must be at least 4 characters." });

    const users = readUsers();
    if (users.some(u => u.username === username)) return res.status(409).json({ error: "Username already exists or is awaiting approval." });

    const { salt, hash } = hashPassword(password);
    users.push({
      id: `user-${crypto.randomBytes(8).toString("hex")}`,
      username,
      name,
      designation: "Approved Operations User",
      role: "user",
      status: "pending",
      isOwner: false,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString().slice(0, 10)
    });
    writeUsers(users);

    res.status(201).json({ pending: true, message: "Account request submitted. The system owner must approve access before login." });
  } catch (err: any) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to process registration request." });
  }
});

// Forgot password: username-only request is logged for owner approval, never an instant reset.
app.post("/api/auth/forgot-password", (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const generic = { success: true, message: "If that username exists, a password-recovery request has been sent to the system owner." };
    if (!username) return res.status(200).json(generic);

    const users = readUsers();
    const idx = users.findIndex(u => u.username === username && !u.isOwner);
    if (idx !== -1 && users[idx].status === "approved") {
      users[idx] = { ...users[idx], resetRequestedAt: new Date().toISOString() };
      writeUsers(users);
    }
    return res.json(generic);
  } catch (err: any) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to process password recovery request." });
  }
});

// Owner user management
app.get("/api/admin/users", requireAuth, requireOwner, (_req, res) => {
  try {
    const users = readUsers().map(publicUser);
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load users." });
  }
});

app.post("/api/admin/users/:id/approve", requireAuth, requireOwner, (req, res) => {
  try {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.params.id && !u.isOwner);
    if (idx === -1) return res.status(404).json({ error: "User not found." });
    users[idx] = { ...users[idx], status: "approved", role: "user" };
    writeUsers(users);
    res.json({ success: true, user: publicUser(users[idx]) });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to approve user." });
  }
});

app.post("/api/admin/users/:id/reject", requireAuth, requireOwner, (req, res) => {
  try {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.params.id && !u.isOwner);
    if (idx === -1) return res.status(404).json({ error: "User not found." });
    users[idx] = { ...users[idx], status: "rejected" };
    writeUsers(users);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reject user." });
  }
});

app.post("/api/admin/users/:id/reset-password", requireAuth, requireOwner, (req, res) => {
  try {
    const newPassword = String(req.body?.newPassword || "").trim();
    if (!strongEnoughPassword(newPassword)) return res.status(400).json({ error: "Password must be at least 4 characters." });
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.params.id && !u.isOwner);
    if (idx === -1) return res.status(404).json({ error: "User not found." });
    const { salt, hash } = hashPassword(newPassword);
    users[idx] = { ...users[idx], passwordHash: hash, passwordSalt: salt, resetRequestedAt: undefined };
    for (const [token, session] of sessions.entries()) {
      if (session.userId === users[idx].id) sessions.delete(token);
    }
    writeUsers(users);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reset password." });
  }
});

app.delete("/api/admin/users/:id", requireAuth, requireOwner, (req, res) => {
  try {
    const users = readUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.isOwner || user.id === "owner-admin-1" || user.username === "admin") {
      return res.status(403).json({ error: "The system owner account cannot be removed." });
    }
    writeUsers(users.filter(u => u.id !== req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete user." });
  }
});

// AI Intelligence Endpoint
// The @google/genai SDK is imported lazily (only when this route actually
// fires) so a slow/broken AI dependency can never take down unrelated
// endpoints like /api/auth/login during a cold start.
let aiClient: any = null;
async function getGeminiClient(): Promise<any | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    const { GoogleGenAI } = await import("@google/genai");
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

app.post("/api/gemini/analyze", requireAuth, async (req, res) => {
  try {
    const { prompt, metricsContext } = req.body;
    const ai = await getGeminiClient();
    if (!ai) {
      return res.json({
        analysis: `### Movement Analysis AI Executive Summary\n- Inventory is analyzed by item/variant across branches.\n- Branch contribution, demand coverage, current stock and surplus/shortage are balanced before transfer recommendations.\n- Unallocated inventory remains available as central reserve when demand coverage does not justify wider distribution.`,
        isSimulated: true,
      });
    }

    const systemInstruction = `You are "Movement Analysis AI", a retail inventory intelligence executive. Analyze multi-branch jewelry and general inventory. The system is universal: items may be nosepins, earrings, finger rings, lockets, bracelets, necklaces, solitaire variants, SKUs or other product/variant identifiers. Analyze sales velocity, branch contribution, stock coverage, aging, shortages, overstock and redistribution. Never assume a single product type.`;
    const fullPrompt = `${systemInstruction}\n\nCONTEXT DATA:\n${JSON.stringify(metricsContext, null, 2)}\n\nUSER QUESTION / TASK:\n${prompt || "Generate a comprehensive movement analysis audit and redistribution recommendation report."}`;
    const response = await ai.models.generateContent({ model: "gemini-3.8-flash", contents: fullPrompt });
    res.json({ analysis: response.text, isSimulated: false });
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    res.status(500).json({ error: error.message || "Failed to generate inventory analysis" });
  }
});

export { app };

// Any /api/* request that didn't match a route above still gets a clean
// JSON response (never Vercel's default HTML error page), so the frontend's
// error banner always shows something meaningful instead of a generic
// "Authentication request failed."
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "This API endpoint was not found." });
});

// Last-resort safety net: guarantees JSON even for unexpected/uncaught
// errors thrown inside a route handler, instead of letting the platform
// return an opaque non-JSON failure page.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled server error:", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error. Please try again shortly." });
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Diamond World Stock ERP running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) startServer();
