// GunDB Protocol - Centralized GunDB operations
// This file abstracts all GunDB operations for the Eph chat application

// Type Definitions
export interface Message {
  text: string;
  username: string;
  timestamp: number;
  id: string;
}

export interface RoomKeys {
  pub: string;
  priv: string;
  epub: string;
  epriv: string;
}

export interface UserPresence {
  username: string;
  lastSeen: number;
  isOnline: boolean;
}

export interface EphConfig {
  relayUrl: string;
  onConnectionChange?: (isConnected: boolean) => void;
  onError?: (error: string) => void;
}

export interface ChatRoom {
  id: string;
  keys: RoomKeys;
  messagesRef: any;
}

// New interfaces for public room publishing
export interface PublishedRoom {
  id: string;
  name: string;
  description?: string;
  roomUrl: string;
  createdAt: number;
  createdBy: string;
  participantsCount?: number;
}

export interface PublishRoomData {
  name: string;
  description?: string;
  roomUrl: string;
  createdBy: string;
}

declare global {
  interface Window {
    Gun: any;
    SEA: any;
  }
}

export class Eph {
  private gun: any = null;
  private isInitialized = false;
  private config: EphConfig;
  private processedMessages = new Set<string>();
  private processedRooms = new Set<string>();
  private presenceRefs: Map<string, any> = new Map();
  private presenceUsers: Map<string, UserPresence> = new Map();

  constructor(config: EphConfig) {
    this.config = config;
  }

  /**
   * Initialize GunDB and load required libraries
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if GunDB is already loaded
      if (typeof window !== "undefined" && window.Gun && window.SEA) {
        console.log("DEBUG: GunDB and SEA already loaded");
        await this.setupGunInstance();
        this.isInitialized = true;
        return;
      }

      // Load GunDB libraries
      await this.loadScript("https://cdn.jsdelivr.net/npm/gun/gun.js");
      await this.loadScript("https://cdn.jsdelivr.net/npm/gun/sea.js");

      // Wait for libraries to be available
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!window.Gun || !window.SEA) {
        throw new Error("Failed to load GunDB libraries");
      }

      await this.setupGunInstance();
      this.isInitialized = true;
    } catch (error) {
      console.error("DEBUG: Error initializing Eph:", error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Load external script
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        console.log(`DEBUG: Script ${src} already present`);
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";

      script.onload = () => {
        console.log(`DEBUG: Script ${src} loaded`);
        resolve();
      };
      script.onerror = (error) => {
        console.error(`DEBUG: Error loading ${src}:`, error);
        reject(new Error(`Failed to load ${src}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Setup Gun instance with connection handlers
   */
  private setupGunInstance(): void {
    this.gun = window.Gun([this.config.relayUrl]);

    this.gun.on("hi", () => {
      console.log("DEBUG: Connected to GunDB relay");
      this.config.onConnectionChange?.(true);
    });

    this.gun.on("bye", () => {
      console.log("DEBUG: Disconnected from GunDB relay");
      this.config.onConnectionChange?.(false);
    });
  }

  /**
   * Get Gun instance
   */
  getGunInstance(): any {
    return this.gun;
  }

  /**
   * Create a new chat room
   */
  async createRoom(): Promise<ChatRoom> {
    if (!this.gun) throw new Error("GunDB not initialized");

    const roomId = this.generateRoomId();
    const keys = await window.SEA.pair();

    const messagesRef = this.gun.get(`chat_${roomId}`);

    return {
      id: roomId,
      keys,
      messagesRef,
    };
  }

  /**
   * Setup chat room from existing data
   */
  setupRoom(roomId: string, keys: RoomKeys): ChatRoom {
    if (!this.gun) throw new Error("GunDB not initialized");

    const messagesRef = this.gun.get(`chat_${roomId}`);

    return {
      id: roomId,
      keys,
      messagesRef,
    };
  }

  /**
   * Listen to messages in a chat room
   */
  listenToMessages(
    room: ChatRoom,
    onMessage: (message: Message) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!room.messagesRef) return () => {};

    const messageHandler = async (encryptedData: string, key: string) => {
      if (this.processedMessages.has(key)) return;

      if (encryptedData && typeof encryptedData === "string") {
        try {
          const decryptedMessage = await window.SEA.decrypt(
            encryptedData,
            room.keys
          );

          if (decryptedMessage) {
            this.processedMessages.add(key);

            let messageObj: Message;
            if (typeof decryptedMessage === "string") {
              try {
                messageObj = JSON.parse(decryptedMessage);
              } catch {
                messageObj = {
                  text: decryptedMessage,
                  username: "Anonymous",
                  timestamp: Date.now(),
                  id: key,
                };
              }
            } else {
              messageObj = decryptedMessage as Message;
            }

            if (messageObj && messageObj.text && messageObj.username) {
              onMessage(messageObj);
            }
          }
        } catch (error) {
          console.error("DEBUG: Decryption error:", error);
          onError?.(error as Error);
        }
      }
    };

    room.messagesRef.map().on(messageHandler);

