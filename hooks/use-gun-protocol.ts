import { useState, useEffect, useRef, useCallback } from "react";
import {
  Eph,
  createEph,
  getEph,
  resetEph,
  type Message,
  type RoomKeys,
  type ChatRoom,
  type UserPresence,
  type PublishedRoom,
  type PublishRoomData,
} from "@/lib/gun-protocol";

interface UseEphConfig {
  relayUrl: string;
  onError?: (error: string) => void;
}

interface UseEphReturn {
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Room state
  currentRoom: ChatRoom | null;
  roomId: string | null;
  roomKeys: RoomKeys | null;

  // Messages
  messages: Message[];
  sendMessage: (text: string, username: string) => Promise<void>;

  // Presence
  onlineUsers: UserPresence[];

  // Room management
  createNewRoom: () => Promise<void>;
  joinRoom: (roomId: string, keys: RoomKeys) => void;
  generateRoomUrl: (roomId: string, keys: RoomKeys) => string;
  parseRoomFromUrl: (hash: string) => { roomId: string; keys: RoomKeys } | null;

  // Public room publishing
  publishedRooms: PublishedRoom[];
  publishRoom: (data: PublishRoomData) => Promise<void>;
  removePublishedRoom: (roomId: string) => Promise<void>;
  listenToPublishedRooms: () => () => void;

  // Utility
  retryConnection: () => void;
  listenToPresence: (roomId: string, username: string) => () => void;
}

