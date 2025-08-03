"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, X, Globe, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useEph } from "@/hooks/use-gun-protocol";

interface ShareRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  roomId?: string;
  username?: string;
}

export default function ShareRoomModal({
  isOpen,
  onClose,
  shareUrl,
  roomId,
  username,
}: ShareRoomModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [showPublishForm, setShowPublishForm] = useState(false);

  const { publishRoom } = useEph({
    relayUrl: "https://relay.shogun-eco.xyz/gun",
    onError: (error) => {
      console.error("Protocol error:", error);
    },
  });

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  useEffect(() => {
    if (isPublished) {
      const timer = setTimeout(() => {
        setIsPublished(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isPublished]);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
  };

  const handlePublish = async () => {
    if (!roomName.trim() || !username || !roomId) return;

    setIsPublishing(true);
    try {
      await publishRoom({
        name: roomName.trim(),
        description: roomDescription.trim() || undefined,
        roomUrl: shareUrl,
        createdBy: username,
      });
      setIsPublished(true);
      setShowPublishForm(false);
      setRoomName("");
      setRoomDescription("");
    } catch (error) {
      console.error("Error publishing room:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 animate-slideDown">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl text-green-400 font-mono">
            🔗 Share Room
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-4">
            {/* Share Link Section */}
            <div>
              <label
                htmlFor="shareUrl"
                className="block text-sm font-medium text-gray-300 mb-2 font-mono"
              >
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
                  {isCopied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Publish Section */}
            {!showPublishForm ? (
              <div className="pt-2 border-t border-gray-700">
                <Button
                  onClick={() => setShowPublishForm(true)}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white font-mono"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Publish Publicly
                </Button>
                <p className="text-xs text-gray-500 font-mono mt-2">
                  Make this room discoverable by other users
                </p>
              </div>
            ) : (
              <div className="pt-2 border-t border-gray-700 space-y-3">
                <div>
                  <label
                    htmlFor="roomName"
                    className="block text-sm font-medium text-gray-300 mb-2 font-mono"
                  >
                    Room Name *
                  </label>
                  <Input
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Enter room name..."
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500 font-mono"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label
                    htmlFor="roomDescription"
                    className="block text-sm font-medium text-gray-300 mb-2 font-mono"
                  >
                    Description (optional)
                  </label>
                  <Textarea
                    id="roomDescription"
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    placeholder="Describe what this room is about..."
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500 font-mono resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {roomDescription.length}/200 characters
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => setShowPublishForm(false)}
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white font-mono"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePublish}
                    disabled={!roomName.trim() || isPublishing}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 font-mono"
                  >
                    {isPublishing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : isPublished ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Published!
                      </>
                    ) : (
                      "Publish"
                    )}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 font-mono">
              Share this link to invite other users to this room.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
