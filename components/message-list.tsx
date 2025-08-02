"use client"

import { useEffect, useRef } from "react"

interface Message {
  text: string
  username: string
  timestamp: number
  id: string
}

interface MessageListProps {
  messages: Message[]
  currentUsername: string
}

export default function MessageList({ messages, currentUsername }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const escapeHtml = (text: string) => {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900">
      {messages.length === 0 && (
        <div className="text-center text-gray-500 text-sm font-mono">
          <p>🔐 This is a secure, end-to-end encrypted chat room.</p>
          <p>Share the link above to invite other users.</p>
        </div>
      )}
      {messages.map((message) => {
        const isOwnMessage = message.username === currentUsername
        const bgColor = isOwnMessage ? "bg-green-800 bg-opacity-50" : "bg-gray-800"
        const borderColor = isOwnMessage ? "border-green-600" : "border-gray-700"
        const usernameColor = isOwnMessage ? "text-green-400" : "text-blue-400"
        const usernameLabel = isOwnMessage ? `${message.username} (you)` : message.username

        const timeString = new Date(message.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })

        return (
          <div
            key={message.id}
            className={`message-enter ${bgColor} rounded-lg p-3 border ${borderColor} font-mono`}
            data-timestamp={message.timestamp}
          >
            <div className="flex justify-between items-start mb-1">
              <span className={`text-sm font-medium ${usernameColor}`}>{escapeHtml(usernameLabel)}</span>
              <span className="text-xs text-gray-500">{timeString}</span>
            </div>
            <div className="text-gray-200 break-words">{escapeHtml(message.text)}</div>
          </div>
        )
      })}
      <div ref={messagesEndRef} />
    </div>
  )
}
