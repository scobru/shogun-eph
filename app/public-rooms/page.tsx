"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Clock, Search, ExternalLink } from "lucide-react";
import { useEph } from "@/hooks/use-gun-protocol";
import Link from "next/link";

export default function PublicRoomsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const hasSetupRef = useRef(false);

  const {
    isConnected,
    isLoading: protocolLoading,
    error,
    publishedRooms,
    listenToPublishedRooms,
    retryConnection,
  } = useEph({
    relayUrl: "https://relay.shogun-eco.xyz/gun",
    onError: (error) => {
      console.error("Protocol error:", error);
    },
  });

  // Listen to published rooms when connected - only once
  useEffect(() => {
    if (isConnected && !protocolLoading && !hasSetupRef.current) {
      const cleanup = listenToPublishedRooms();
      setIsLoading(false);
      hasSetupRef.current = true;
      return cleanup;
    }
  }, [isConnected, protocolLoading, listenToPublishedRooms]);

  // Filter rooms based on search term
  const filteredRooms = publishedRooms.filter(
    (room) =>
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (room.description &&
        room.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

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

  // Loading state
  if (isLoading || protocolLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading public rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-mono">
      <div className="container mx-auto max-w-6xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Chat
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-green-400">Public Rooms</h1>
          </div>
          <div className="text-sm text-gray-500">
            {isConnected ? (
              <span className="text-green-400">● Connected</span>
            ) : (
              <span className="text-red-400">● Disconnected</span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Rooms Table */}
        {filteredRooms.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 text-4xl mb-4">🏠</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchTerm ? "No rooms found" : "No public rooms yet"}
              </h3>
              <p className="text-gray-400">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Be the first to create a public room!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-gray-700">
                  <TableHead className="text-gray-300 font-semibold">Room Name</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Description</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Created</TableHead>
                  <TableHead className="text-gray-300 font-semibold">Created By</TableHead>
                  <TableHead className="text-gray-300 font-semibold text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRooms.map((room) => (
                  <TableRow key={room.id} className="border-gray-700 hover:bg-gray-700">
                    <TableCell className="font-medium text-white">
                      {room.name}
                    </TableCell>
                    <TableCell className="text-gray-400 max-w-xs truncate">
                      {room.description || "No description"}
                    </TableCell>
                    <TableCell className="text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(room.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{room.createdBy}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        asChild
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <a
                          href={room.roomUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Join
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Room Count */}
        <div className="mt-6 text-center text-sm text-gray-500">
          {filteredRooms.length} room{filteredRooms.length !== 1 ? "s" : ""}{" "}
          found
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      </div>
    </div>
  );
}
