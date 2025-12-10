import express from "express"
import { prisma } from "../lib/prisma"
import type { AuthRequest } from "../middleware/auth"

const router = express.Router()

// Get all users
router.get("/", async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user!.id },
      },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        isOnline: true,
        lastSeen: true,
      },
      orderBy: [{ isOnline: "desc" }, { lastSeen: "desc" }],
    })

    res.json(users)
  } catch (error) {
    console.error("[Get Users Error]", error)
    res.status(500).json({ error: "Failed to fetch users" })
  }
})

// Get user by ID
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        isOnline: true,
        lastSeen: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json(user)
  } catch (error) {
    console.error("[Get User Error]", error)
    res.status(500).json({ error: "Failed to fetch user" })
  }
})

// Get current user
router.get("/me/profile", async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    })

    res.json(user)
  } catch (error) {
    console.error("[Get Profile Error]", error)
    res.status(500).json({ error: "Failed to fetch profile" })
  }
})

export default router
