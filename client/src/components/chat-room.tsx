import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMessage } from "@shared/schema";
import { Send, TrendingUp, Clock, MessageSquare } from "lucide-react";

interface ChatMessageWithUser extends ChatMessage {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    profileImageUrl: string | null;
  };
}

export default function ChatRoom() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"request" | "offer" | "general">("general");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat messages
  const { data: messages = [], isLoading } = useQuery<ChatMessageWithUser[]>({
    queryKey: ["/api/chat/messages"],
    refetchInterval: 5000, // Refetch every 5 seconds as fallback
  });

  // WebSocket for real-time updates
  const { sendMessage } = useWebSocket("/ws", (message) => {
    if (message.type === "new_message") {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string; messageType: string }) => {
      await apiRequest("POST", "/api/chat/messages", messageData);
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      
      // Send WebSocket message for real-time updates
      if (user?.id) {
        sendMessage({
          type: "new_message",
          userId: user.id,
        });
      }

      toast({
        title: "Message sent",
        description: "Your message has been posted successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendMessageMutation.mutate({
      content: messageText,
      messageType,
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exchange Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Exchange Requests</CardTitle>
          <Badge variant="outline" className="bg-success-100 text-success-800 border-success-200">
            <div className="w-2 h-2 bg-success-500 rounded-full mr-1"></div>
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Chat Messages Area */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="chat-message">
                <div className="flex items-start space-x-3">
                  <img 
                    src={message.user.profileImageUrl || `https://ui-avatars.com/api/?name=${message.user.firstName || 'User'}&background=1565C0&color=fff`}
                    alt={message.user.firstName || 'User'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {message.user.firstName || 'User'}
                      </span>
                      <Badge 
                        variant={message.user.role === 'subscriber' ? 'default' : 'secondary'}
                        className={`text-xs ${
                          message.user.role === 'subscriber' 
                            ? 'bg-primary-100 text-primary-800' 
                            : 'bg-success-100 text-success-800'
                        }`}
                      >
                        {message.user.role}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.createdAt ? message.createdAt.toString() : '')}
                      </span>
                    </div>
                    <div className={`rounded-lg p-3 ${
                      message.messageType === 'request' 
                        ? 'bg-primary-50 border border-primary-200'
                        : message.messageType === 'offer'
                        ? 'bg-white border border-gray-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      {message.messageType === 'request' && (
                        <div className="flex items-center space-x-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-primary-600" />
                          <span className="font-medium text-primary-900">Exchange Request</span>
                        </div>
                      )}
                      {message.messageType === 'offer' && (
                        <div className="flex items-center space-x-2 mb-2">
                          <Clock className="w-4 h-4 text-success-600" />
                          <span className="font-medium text-success-900">Rate Offer</span>
                        </div>
                      )}
                      <p className="text-gray-700">{message.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="messageType" 
                  value="general"
                  checked={messageType === "general"}
                  onChange={(e) => setMessageType(e.target.value as "request" | "offer" | "general")}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">General</span>
              </label>
              {user?.role === 'subscriber' && (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="messageType" 
                    value="request"
                    checked={messageType === "request"}
                    onChange={(e) => setMessageType(e.target.value as "request" | "offer" | "general")}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Exchange Request</span>
                </label>
              )}
              {user?.role === 'bidder' && (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="messageType" 
                    value="offer"
                    checked={messageType === "offer"}
                    onChange={(e) => setMessageType(e.target.value as "request" | "offer" | "general")}
                    className="text-success-600 focus:ring-success-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Rate Offer</span>
                </label>
              )}
            </div>
            <div className="flex space-x-3">
              <Input
                type="text"
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1"
                disabled={sendMessageMutation.isPending}
              />
              <Button 
                type="submit" 
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                className="bg-primary-500 hover:bg-primary-600"
              >
                {sendMessageMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
