"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"

interface UsernameModalProps {
  isOpen: boolean
  onSubmit: (username: string) => void
  currentUsername: string
}

export default function UsernameModal({ isOpen, onSubmit, currentUsername }: UsernameModalProps) {
  const [inputValue, setInputValue] = useState(currentUsername || "")

  useEffect(() => {
    if (isOpen) {
      setInputValue(currentUsername || "")
    }
  }, [isOpen, currentUsername])

  const handleSubmit = () => {
    const trimmedValue = inputValue.trim()
    onSubmit(trimmedValue || "Anonymous")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 animate-slideDown">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl text-green-400 font-mono">🔒 GunChat</CardTitle>
          {/* Do not show close button if username is mandatory */}
          {currentUsername && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSubmit(currentUsername)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-center mb-6">
            <p className="text-gray-300 font-mono">Choose your username to start</p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="usernameInput" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                Username (optional)
              </label>
              <Input
                id="usernameInput"
                placeholder="e.g. Alice, Bob, Anonymous..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSubmit()
                  }
                }}
                className="w-full bg-gray-700 border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500 font-mono"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1 font-mono">Leave empty to remain anonymous</p>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-medium transition-colors focus:ring-2 focus:ring-green-500 font-mono"
            >
              Enter Chat
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
