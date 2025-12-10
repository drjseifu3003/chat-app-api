import express from "express"
import { GoogleGenerativeAI } from "@google/generative-ai"
import type { AuthRequest } from "../middleware/auth"
import { body, validationResult } from "express-validator"

const router = express.Router()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

// Chat with AI
router.post("/chat", [body("message").notEmpty().withMessage("Message is required")], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { message, history = [] } = req.body

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" })
    

    const chat = model.startChat({
      history: history.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    })

    const result = await chat.sendMessage(message)
    const response = await result.response
    const aiMessage = response.text() || "Sorry, I could not generate a response."

    res.json({
      message: aiMessage,
    })
  } catch (error) {
    console.error("[AI Chat Error]", error)
    res.status(500).json({ error: "Failed to get AI response" })
  }
})

export default router
