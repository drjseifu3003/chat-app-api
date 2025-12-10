import express from "express"
import { OAuth2Client } from "google-auth-library"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { prisma } from "../lib/prisma"
import { body, validationResult } from "express-validator"

const router = express.Router()
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// Google OAuth Login
router.post("/google", async (req, res) => {
  try {
    const { tokenId } = req.body

    if (!tokenId) {
      return res.status(400).json({ error: "Token ID is required" })
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload) {
      return res.status(400).json({ error: "Invalid token" })
    }

    const { sub: googleId, email, name, picture } = payload

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { googleId },
    })

    if (!user && email) {
      user = await prisma.user.upsert({
        where: { email },
        update: {
          googleId,
          name,
          picture,
          isOnline: true,
        },
        create: {
          googleId,
          email,
          name,
          picture,
          isOnline: true,
        },
      })
    } else if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeen: new Date() },
      })
    }

    if (!user) {
      return res.status(400).json({ error: "Failed to create user" })
    }

    // Create JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, {
      // expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    })

    // Store session
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    })
  } catch (error) {
    console.error("[Google Auth Error]", error)
    res.status(500).json({ error: "Authentication failed" })
  }
})

// JWT Register
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("name").notEmpty().withMessage("Name is required"),
  ],
  async (req:express.Request, res: express.Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, password, name } = req.body

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          isOnline: true,
        },
      })

      // Create JWT token
      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, {
        // expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      })

      // Store session
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      })

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
      })
    } catch (error) {
      console.error("[Register Error]", error)
      res.status(500).json({ error: "Registration failed" })
    }
  },
)

// JWT Login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, password } = req.body

      // Find user
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid credentials" })
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" })
      }

      // Update online status
      await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeen: new Date() },
      })

      // Create JWT token
      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, {
        // expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      })

      
      // Store session
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      })

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
      })
    } catch (error) {
      console.error("[Login Error]", error)
      res.status(500).json({ error: "Login failed" })
    }
  },
)

// Logout
router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    if (token) {
      // Delete session
      await prisma.session.deleteMany({ where: { token } })

      // Update user online status
      const decoded = jwt.decode(token) as { userId: string } | null
      if (decoded?.userId) {
        await prisma.user.update({
          where: { id: decoded.userId },
          data: { isOnline: false, lastSeen: new Date() },
        })
      }
    }

    res.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("[Logout Error]", error)
    res.status(500).json({ error: "Logout failed" })
  }
})

export default router
