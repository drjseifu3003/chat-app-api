import express from "express"
import { prisma } from "../lib/prisma"
import type { AuthRequest } from "../middleware/auth"
import { body, validationResult } from "express-validator"
import type { Server } from "socket.io"

const router = express.Router()

let ioInstance: Server | null = null

export const setSocketIO = (io: Server) => {
  ioInstance = io
}

// Get messages between two users
router.get("/:userId", async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params
    const currentUserId = req.user!.id

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: userId },
          { senderId: userId, receiverId: currentUserId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            picture: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: userId,
        receiverId: currentUserId,
        read: false,
      },
      data: { read: true },
    })

    res.json(messages)
  } catch (error) {
    console.error("[Get Messages Error]", error)
    res.status(500).json({ error: "Failed to fetch messages" })
  }
})

// Send message
router.post(
  "/",
  [
    body("receiverId").notEmpty().withMessage("Receiver ID is required"),
    body("content").notEmpty().withMessage("Content is required"),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { receiverId, content } = req.body
      const senderId = req.user!.id

      const message = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          content,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              picture: true,
            },
          },
        },
      })

      if (ioInstance) {
        const sockets = await ioInstance.fetchSockets()
        for (const socket of sockets) {
          const authSocket = socket as any
          if (authSocket.userId === receiverId) {
            socket.emit("message:receive", message)
          }
        }

        for (const socket of sockets) {
          const authSocket = socket as any
          if (authSocket.userId === senderId) {
            socket.emit("message:sent", message)
          }
        }
      }

      res.status(201).json(message)
    } catch (error) {
      console.error("[Send Message Error]", error)
      res.status(500).json({ error: "Failed to send message" })
    }
  },
)

// Get unread message count
router.get("/unread/count", async (req: AuthRequest, res) => {
  try {
    const count = await prisma.message.count({
      where: {
        receiverId: req.user!.id,
        read: false,
      },
    })

    res.json({ count })
  } catch (error) {
    console.error("[Unread Count Error]", error)
    res.status(500).json({ error: "Failed to fetch unread count" })
  }
})

export default router
