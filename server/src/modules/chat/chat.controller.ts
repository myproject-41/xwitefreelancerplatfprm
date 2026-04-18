import { Request, Response } from 'express'
import { chatService } from './chat.service'

export class ChatController {
  async listConversations(req: Request, res: Response): Promise<void> {
    try {
      const conversations = await chatService.listConversations(req.user!.userId)
      res.json({ success: true, data: conversations })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  async getOrCreateConversation(req: Request, res: Response): Promise<void> {
    try {
      const conversation = await chatService.getOrCreateConversationBetweenUsers(
        req.user!.userId,
        req.params.userId
      )
      res.json({ success: true, data: conversation })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async listMessages(req: Request, res: Response): Promise<void> {
    try {
      const messages = await chatService.getConversationMessages(
        req.params.conversationId,
        req.user!.userId
      )
      res.json({ success: true, data: messages })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const content = String(req.body?.content ?? '').trim()
      if (!content) {
        res.status(400).json({ success: false, message: 'Message content is required' })
        return
      }

      const message = await chatService.sendConversationMessage({
        conversationId: req.params.conversationId,
        senderId: req.user!.userId,
        content,
      })

      res.status(201).json({ success: true, data: message })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      await chatService.markConversationAsRead(req.params.conversationId, req.user!.userId)
      res.json({ success: true })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }
}

export const chatController = new ChatController()
