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
import { Send, TrendingUp, Clock, MessageSquare, CheckCircle, XCircle, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface ChatMessageWithUser extends ChatMessage {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    profileImageUrl: string | null;
  };
}

interface BidActionProps {
  message: ChatMessageWithUser;
  currentUserId: string;
}

interface BidActionProps {
  message: ChatMessageWithUser;
  currentUserId: string;
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

  const getMessageTypeColor = (messageType: string) => {
    switch (messageType) {
      case "request":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "offer":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "bid_action":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      case "notification":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  const getMessageIcon = (messageType: string, actionType?: string) => {
    switch (messageType) {
      case "bid_action":
        return actionType === "accept" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />;
      case "notification":
        return <Bell className="h-4 w-4" />;
      case "request":
        return <MessageSquare className="h-4 w-4" />;
      case "offer":
        return <Send className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const BidActionMessage = ({ message, currentUserId }: BidActionProps) => {
    const isTargetUser = message.targetUserId === currentUserId;
    const actionText = message.actionType === "accept" ? "accepted" : "rejected";
    const actionColor = message.actionType === "accept" ? "text-green-600" : "text-red-600";
    
    return (
      <div className={`mb-4 ${isTargetUser ? 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3' : ''}`}>
        <div className="flex items-start space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {message.user.firstName?.charAt(0) || message.user.email?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {message.user.firstName || message.user.email}
              </span>
              <Badge variant="secondary" className={getMessageTypeColor(message.messageType)}>
                <div className="flex items-center gap-1">
                  {getMessageIcon(message.messageType, message.actionType)}
                  <span className="capitalize">{actionText}</span>
                </div>
              </Badge>
              <span className="text-xs text-gray-500">
                {format(new Date(message.createdAt), "HH:mm")}
              </span>
            </div>
            <div className={`mt-1 text-sm ${actionColor} font-medium`}>
              {message.content}
              {isTargetUser && (
                <span className="ml-2 text-xs text-gray-500">
                  (This affects your bid)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const NotificationMessage = ({ message, currentUserId }: BidActionProps) => {
    const isForUser = message.targetUserId === currentUserId;
    
    // Show notifications if they're for the current user or if they're global (no target)
    if (message.targetUserId && !isForUser) return null;
    
    return (
      <div className={`mb-4 ${isForUser ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3' : 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3'}`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
              <Bell className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className={getMessageTypeColor(message.messageType)}>
                <div className="flex items-center gap-1">
                  {getMessageIcon(message.messageType)}
                  <span>Notification</span>
                </div>
              </Badge>
              <span className="text-xs text-gray-500">
                {format(new Date(message.createdAt), "HH:mm")}
              </span>
              {isForUser && (
                <Badge variant="outline" className="text-xs">
                  For You
                </Badge>
              )}
            </div>
            <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-medium">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    );
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
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="messageType" 
                  value="offer"
                  checked={messageType === "offer"}
                  onChange={(e) => setMessageType(e.target.value as "request" | "offer" | "general")}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Rate Offer</span>
              </label>
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
