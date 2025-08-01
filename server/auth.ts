import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import type { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import type { User } from '../shared/schema';
import { getUserByEmail, getUserById, getUserByUsername, upsertUser } from "./lib/db";

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
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'test' ? 'lax' : 'strict',
      maxAge: 24 * 60 * 60 * 1000
    }
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
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      // Validate input
      if (!username || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const newUser = await upsertUser({ username, email, password: hashedPassword });
      
      // Create session
      req.session.userId = newUser.id;
      
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
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      // Find user by username first, then by email if not found
      let user: User | null = await getUserByUsername(username);
      if (!user) {
        // Try to find by email if not found by username
        user = await getUserByEmail(username);
      }
      
      if (!user || typeof user !== 'object' || !('id' in user)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      // Vérifier le mot de passe
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const typedUser: User = user as User;
      req.session.userId = typedUser.id;
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