export function useEph(config: UseEphConfig): UseEphReturn {
  // States
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomKeys, setRoomKeys] = useState<RoomKeys | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [publishedRooms, setPublishedRooms] = useState<PublishedRoom[]>([]);

  // Refs
  const protocolRef = useRef<Eph | null>(null);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  // Initialize protocol - solo una volta
  useEffect(() => {
    if (isInitializedRef.current) return;

    const initializeProtocol = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get or create protocol instance
        let protocol = getEph();
        if (!protocol) {
          protocol = createEph({
            relayUrl: config.relayUrl,
            onConnectionChange: setIsConnected,
            onError: (error) => {
              setError(error);
              config.onError?.(error);
            },
          });
        }

        protocolRef.current = protocol;

        // Initialize the protocol
        await protocol.initialize();

        setIsLoading(false);
        isInitializedRef.current = true;
      } catch (error) {
        console.error("Error initializing Eph:", error);
        setError("Failed to initialize connection");
        setIsLoading(false);
      }
    };

    initializeProtocol();

    // Cleanup on unmount
    return () => {
      cleanupFunctionsRef.current.forEach((cleanup) => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, [config.relayUrl, config.onError]);

  // Listen to presence
  const listenToPresence = useCallback((roomId: string, username: string) => {
    if (!protocolRef.current || !username || !isInitializedRef.current)
      return () => {};

    const cleanup = protocolRef.current.listenToPresence(
      roomId,
      username,
      (users) => {
        setOnlineUsers(users);
      }
    );

    return cleanup;
  }, []);

  // Listen to published rooms
  const listenToPublishedRooms = useCallback(() => {
    if (!protocolRef.current || !isInitializedRef.current) return () => {};

    const cleanup = protocolRef.current.listenToPublishedRooms((rooms) => {
      setPublishedRooms(rooms);
    });

    return cleanup;
  }, []);

  // Parse room from URL
  const parseRoomFromUrl = useCallback((hash: string) => {
    if (!protocolRef.current || !isInitializedRef.current) return null;
    return protocolRef.current.parseRoomFromUrl(hash);
  }, []);

  // Generate room URL
  const generateRoomUrl = useCallback((roomId: string, keys: RoomKeys) => {
    if (!protocolRef.current || !isInitializedRef.current) return "";
    return protocolRef.current.generateRoomUrl(roomId, keys);
  }, []);

  // Retry connection
  const retryConnection = useCallback(() => {
    setError(null);
    setIsLoading(true);
    isInitializedRef.current = false;

    // Cleanup current protocol
    if (protocolRef.current) {
      protocolRef.current.destroy();
      protocolRef.current = null;
    }

    // Clear all cleanup functions
    cleanupFunctionsRef.current.forEach((cleanup) => cleanup());
    cleanupFunctionsRef.current = [];

    // Reset states
    setCurrentRoom(null);
    setRoomId(null);
    setRoomKeys(null);
    setMessages([]);
    setOnlineUsers([]);
    processedMessagesRef.current.clear();

    // Reset global protocol instance
    resetEph();

    // Reload page to reinitialize
    window.location.reload();
  }, []);

  return {
    // Connection state
    isConnected,
    isLoading,
    error,

    // Room state
    currentRoom,
    roomId,
    roomKeys,

    // Messages
    messages,
    sendMessage: async (text: string, username: string) => {
      if (!currentRoom || !text.trim() || !username) return;

      try {
        await protocolRef.current!.sendMessage(currentRoom, {
          text: text.trim(),
          username,
        });
      } catch (error) {
        console.error("Error sending message:", error);
        setError("Failed to send message");
      }
    },

    // Presence
    onlineUsers,

    // Room management
    createNewRoom: async () => {
      if (!protocolRef.current || !isInitializedRef.current) return;

      try {
        const room = await protocolRef.current.createRoom();

        setCurrentRoom(room);
        setRoomId(room.id);
        setRoomKeys(room.keys);
        setMessages([]);
        processedMessagesRef.current.clear();

        // Update URL
        const newUrl = protocolRef.current.generateRoomUrl(room.id, room.keys);
        window.history.replaceState({}, "", newUrl);

        // Setup message listening
        const messageCleanup = protocolRef.current.listenToMessages(
          room,
          (message) => {
            setMessages((prev) => {
              const exists = prev.some((msg) => msg.id === message.id);
              if (exists) return prev;

              const newMessages = [...prev, message];
              return newMessages.sort((a, b) => a.timestamp - b.timestamp);
            });
          },
          (error) => {
            console.error("Message error:", error);
          }
        );

        cleanupFunctionsRef.current.push(messageCleanup);
      } catch (error) {
        console.error("Error creating room:", error);
        setError("Failed to create room");
      }
    },
    joinRoom: (roomId: string, keys: RoomKeys) => {
      if (!protocolRef.current || !isInitializedRef.current) return;

      try {
        const room = protocolRef.current.setupRoom(roomId, keys);

        setCurrentRoom(room);
        setRoomId(room.id);
        setRoomKeys(room.keys);
        setMessages([]);
        processedMessagesRef.current.clear();

        // Setup message listening
        const messageCleanup = protocolRef.current.listenToMessages(
          room,
          (message) => {
            setMessages((prev) => {
              const exists = prev.some((msg) => msg.id === message.id);
              if (exists) return prev;

              const newMessages = [...prev, message];
              return newMessages.sort((a, b) => a.timestamp - b.timestamp);
            });
          },
          (error) => {
            console.error("Message error:", error);
          }
        );

        cleanupFunctionsRef.current.push(messageCleanup);
      } catch (error) {
        console.error("Error joining room:", error);
        setError("Failed to join room");
      }
    },
    generateRoomUrl,
    parseRoomFromUrl,

    // Public room publishing
    publishedRooms,
    publishRoom: async (data: PublishRoomData) => {
      if (!protocolRef.current || !isInitializedRef.current) return;
      try {
        await protocolRef.current.publishRoom(data);
      } catch (error) {
        console.error("Error publishing room:", error);
        setError("Failed to publish room");
      }
    },
    removePublishedRoom: async (roomId: string) => {
      if (!protocolRef.current || !isInitializedRef.current) return;
      try {
        await protocolRef.current.removePublishedRoom(roomId);
      } catch (error) {
        console.error("Error removing published room:", error);
        setError("Failed to remove published room");
      }
    },
    listenToPublishedRooms: listenToPublishedRooms,

    // Utility
    retryConnection,
    listenToPresence,
  };
}
