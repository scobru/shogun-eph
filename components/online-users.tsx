"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Users, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface UserPresence {
  username: string
  lastSeen: number
  isOnline: boolean
}

interface OnlineUsersProps {
  users: UserPresence[]
  currentUsername: string
}

export default function OnlineUsers({ users, currentUsername }: OnlineUsersProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const onlineCount = users.filter((u) => u.isOnline).length
  const sortedUsers = [...users].sort((a, b) => {
    // Put current user at the top
    if (a.username === currentUsername) return -1
    if (b.username === currentUsername) return 1
    // Then online, then offline
    if (a.isOnline && !b.isOnline) return -1
    if (!a.isOnline && b.isOnline) return 1
    // Sort alphabetically
    return a.username.localeCompare(b.username)
  })

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="text-gray-400 hover:text-white"
        title="View users in room"
      >
        <Users className="w-4 h-4 mr-1" />
        <span className="font-mono">{onlineCount}</span>
      </Button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl text-white font-mono">Users in Room ({onlineCount})</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {sortedUsers.length === 0 && (
                  <p className="text-gray-500 text-sm font-mono">No users in the room at the moment.</p>
                )}
                {sortedUsers.map((user) => (
                  <div
                    key={user.username}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <span className={`${user.isOnline ? "text-green-400" : "text-gray-500 line-through"}`}>
                      {user.username} {user.username === currentUsername && "(You)"}
                    </span>
                    {user.isOnline ? (
                      <Badge className="bg-green-600 text-white font-mono">Online</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-700 text-gray-400 font-mono">
                        Offline
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
