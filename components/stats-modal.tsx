"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"

interface StatsModalProps {
  isOpen: boolean
  onClose: () => void
  totalChatsCreated: number
  totalMessagesSent: number
}

export default function StatsModal({ isOpen, onClose, totalChatsCreated, totalMessagesSent }: StatsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 animate-slideDown">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl text-green-400 font-mono">📊 Protocol Statistics</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-4 text-gray-300 font-mono">
            <div className="flex justify-between items-center p-2 bg-gray-700 rounded-md">
              <span>Total Chats Created:</span>
              <span className="text-green-400 font-bold text-lg">{totalChatsCreated}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-700 rounded-md">
              <span>Total Messages Sent:</span>
              <span className="text-green-400 font-bold text-lg">{totalMessagesSent}</span>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              These statistics are global and reflect the activity across the decentralized GunDB network for this
              application.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