    // Return cleanup function
    return () => {
      room.messagesRef.map().off(messageHandler);
    };
  }

  /**
   * Send a message to a chat room
   */
  async sendMessage(
    room: ChatRoom,
    message: Omit<Message, "id" | "timestamp">
  ): Promise<void> {
    if (!room.messagesRef || !room.keys) {
      throw new Error("Invalid room configuration");
    }

    const messageObj: Message = {
      ...message,
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };

    const encryptedMessage = await window.SEA.encrypt(
      JSON.stringify(messageObj),
      room.keys
    );
    room.messagesRef.set(encryptedMessage);
  }

  /**
   * Listen to user presence in a room
   */
  listenToPresence(
    roomId: string,
    username: string,
    onPresenceChange: (users: UserPresence[]) => void
  ): () => void {
    if (!this.gun) return () => {};

    const presenceRef = this.gun.get(`room_presence_${roomId}`);
    const userRef = presenceRef.get(username);

    // Set user as online
    userRef.put({ lastSeen: Date.now() });

    // Listen to all users in the room
    const presenceHandler = (data: { lastSeen: number }, key: string) => {
      if (key === username) return; // Skip self

      if (data && typeof data.lastSeen === "number") {
        this.presenceUsers.set(key, {
          username: key,
          lastSeen: data.lastSeen,
          isOnline: true,
        });
      }

      // Convert to array and filter online users
      const now = Date.now();
      const onlineUsers = Array.from(this.presenceUsers.values())
        .filter((user) => now - user.lastSeen < 30000) // 30 seconds timeout
        .map((user) => ({
          ...user,
          isOnline: now - user.lastSeen < 30000,
        }));

      onPresenceChange(onlineUsers);
    };

    presenceRef.map().on(presenceHandler);

    // Return cleanup function
    return () => {
      userRef.put(null); // Remove user from presence
      presenceRef.map().off(presenceHandler);
    };
  }

  /**
   * Parse room data from URL hash
   */
  parseRoomFromUrl(hash: string): { roomId: string; keys: RoomKeys } | null {
    if (!hash || !hash.includes("@")) return null;

    const parts = hash.split("@");
    let roomId = parts[0];
    let encodedKeys = parts[1];

    if (parts.length > 2) {
      roomId = parts[0];
      encodedKeys = parts.slice(1).join("@");
    } else if (parts.length === 1) {
      return null;
    }

    try {
      const keysJson = decodeURIComponent(encodedKeys);
      const keys = JSON.parse(keysJson);
      return { roomId, keys };
    } catch (error) {
      console.error("DEBUG: Error parsing room from URL:", error);
      return null;
    }
  }

  /**
   * Generate room URL
   */
  generateRoomUrl(roomId: string, keys: RoomKeys): string {
    const encodedKeys = encodeURIComponent(JSON.stringify(keys));
    return `${window.location.origin}${window.location.pathname}#${roomId}@${encodedKeys}`;
  }

  /**
   * Publish a room to the public directory
   */
  async publishRoom(data: PublishRoomData): Promise<void> {
    if (!this.gun) throw new Error("GunDB not initialized");

    const publicRoomsRef = this.gun.get("public_rooms");
    const roomId = this.generateRoomId();

    const publishedRoom: PublishedRoom = {
      id: roomId,
      name: data.name,
      description: data.description,
      roomUrl: data.roomUrl,
      createdAt: Date.now(),
      createdBy: data.createdBy,
    };

    publicRoomsRef.get(roomId).put(publishedRoom);
  }

  /**
   * Listen to published rooms
   */
  listenToPublishedRooms(
    onRoomsChange: (rooms: PublishedRoom[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!this.gun) return () => {};

    const publicRoomsRef = this.gun.get("public_rooms");
    const rooms = new Map<string, PublishedRoom>();

    const roomHandler = (roomData: PublishedRoom, roomId: string) => {
      // Prevent duplicate processing
      const roomKey = `${roomId}_${roomData?.createdAt || 0}`;
      if (this.processedRooms.has(roomKey)) return;

      if (roomData && roomData.name && roomData.roomUrl) {
        rooms.set(roomId, { ...roomData, id: roomId });
        this.processedRooms.add(roomKey);
      } else {
        rooms.delete(roomId);
      }

      // Convert to array and sort by creation date (newest first)
      const roomsArray = Array.from(rooms.values()).sort(
        (a, b) => b.createdAt - a.createdAt
      );

      onRoomsChange(roomsArray);
    };

    publicRoomsRef.map().on(roomHandler);

    // Return cleanup function
    return () => {
      publicRoomsRef.map().off(roomHandler);
    };
  }

  /**
   * Remove a published room
   */
  async removePublishedRoom(roomId: string): Promise<void> {
    if (!this.gun) throw new Error("GunDB not initialized");

    const publicRoomsRef = this.gun.get("public_rooms");
    publicRoomsRef.get(roomId).put(null);
  }

  /**
   * Generate a unique room ID
   */
  private generateRoomId(): string {
    return (
      "room_" + Date.now().toString(36) + Math.random().toString(36).substr(2)
    );
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.processedMessages.clear();
    this.processedRooms.clear();
    this.presenceRefs.clear();
    this.presenceUsers.clear();
    this.gun = null;
    this.isInitialized = false;
  }
}

// Export a singleton instance for easy use
let protocolInstance: Eph | null = null;
let isInitializing = false;

export const createEph = (config: EphConfig): Eph => {
  if (!protocolInstance) {
    protocolInstance = new Eph(config);
  }
  return protocolInstance;
};
export const getEph = (): Eph | null => {
  return protocolInstance;
};

export const resetEph = (): void => {
  if (protocolInstance) {
    protocolInstance.destroy();
    protocolInstance = null;
  }
  isInitializing = false;
};
