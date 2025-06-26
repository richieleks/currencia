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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChatMessage } from "@shared/schema";
import { Send, TrendingUp, Clock, MessageSquare, CheckCircle, XCircle, Bell, ArrowRight, Zap, DollarSign } from "lucide-react";
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

const rateOfferSchema = z.object({
  rate: z.string().min(1, "Rate is required"),
  totalAmount: z.string().min(1, "Total amount is required"),
});

type RateOfferData = z.infer<typeof rateOfferSchema>;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getMessageIcon(messageType: string, actionType?: string) {
  if (messageType === "bid_action") {
    return actionType === "accept" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />;
  }
  if (messageType === "notification") return <Bell className="w-3 h-3" />;
  if (messageType === "request") return <TrendingUp className="w-3 h-3" />;
  if (messageType === "offer") return <Clock className="w-3 h-3" />;
  return <MessageSquare className="w-3 h-3" />;
}

function getMessageTypeColor(messageType: string): string {
  switch (messageType) {
    case "bid_action": return "bg-blue-100 text-blue-800 border-blue-200";
    case "notification": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "request": return "bg-green-100 text-green-800 border-green-200";
    case "offer": return "bg-orange-100 text-orange-800 border-orange-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export default function ChatRoom() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"general" | "request" | "offer">("general");
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ExchangeRequestData | null>(null);

  const rateOfferForm = useForm<RateOfferData>({
    resolver: zodResolver(rateOfferSchema),
    defaultValues: {
      rate: "",
      totalAmount: "",
    }
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/chat/messages"],
    enabled: !!user,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; messageType: string; exchangeRequestId?: number }) => {
      return apiRequest("/api/chat/messages", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Authentication Error",
          description: "Please log in to send messages.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const createRateOfferMutation = useMutation({
    mutationFn: async (data: RateOfferData & { exchangeRequestId: number }) => {
      return apiRequest("/api/rate-offers", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Rate offer submitted successfully!",
      });
      setIsOfferDialogOpen(false);
      rateOfferForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/rate-offers"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit rate offer. Please try again.",
        variant: "destructive",
      });
    },
  });

  useWebSocket({
    onMessage: (message) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendMessageMutation.mutate({
      content: messageText,
      messageType: messageType,
    });
  };

  const handleRateOffer = (request: ExchangeRequestData) => {
    setSelectedRequest(request);
    setIsOfferDialogOpen(true);
  };

  const handleRateOfferSubmit = (data: RateOfferData) => {
    if (!selectedRequest) return;
    
    createRateOfferMutation.mutate({
      ...data,
      exchangeRequestId: selectedRequest.id,
    });
  };

  const extractRequestData = (message: ChatMessageWithUser): ExchangeRequestData | null => {
    if (!message.exchangeRequestId) return null;
    
    // Parse the message content to extract exchange request data
    const content = message.content;
    const lines = content.split('\n');
    
    // Extract currency pair and amount from content
    const currencyLine = lines.find(line => line.includes('→'));
    if (!currencyLine) return null;
    
    const match = currencyLine.match(/(\d+(?:\.\d+)?)\s+(\w+)\s+→\s+(\w+)/);
    if (!match) return null;
    
    const [, amount, fromCurrency, toCurrency] = match;
    
    return {
      id: message.exchangeRequestId,
      fromCurrency,
      toCurrency,
      amount,
      priority: "normal",
      user: message.user,
    };
  };

  if (messagesLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading messages...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Market Discussion
            <Badge variant="outline" className="ml-auto">
              {messages?.length || 0} messages
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-900">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message: ChatMessageWithUser, index: number) => {
                const isOwnMessage = message.userId === user?.id;
                const showAvatar = index === messages.length - 1 || 
                  messages[index + 1]?.userId !== message.userId;

                return (
                  <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${
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
                      
                      {/* Action buttons for exchange requests */}
                      {message.exchangeRequestId && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 flex gap-2">
                          {/* Rate Offer Button for Bidders */}
                          {user?.id !== message.user.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const requestData = extractRequestData(message);
                                if (requestData) handleRateOffer(requestData);
                              }}
                              className="text-xs py-1 px-2 text-green-600 border-green-600 hover:bg-green-50"
                            >
                              <DollarSign className="w-3 h-3 mr-1" />
                              Make Offer
                            </Button>
                          )}
                          
                          {/* Counter Offer Button for Requesters */}
                          {user?.id === message.user.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const requestData = extractRequestData(message);
                                if (requestData) handleRateOffer(requestData);
                              }}
                              className="text-xs py-1 px-2 text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Counter Offer
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Timestamp - only show for last message in group */}
                    {showAvatar && (
                      <div className="text-xs text-gray-500 mt-1">
                        {message.createdAt && format(new Date(message.createdAt), "HH:mm")}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send Message Form */}
          <div className="p-4 border-t bg-white dark:bg-gray-800">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder={
                    messageType === "request" 
                      ? "Share a currency exchange request..."
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
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Rate Offer Dialog */}
      <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRequest && user?.id === selectedRequest.user.id ? "Counter Offer" : "Rate Offer"}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest ? (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Exchange Request</div>
                <div className="font-semibold">
                  {selectedRequest.amount} {selectedRequest.fromCurrency} → {selectedRequest.toCurrency}
                </div>
                <div className="text-xs text-gray-500">
                  By {selectedRequest.user.companyName || selectedRequest.user.firstName || "Anonymous"}
                </div>
              </div>

              <Form {...rateOfferForm}>
                <form onSubmit={rateOfferForm.handleSubmit(handleRateOfferSubmit)} className="space-y-4">
                  <FormField
                    control={rateOfferForm.control}
                    name="rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exchange Rate</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 3750.00" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={rateOfferForm.control}
                    name="totalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Amount ({selectedRequest.toCurrency})</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 18750000.00" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOfferDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createRateOfferMutation.isPending}
                      className="flex-1"
                    >
                      {createRateOfferMutation.isPending ? "Submitting..." : "Submit Offer"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}