"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Settings, Share2, Globe } from "lucide-react";
import UsernameModal from "@/components/username-modal";
import MessageList from "@/components/message-list";
import ConnectionStatus from "@/components/connection-status";
import OnlineUsers from "@/components/online-users";
import ShareRoomModal from "@/components/share-room-modal";
import { useEph } from "@/hooks/use-gun-protocol";

export default function GunChat() {
  // UI States
  const [messageText, setMessageText] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [showUsernameModal, setShowUsernameModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Gun Protocol hook
  const {
    isConnected,
    isLoading,
    error,
    roomId,
    roomKeys,
    messages,
    sendMessage,
    onlineUsers,
    createNewRoom,
    joinRoom,
    generateRoomUrl,
    parseRoomFromUrl,
    retryConnection,
    listenToPresence,
  } = useEph({
    relayUrl: "https://relay.shogun-eco.xyz/gun",
    onError: (error) => {
      console.error("Protocol error:", error);
    },
  });

  // Username state - gestito dal protocollo per evitare flicker
  const [username, setUsername] = useState<string>("");
  const [isUsernameLoaded, setIsUsernameLoaded] = useState(false);

  // Refs per evitare loop infiniti
  const roomSetupRef = useRef(false);
  const presenceSetupRef = useRef(false);

  // Load username from localStorage - solo una volta
  useEffect(() => {
    if (isUsernameLoaded) return;

    const savedUsername = localStorage.getItem("gunchat-username");
    if (savedUsername && savedUsername.trim()) {
      setUsername(savedUsername);
    } else {
      setShowUsernameModal(true);
    }
    setIsUsernameLoaded(true);
  }, [isUsernameLoaded]);

  // Parse URL and setup room - solo quando il protocollo è pronto e una sola volta
  useEffect(() => {
    if (isLoading || !isUsernameLoaded || roomSetupRef.current) return;

    const hash = window.location.hash.substring(1);
    const roomData = parseRoomFromUrl(hash);

    if (roomData) {
      joinRoom(roomData.roomId, roomData.keys);
      updateShareUrl(roomData.roomId, roomData.keys);
    } else {
      createNewRoom().then(() => {
        if (roomId && roomKeys) {
          updateShareUrl(roomId, roomKeys);
        }
      });
    }

    roomSetupRef.current = true;
  }, [isLoading, isUsernameLoaded, parseRoomFromUrl, joinRoom, createNewRoom]);

  // Setup presence listening - solo quando tutto è pronto e una sola volta
  useEffect(() => {
    if (
      !roomId ||
      !username ||
      !isConnected ||
      !isUsernameLoaded ||
      presenceSetupRef.current
    )
      return;

    const cleanup = listenToPresence(roomId, username);
    presenceSetupRef.current = true;
    return cleanup;
  }, [roomId, username, isConnected, isUsernameLoaded, listenToPresence]);

  // Update share URL when room changes
  const updateShareUrl = useCallback(
    (roomIdParam: string, keysParam: any) => {
      const url = generateRoomUrl(roomIdParam, keysParam);
      setShareUrl(url);
    },
    [generateRoomUrl]
  );

  // Handle message sending
  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !username) return;

    await sendMessage(messageText, username);
    setMessageText("");
  }, [messageText, username, sendMessage]);

  // Handle username submission
  const handleUsernameSubmit = useCallback((newUsername: string) => {
    setUsername(newUsername);
    localStorage.setItem("gunchat-username", newUsername);
    setShowUsernameModal(false);
  }, []);

  // Handle username change
  const changeUsername = useCallback(() => {
    setShowUsernameModal(true);
  }, []);

  // Determina se mostrare il loading screen
  const shouldShowLoading =
    isLoading || !isUsernameLoaded || (!roomId && !error);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-96 bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">
              Connection Error
            </h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button
              onClick={retryConnection}
              className="bg-green-600 hover:bg-green-700"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state - consolidato per evitare flicker
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Eph...</p>
          <p className="text-gray-500 text-sm mt-2">
            Connecting to the decentralized network
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-mono flex flex-col">
      <div className="container mx-auto max-w-4xl h-screen flex flex-col border-x border-gray-700 flex-1">
        {/* Ultra Compact Header */}
        <header className="bg-gray-800  border-b border-gray-700 flex items-center justify-between h-12">
          <div className="flex items-center space-x-4">
            <h1 className="text-base font-bold text-green-400 mx-5">Eph</h1>
            <ConnectionStatus isConnected={isConnected} />
            <span className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
              {roomId ? roomId.replace("room_", "") : "loading..."}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <OnlineUsers users={onlineUsers} currentUsername={username} />
            <Button
              variant="ghost"
              size="sm"
              onClick={changeUsername}
              className="text-gray-400 hover:text-white h-6 w-6 p-0"
            >
              <Settings className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShareModal(true)}
              className="text-gray-400 hover:text-white h-6 w-6 p-0"
            >
              <Share2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-gray-400 hover:text-white h-6 w-6 p-0"
            >
              <a href="/public-rooms" title="Public Rooms">
                <Globe className="w-3 h-3" />
              </a>
            </Button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <MessageList messages={messages} currentUsername={username} />
        </div>

        {/* Message Input - Also optimized */}
        <div className="bg-gray-800 px-2 py-2 border-t border-gray-700">
          <div className="flex space-x-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500 h-8 text-sm"
              maxLength={500}
              disabled={!username}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || !username}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 h-8 w-8 p-0"
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {messageText.length}/500 characters
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-4 mt-auto">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center">
            <p className="text-gray-400 text-xs mb-1">
              <a
                href="https://github.com/scobru/shogun-eph"
                className="text-green-400 hover:text-green-300 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                repo
              </a>
              {" - "}
              built with ❤️ by {""}
              <a
                href="https://github.com/scobru"
                className="text-green-400 hover:text-green-300 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                scobru
              </a>
            </p>
            <p className="text-gray-500 text-xs">
              part of {""}
              <a
                href="https://shogun-eco.xyz"
                className="text-green-400 hover:text-green-300 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                shogun project
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <UsernameModal
        isOpen={showUsernameModal}
        onSubmit={handleUsernameSubmit}
        currentUsername={username}
      />
      <ShareRoomModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
        roomId={roomId || undefined}
        username={username}
      />
    </div>
  );
}
