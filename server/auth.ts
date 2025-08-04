import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import type { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import type { User } from '../shared/schema';
import { loginSchema, registerSchema } from '../shared/validation';
import { auditLogger } from './lib/audit';
import { getUserByEmail, getUserById, getUserByUsername, upsertUser } from "./lib/db";
import { authLimiter, registrationLimiter } from './middleware/rateLimit';

// Extend session to include userId
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

// Session configuration
export function setupAuth(app: Express) {
  app.use(cookieParser());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'brolab-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Always false for tests
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    },
    store: process.env.NODE_ENV === 'test' ? new session.MemoryStore() : undefined
  }));
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

// Helper function to get current user
export async function getCurrentUser(req: Request) {
  if (!req.session?.userId) {
    return null;
  }
  return await getUserById(req.session.userId);
}

// Authentication routes
export function registerAuthRoutes(app: Express) {
  // Register new user
  app.post("/api/auth/register", registrationLimiter, async (req, res) => {
    try {
      // Client-side validation
      const clientValidation = registerSchema.safeParse(req.body);
      if (!clientValidation.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: clientValidation.error.errors 
        });
      }

      const { username, email, password } = clientValidation.data;
      
      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      // Check if username already exists
      const existingUsername = await getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const newUser = await upsertUser({ 
        username, 
        email, 
        password: hashedPassword
      });
      
      // Create session
      req.session.userId = newUser.id;
      
      // Log successful registration
      await auditLogger.logRegistration(
        newUser.id,
        req.ip,
        req.headers['user-agent']
      );
      
      res.status(201).json({
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          created_at: newUser.created_at
        }
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });
  
  // Login user
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      // Client-side validation
      const clientValidation = loginSchema.safeParse(req.body);
      if (!clientValidation.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: clientValidation.error.errors 
        });
      }

      const { username, password } = clientValidation.data;
      
      // Find user by username first, then by email if not found
      let user: User | null = await getUserByUsername(username);
      if (!user) {
        // Try to find by email if not found by username
        user = await getUserByEmail(username);
      }
      
      if (!user || typeof user !== 'object' || !('id' in user)) {
        // Log failed login attempt
        await auditLogger.logFailedLogin(
          username,
          req.ip,
          req.headers['user-agent']
        );
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Vérifier le mot de passe
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        // Log failed login attempt
        await auditLogger.logFailedLogin(
          username,
          req.ip,
          req.headers['user-agent']
        );
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const typedUser: User = user as User;
      req.session.userId = typedUser.id;
      
      // Log successful login
      await auditLogger.logLogin(
        typedUser.id,
        req.ip,
        req.headers['user-agent']
      );
      
      res.json({
        user: {
          id: typedUser.id,
          username: typedUser.username,
          email: typedUser.email,
          created_at: typedUser.created_at
        }
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  
  // Logout user
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // Get current user
  app.get("/api/auth/user", async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const typedUser = user as User;
      res.json({
        user: {
          id: typedUser.id,
          username: typedUser.username,
          email: typedUser.email,
          created_at: typedUser.created_at
        }
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

}