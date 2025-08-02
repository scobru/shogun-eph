"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, X } from "lucide-react"
import { useState, useEffect } from "react"

interface ShareRoomModalProps {
  isOpen: boolean
  onClose: () => void
  shareUrl: string
}

export default function ShareRoomModal({ isOpen, onClose, shareUrl }: ShareRoomModalProps) {
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isCopied])

  const handleCopyClick = () => {
    navigator.clipboard.writeText(shareUrl)
    setIsCopied(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 animate-slideDown">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl text-green-400 font-mono">🔗 Share Room</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-4">
            <div>
              <label htmlFor="shareUrl" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                Share Link:
              </label>
              <div className="flex items-center">
                <Input
                  id="shareUrl"
                  className="flex-1 bg-gray-700 border-gray-600 rounded-l-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500 font-mono"
                  value={shareUrl}
                  readOnly
                />
                <Button
                  onClick={handleCopyClick}
                  className="bg-green-600 hover:bg-green-700 rounded-r-lg font-medium transition-colors focus:ring-2 focus:ring-green-500 font-mono"
                  disabled={isCopied}
                >
                  {isCopied ? "Copied!" : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 font-mono">Share this link to invite other users to this room.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
