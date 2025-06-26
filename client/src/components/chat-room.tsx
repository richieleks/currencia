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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { ChatMessage } from "@shared/schema";
import { Send, TrendingUp, Clock, MessageSquare, CheckCircle, XCircle, Bell, ArrowRight, Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, formatRate } from "@/lib/utils";

interface ChatMessageWithUser extends ChatMessage {
  user: {
    id: string;
    companyName?: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string;
    profileImageUrl: string | null;
  };
  replies?: ChatMessageWithUser[];
}

interface BidActionProps {
  message: ChatMessageWithUser;
  currentUserId: string;
}

interface ExchangeRequestData {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  desiredRate?: string;
  priority: string;
  user: {
    id: string;
    companyName?: string | null;
    firstName: string | null;
  };
}

const quickOfferSchema = z.object({
  rate: z.string().min(1, "Rate is required").transform((val) => parseFloat(val)),
}).refine((data) => data.rate > 0, {
  message: "Rate must be greater than 0",
  path: ["rate"],
});

type QuickOfferData = z.infer<typeof quickOfferSchema>;

export default function ChatRoom() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"request" | "offer" | "general">("general");
  const [showQuickOffer, setShowQuickOffer] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ExchangeRequestData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat messages
  const { data: messages = [], isLoading } = useQuery<ChatMessageWithUser[]>({
    queryKey: ["/api/chat/messages"],
    refetchInterval: 5000, // Refetch every 5 seconds as fallback
  });

  // Fetch active exchange requests
  const { data: exchangeRequests = [] } = useQuery<(ExchangeRequestData & { user: any })[]>({
    queryKey: ["/api/exchange-requests"],
    refetchInterval: 10000,
  });

  // Quick offer form
  const quickOfferForm = useForm<QuickOfferData>({
    resolver: zodResolver(quickOfferSchema),
    defaultValues: {
      rate: 0,
    },
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

  const handleQuickOffer = (request: ExchangeRequestData) => {
    if (request.user.id === user?.id) {
      toast({
        title: "Cannot Bid",
        description: "You cannot submit offers on your own exchange requests.",
        variant: "destructive",
      });
      return;
    }
    setSelectedRequest(request);
    setShowQuickOffer(true);
  };

  const onQuickOfferSubmit = (data: QuickOfferData) => {
    if (!selectedRequest) return;
    quickOfferMutation.mutate({
      ...data,
      exchangeRequestId: selectedRequest.id,
    });
  };

  // Parse exchange request data from message content
  const parseExchangeRequestFromMessage = (content: string): ExchangeRequestData | null => {
    try {
      // Look for exchange request pattern in message content
      const lines = content.split('\n');
      let fromCurrency = "", toCurrency = "", amount = "", desiredRate = "", priority = "";
      
      for (const line of lines) {
        if (line.includes('Exchange:')) {
          const match = line.match(/(\w+)\s*→\s*(\w+)/);
          if (match) {
            fromCurrency = match[1];
            toCurrency = match[2];
          }
        }
        if (line.includes('Amount:')) {
          const match = line.match(/Amount:\s*([\d,]+(?:\.\d+)?)\s*(\w+)/);
          if (match) amount = match[1].replace(/,/g, '');
        }
        if (line.includes('Desired Rate:') && !line.includes('N/A')) {
          const match = line.match(/Desired Rate:\s*([\d.]+)/);
          if (match) desiredRate = match[1];
        }
        if (line.includes('Priority:') && !line.includes('N/A')) {
          const match = line.match(/Priority:\s*(\w+)/);
          if (match) priority = match[1];
        }
      }

      // Find matching exchange request from API data
      const matchingRequest = exchangeRequests.find(req => 
        req.fromCurrency === fromCurrency && 
        req.toCurrency === toCurrency &&
        req.amount === amount
      );

      return matchingRequest || null;
    } catch {
      return null;
    }
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
        {/* Facebook-like Chat Messages Area */}
        <div className="h-96 overflow-y-auto p-4 space-y-2 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwnMessage = message.userId === user?.id;
              const showAvatar = index === messages.length - 1 || 
                messages[index + 1]?.userId !== message.userId;
              const isFirstInGroup = index === 0 || 
                messages[index - 1]?.userId !== message.userId;
              
              return (
                <div 
                  key={message.id} 
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                    isFirstInGroup ? 'mt-4' : 'mt-1'
                  }`}
                >
                  {/* Avatar for others' messages */}
                  {!isOwnMessage && (
                    <div className="flex-shrink-0 mr-2">
                      {showAvatar ? (
                        <img 
                          src={message.user.profileImageUrl || `https://ui-avatars.com/api/?name=${message.user.companyName || message.user.firstName || 'User'}&background=1565C0&color=fff`}
                          alt={message.user.companyName || message.user.firstName || 'User'}
                          className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-8 h-8" />
                      )}
                    </div>
                  )}
                  
                  <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'ml-auto' : ''}`}>
                    {/* Sender name for first message in group */}
                    {!isOwnMessage && isFirstInGroup && (
                      <div className="mb-1 ml-3">
                        <span className="text-xs font-semibold text-gray-700">
                          {message.user.companyName || message.user.firstName || 'User'}
                        </span>
                        <Badge 
                          variant="outline"
                          className="ml-2 text-xs py-0 px-1 border-gray-300 text-gray-600"
                        >
                          {message.user.role}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <div className={`relative px-4 py-2 rounded-2xl shadow-sm ${
                      isOwnMessage 
                        ? 'bg-blue-500 text-white rounded-br-md' 
                        : message.messageType === 'request'
                        ? 'bg-green-100 text-green-900 border border-green-200 rounded-bl-md'
                        : message.messageType === 'offer'
                        ? 'bg-orange-100 text-orange-900 border border-orange-200 rounded-bl-md'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                    }`}>
                      {/* Message type indicator for special messages */}
                      {!isOwnMessage && message.messageType === 'request' && (
                        <div className="flex items-center mb-1">
                          <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
                          <span className="text-xs font-semibold text-green-700">Exchange Request</span>
                        </div>
                      )}
                      {!isOwnMessage && message.messageType === 'offer' && (
                        <div className="flex items-center mb-1">
                          <Clock className="w-3 h-3 mr-1 text-orange-600" />
                          <span className="text-xs font-semibold text-orange-700">Rate Offer</span>
                        </div>
                      )}
                      
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      
                      {/* Quick Response for Exchange Requests */}
                      {!isOwnMessage && message.messageType === 'request' && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          {(() => {
                            const requestData = parseExchangeRequestFromMessage(message.content);
                            return requestData ? (
                              <Button
                                size="sm"
                                onClick={() => handleQuickOffer(requestData)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-1 rounded-full"
                              >
                                <Zap className="w-3 h-3 mr-1" />
                                Make Offer
                              </Button>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                    
                    {/* Timestamp - only show for last message in group */}
                    {showAvatar && (
                      <div className={`mt-1 text-xs text-gray-500 ${
                        isOwnMessage ? 'text-right mr-3' : 'text-left ml-3'
                      }`}>
                        {formatTime(message.createdAt ? message.createdAt.toString() : '')}
                      </div>
                    )}
                  </div>
                  
                  {/* Avatar for own messages */}
                  {isOwnMessage && (
                    <div className="flex-shrink-0 ml-2">
                      {showAvatar ? (
                        <img 
                          src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.companyName || user?.firstName || 'You'}&background=3B82F6&color=fff`}
                          alt="You"
                          className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-8 h-8" />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Facebook-like Message Input */}
        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Message Type Pills */}
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-xs font-medium text-gray-500 mr-2">Message type:</span>
              <button
                type="button"
                onClick={() => setMessageType("general")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  messageType === "general"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                💬 General
              </button>
              <button
                type="button"
                onClick={() => setMessageType("request")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  messageType === "request"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📈 Exchange Request
              </button>
              <button
                type="button"
                onClick={() => setMessageType("offer")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  messageType === "offer"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                💰 Rate Offer
              </button>
            </div>
            
            {/* Input Area */}
            <div className="flex items-end space-x-2">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder={
                    messageType === "request" 
                      ? "Share your exchange request..."
                      : messageType === "offer"
                      ? "Make a rate offer..."
                      : "Write a message..."
                  }
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="pr-12 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-gray-50 hover:bg-white transition-colors"
                  disabled={sendMessageMutation.isPending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as any);
                    }
                  }}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    className="w-8 h-8 rounded-full p-0 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
                  >
                    {sendMessageMutation.isPending ? (
                      <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
