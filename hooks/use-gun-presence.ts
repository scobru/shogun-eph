"use client"

import { useState, useEffect, useRef } from "react"

interface UserPresence {
  username: string
  lastSeen: number
  isOnline: boolean
}

const HEARTBEAT_INTERVAL = 5000 // Send heartbeat every 5 seconds
const OFFLINE_THRESHOLD = 15000 // Consider offline if not seen for 15 seconds

export function useRoomGunPresence(gun: any, roomId: string | null, currentUsername: string, isConnected: boolean) {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  const presenceRef = useRef<any>(null)
  const usersMap = useRef<Map<string, UserPresence>>(new Map())
  const heartbeatIntervalId = useRef<NodeJS.Timeout | null>(null)
  const checkOfflineIntervalId = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!gun || !roomId || !currentUsername || !isConnected) {
      // Clean up intervals if not connected or missing necessary data
      if (heartbeatIntervalId.current) clearInterval(heartbeatIntervalId.current)
      if (checkOfflineIntervalId.current) clearInterval(checkOfflineIntervalId.current)
      setOnlineUsers([])
      usersMap.current.clear()
      return
    }

    presenceRef.current = gun.get(`room_presence_${roomId}`)

    // 1. Send heartbeat
    const sendHeartbeat = () => {
      if (currentUsername) {
        presenceRef.current.get(currentUsername).put({ lastSeen: Date.now() })
      }
    }

    // Send the first heartbeat immediately
    sendHeartbeat()
    // Then send periodically
    if (heartbeatIntervalId.current) clearInterval(heartbeatIntervalId.current)
    heartbeatIntervalId.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)

    // 2. Listen for other users' presence
    presenceRef.current.map().on((data: { lastSeen: number }, usernameKey: string) => {
      if (data && typeof data.lastSeen === "number") {
        usersMap.current.set(usernameKey, {
          username: usernameKey,
          lastSeen: data.lastSeen,
          isOnline: true, // Assume online at the time of update
        })
        // Update state for rendering
        updateOnlineUsersState()
      }
    })

    // 3. Check for offline users
    const checkOfflineUsers = () => {
      const now = Date.now()
      let updated = false
      usersMap.current.forEach((user, usernameKey) => {
        const isCurrentlyOnline = now - user.lastSeen < OFFLINE_THRESHOLD
        if (user.isOnline !== isCurrentlyOnline) {
          usersMap.current.set(usernameKey, { ...user, isOnline: isCurrentlyOnline })
          updated = true
        }
      })
      if (updated) {
        updateOnlineUsersState()
      }
    }

    if (checkOfflineIntervalId.current) clearInterval(checkOfflineIntervalId.current)
    checkOfflineIntervalId.current = setInterval(checkOfflineUsers, HEARTBEAT_INTERVAL / 2) // Check more frequently

    // Function to update React state
    const updateOnlineUsersState = () => {
      const sortedUsers = Array.from(usersMap.current.values()).sort((a, b) => {
        // Put current user at the top
        if (a.username === currentUsername) return -1
        if (b.username === currentUsername) return 1
        // Then online, then offline
        if (a.isOnline && !b.isOnline) return -1
        if (!a.isOnline && b.isOnline) return 1
        // Sort alphabetically
        return a.username.localeCompare(b.username)
      })
      setOnlineUsers(sortedUsers)
    }

    // Cleanup when component unmounts or dependencies change
    return () => {
      if (heartbeatIntervalId.current) clearInterval(heartbeatIntervalId.current)
      if (checkOfflineIntervalId.current) clearInterval(checkOfflineIntervalId.current)
      if (presenceRef.current) {
        // Optional: signal offline when disconnecting
        // presenceRef.current.get(currentUsername).put({ lastSeen: Date.now(), isOnline: false });
        presenceRef.current.off() // Remove listener
      }
      usersMap.current.clear()
      setOnlineUsers([])
    }
  }, [gun, roomId, currentUsername, isConnected])

  return onlineUsers
}
