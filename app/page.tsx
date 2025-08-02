"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Settings, Share2, BarChart2 } from "lucide-react" // Added BarChart2 icon
import UsernameModal from "@/components/username-modal"
import MessageList from "@/components/message-list"
import ConnectionStatus from "@/components/connection-status"
import OnlineUsers from "@/components/online-users"
import ShareRoomModal from "@/components/share-room-modal"
import StatsModal from "@/components/stats-modal" // Import the new StatsModal
import { useRoomGunPresence } from "@/hooks/use-room-gun-presence"

// Type Definitions
interface Message {
  text: string
  username: string
  timestamp: number
  id: string
}

interface RoomKeys {
  pub: string
  priv: string
  epub: string
  epriv: string
}

declare global {
  interface Window {
    Gun: any
    SEA: any
  }
}

export default function GunChat() {
  // Main States
  const [gun, setGun] = useState<any>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [roomKeys, setRoomKeys] = useState<RoomKeys | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [username, setUsername] = useState<string>("")
  const [messageText, setMessageText] = useState<string>("")
  const [shareUrl, setShareUrl] = useState<string>("")
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [showUsernameModal, setShowUsernameModal] = useState<boolean>(false)
  const [showShareModal, setShowShareModal] = useState<boolean>(false)
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false) // New state for stats modal
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")

  // Statistics states
  const [totalChatsCreated, setTotalChatsCreated] = useState<number>(0)
  const [totalMessagesSent, setTotalMessagesSent] = useState<number>(0)

  // Refs
  const messagesRef = useRef<any>(null)
  const processedMessages = useRef<Set<string>>(new Set())
  const gunLoadedRef = useRef<boolean>(false)

  // Hook for room online presence
  const roomOnlineUsers = useRoomGunPresence(gun, roomId, username, isConnected)

  // Loading GunDB libraries
  useEffect(() => {
    const loadGunDB = async () => {
      try {
        if (gunLoadedRef.current) return
        gunLoadedRef.current = true

        if (typeof window !== "undefined" && window.Gun && window.SEA) {
          console.log("DEBUG: GunDB and SEA already loaded. Initializing app.")
          await initializeApp()
          return
        }

        console.log("DEBUG: Loading Gun.js script...")
        await loadScript("https://cdn.jsdelivr.net/npm/gun/gun.js")
        console.log("DEBUG: Loading SEA.js script...")
        await loadScript("https://cdn.jsdelivr.net/npm/gun/sea.js")

        await new Promise((resolve) => setTimeout(resolve, 500))

        if (!window.Gun || !window.SEA) {
          throw new Error("Failed to load GunDB libraries")
        }
        console.log("DEBUG: GunDB and SEA loaded successfully.")
        await initializeApp()
      } catch (error) {
        console.error("DEBUG: Error loading GunDB:", error)
        setError("Error loading the application. Please reload the page.")
        setIsLoading(false)
      }
    }

    loadGunDB()
  }, [])

  // Function to load external scripts
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${src}"]`)
      if (existingScript) {
        console.log(`DEBUG: Script ${src} already present.`)
        resolve()
        return
      }

      const script = document.createElement("script")
      script.src = src
      script.async = true
      script.crossOrigin = "anonymous"

      script.onload = () => {
        console.log(`DEBUG: Script ${src} loaded.`)
        resolve()
      }
      script.onerror = (error) => {
        console.error(`DEBUG: Error loading ${src}:`, error)
        reject(new Error(`Failed to load ${src}`))
      }

      document.head.appendChild(script)
    })
  }

  // Application Initialization
  const initializeApp = async () => {
    try {
      const gunInstance = window.Gun(["https://relay.shogun-eco.xyz/gun"])

      gunInstance.on("hi", () => {
        console.log("DEBUG: Connected to GunDB relay")
        setIsConnected(true)
      })

      gunInstance.on("bye", () => {
        console.log("DEBUG: Disconnected from GunDB relay")
        setIsConnected(false)
      })

      setGun(gunInstance)

      const savedUsername = localStorage.getItem("gunchat-username")
      if (savedUsername && savedUsername.trim()) {
        setUsername(savedUsername)
        console.log("DEBUG: Username loaded from localStorage:", savedUsername)
      } else {
        setShowUsernameModal(true)
        console.log("DEBUG: Username not found, showing modal.")
      }

      console.log("DEBUG: Starting URL parsing and room setup.")
      await parseUrlAndSetupRoom(gunInstance)
      setIsLoading(false)
      console.log("DEBUG: App initialization complete.")
    } catch (error) {
      console.error("DEBUG: Error during initialization:", error)
      setError("Error initializing the application")
      setIsLoading(false)
    }
  }

  // Listen for global statistics
  useEffect(() => {
    if (gun) {
      const statsNode = gun.get("protocol_stats")

      statsNode.get("totalChatsCreated").on((data: number) => {
        setTotalChatsCreated(data || 0)
      })
      statsNode.get("totalMessagesSent").on((data: number) => {
        setTotalMessagesSent(data || 0)
      })

      return () => {
        // Clean up listeners when component unmounts
        statsNode.get("totalChatsCreated").off()
        statsNode.get("totalMessagesSent").off()
      }
    }
  }, [gun])

  const parseUrlAndSetupRoom = async (gunInstance: any) => {
    try {
      const hash = window.location.hash.substring(1)
      console.log("DEBUG: parseUrlAndSetupRoom - Full hash from URL:", hash)

      if (hash && hash.includes("@")) {
        const parts = hash.split("@")
        let roomIdFromUrl = parts[0]
        let encodedKeys = parts[1]

        if (parts.length > 2) {
          roomIdFromUrl = parts[0]
          encodedKeys = parts.slice(1).join("@")
          console.warn("DEBUG: Multiple '@' found in hash. Taking first part as room ID.")
        } else if (parts.length === 1) {
          console.warn("DEBUG: Hash contains '@' but split resulted in only one part. Treating as new room.")
          await createNewRoom(gunInstance)
          return
        }

        console.log("DEBUG: parseUrlAndSetupRoom - Parsed roomIdFromUrl:", roomIdFromUrl)
        console.log("DEBUG: parseUrlAndSetupRoom - Parsed encodedKeys:", encodedKeys)

        try {
          const keysJson = decodeURIComponent(encodedKeys)
          const keys = JSON.parse(keysJson)

          setRoomId(roomIdFromUrl)
          setRoomKeys(keys)
          updateShareUrl(roomIdFromUrl, keys)
          setupChat(gunInstance, roomIdFromUrl, keys)
        } catch (error) {
          console.error("DEBUG: Error decoding or parsing keys:", error)
          setError("Invalid room URL. Creating a new room.")
          await createNewRoom(gunInstance)
        }
      } else {
        console.log("DEBUG: No '@' found in hash or empty hash. Creating new room.")
        await createNewRoom(gunInstance)
      }
    } catch (error) {
      console.error("DEBUG: Error parsing URL:", error)
      setError("Error parsing URL. Creating a new room.")
      await createNewRoom(gunInstance)
    }
  }

  const createNewRoom = async (gunInstance: any) => {
    try {
      const newRoomId = generateRoomId()
      const newKeys = await window.SEA.pair()

      setRoomId(newRoomId)
      setRoomKeys(newKeys)

      const encodedKeys = encodeURIComponent(JSON.stringify(newKeys))
      const newUrl = `${window.location.origin}${window.location.pathname}#${newRoomId}@${encodedKeys}`
      window.history.replaceState({}, "", newUrl)
      console.log("DEBUG: createNewRoom - New URL set:", newUrl)
      console.log("DEBUG: createNewRoom - New Room ID:", newRoomId)

      updateShareUrl(newRoomId, newKeys)
      setupChat(gunInstance, newRoomId, newKeys)

      // Increment total chats created
      if (gunInstance) {
        gunInstance
          .get("protocol_stats")
          .get("totalChatsCreated")
          .once((data: number) => {
            const currentCount = data || 0
            gunInstance
              .get("protocol_stats")
              .get("totalChatsCreated")
              .put(currentCount + 1)
          })
      }
    } catch (error) {
      console.error("DEBUG: Error creating room:", error)
      setError("Error creating room")
    }
  }

  const setupChat = (gunInstance: any, roomIdParam: string, keysParam: RoomKeys) => {
    console.log("DEBUG: setupChat - Initializing chat for roomId:", roomIdParam)
    try {
      messagesRef.current = gunInstance.get(`chat_${roomIdParam}`)

      messagesRef.current.map().on(async (encryptedData: string, key: string) => {
        console.log("DEBUG: Processing message with key:", key)
        if (processedMessages.current.has(key)) return

        if (encryptedData && typeof encryptedData === "string") {
          try {
            const decryptedMessage = await window.SEA.decrypt(encryptedData, keysParam)

            if (decryptedMessage) {
              processedMessages.current.add(key)

              let messageObj: Message
              if (typeof decryptedMessage === "string") {
                try {
                  messageObj = JSON.parse(decryptedMessage)
                } catch {
                  messageObj = {
                    text: decryptedMessage,
                    username: "Anonymous",
                    timestamp: Date.now(),
                    id: key,
                  }
                }
              } else {
                messageObj = decryptedMessage as Message
              }

              if (messageObj && messageObj.text && messageObj.username) {
                setMessages((prev) => {
                  const exists = prev.some((msg) => msg.id === messageObj.id)
                  if (exists) return prev

                  const newMessages = [...prev, messageObj]
                  return newMessages.sort((a, b) => a.timestamp - b.timestamp)
                })
              }
            }
          } catch (error) {
            console.error("DEBUG: Decryption error:", error)
          }
        }
      })
    } catch (error) {
      console.error("DEBUG: Error setting up chat:", error)
    }
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !messagesRef.current || !roomKeys || !username) return

    try {
      const messageObj: Message = {
        text: messageText.trim(),
        username: username,
        timestamp: Date.now(),
        id: generateMessageId(),
      }

      const encryptedMessage = await window.SEA.encrypt(JSON.stringify(messageObj), roomKeys)
      messagesRef.current.set(encryptedMessage)

      setMessageText("")

      // Increment total messages sent
      if (gun) {
        gun
          .get("protocol_stats")
          .get("totalMessagesSent")
          .once((data: number) => {
            const currentCount = data || 0
            gun
              .get("protocol_stats")
              .get("totalMessagesSent")
              .put(currentCount + 1)
          })
      }
    } catch (error) {
      console.error("DEBUG: Error sending message:", error)
      setError("Error sending message")
    }
  }

  const generateRoomId = () => {
    return "room_" + Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  const generateMessageId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  const updateShareUrl = (roomIdParam: string, keysParam: RoomKeys) => {
    const encodedKeys = encodeURIComponent(JSON.stringify(keysParam))
    const url = `${window.location.origin}${window.location.pathname}#${roomIdParam}@${encodedKeys}`
    setShareUrl(url)
  }

  const handleUsernameSubmit = (newUsername: string) => {
    setUsername(newUsername)
    localStorage.setItem("gunchat-username", newUsername)
    setShowUsernameModal(false)
  }

  const changeUsername = () => {
    setShowUsernameModal(true)
  }

  const retryConnection = () => {
    setError("")
    setIsLoading(true)
    gunLoadedRef.current = false
    window.location.reload()
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-96 bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button onClick={retryConnection} className="bg-green-600 hover:bg-green-700">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading GunChat...</p>
          <p className="text-gray-500 text-sm mt-2">Connecting to the decentralized network</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-mono">
      <div className="container mx-auto max-w-4xl h-screen flex flex-col border-x border-gray-700">
        {/* Header */}
        <header className="bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-green-400">Eph</h1>
            <ConnectionStatus isConnected={isConnected} />
          </div>
          <div className="flex items-center space-x-2">
            {/* Button for users in the room */}
            <OnlineUsers users={roomOnlineUsers} currentUsername={username} />
            {/* New button for global stats */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStatsModal(true)}
              className="text-gray-400 hover:text-white"
              title="View protocol statistics"
            >
              <BarChart2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={changeUsername} className="text-gray-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShareModal(true)}
              className="text-gray-400 hover:text-white"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <MessageList messages={messages} currentUsername={username} />
        </div>

        {/* Message Input */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="flex space-x-3">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Write a message..."
              className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500"
              maxLength={500}
              disabled={!username}
            />
            <Button
              onClick={sendMessage}
              disabled={!messageText.trim() || !username}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="mt-2 text-xs text-gray-500">{messageText.length}/500 characters</div>
        </div>
      </div>

      {/* Modals */}
      <UsernameModal isOpen={showUsernameModal} onSubmit={handleUsernameSubmit} currentUsername={username} />
      <ShareRoomModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} shareUrl={shareUrl} />
      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        totalChatsCreated={totalChatsCreated}
        totalMessagesSent={totalMessagesSent}
      />
    </div>
  )
}
