"use client";

import { useEffect, useState } from "react";

interface ConnectionStatusProps {
  isConnected: boolean;
}

export default function ConnectionStatus({
  isConnected,
}: ConnectionStatusProps) {
  const [statusText, setStatusText] = useState("Connecting...");
  const [dotColor, setDotColor] = useState("bg-yellow-500");
  const [textColor, setTextColor] = useState("text-gray-400");
  const [pulseClass, setPulseClass] = useState("pulse-green");

  useEffect(() => {
    if (isConnected) {
      setStatusText("Connected");
      setDotColor("bg-green-500");
      setTextColor("text-green-400");
      setPulseClass(""); // Remove animation when connected
    } else {
      setStatusText("Disconnected");
      setDotColor("bg-red-500");
      setTextColor("text-red-400");
      setPulseClass(""); // Remove animation when disconnected
    }
  }, [isConnected]);

  return (
    <div className="flex items-center space-x-1">
      <div className={`w-1.5 h-1.5 rounded-full ${dotColor} ${pulseClass}`} title={statusText}></div>
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .pulse-green {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
