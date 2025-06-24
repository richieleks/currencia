import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, Reply, TrendingUp, Clock, Zap } from "lucide-react";
import { format } from "date-fns";

interface ThreadMessage {
  id: number;
  userId: string;
  content: string;
  messageType: string;
  exchangeRequestId: number;
  parentMessageId?: number;
  createdAt: string;
  user: {
    id: string;
    companyName?: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string;
    profileImageUrl: string | null;
  };
  replies?: ThreadMessage[];
}

interface ExchangeRequest {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  desiredRate?: string;
  priority: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    companyName?: string | null;
    firstName: string | null;
    role: string;
  };
}

interface ExchangeThreadProps {
  request: ExchangeRequest;
  onClose: () => void;
}

export default function ExchangeThread({ request, onClose }: ExchangeThreadProps) {
  const [replyText, setReplyText] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/chat/thread", request.id],
    enabled: !!request.id,
  });

  const createReplyMutation = useMutation({
    mutationFn: async ({ content, parentMessageId }: { content: string; parentMessageId: number }) => {
      return apiRequest(`/api/chat/thread/${request.id}/reply`, {
        method: "POST",
        body: { content, parentMessageId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/thread", request.id] });
      setReplyText("");
      setActiveReplyId(null);
      toast({
        title: "Reply sent",
        description: "Your reply has been posted to the thread.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/chat/messages`, {
        method: "POST",
        body: { 
          content, 
          messageType: "general",
          exchangeRequestId: request.id 
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/thread", request.id] });
      setReplyText("");
      toast({
        title: "Message sent",
        description: "Your message has been posted to the thread.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "MMM d, HH:mm");
  };

  const handleReply = (parentMessageId: number) => {
    if (!replyText.trim()) return;
    createReplyMutation.mutate({ content: replyText, parentMessageId });
  };

  const handleNewMessage = () => {
    if (!replyText.trim()) return;
    createMessageMutation.mutate(replyText);
  };

  const getUserDisplayName = (user: any) => {
    return user.companyName || user.firstName || 'Anonymous';
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Exchange Request Thread
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {request.fromCurrency} → {request.toCurrency} • {request.amount}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        
        {/* Request Summary */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Original Request</span>
            <Badge variant="outline" className="text-xs">
              {request.priority}
            </Badge>
          </div>
          <p className="text-sm text-blue-800">
            <strong>{getUserDisplayName(request.user)}</strong> wants to exchange{" "}
            <strong>{request.amount} {request.fromCurrency}</strong> for{" "}
            <strong>{request.toCurrency}</strong>
            {request.desiredRate && (
              <span> at rate <strong>{request.desiredRate}</strong></span>
            )}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Posted {formatTime(request.createdAt)}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            messages.map((message: ThreadMessage) => (
              <div key={message.id} className="space-y-3">
                {/* Main Message */}
                <div className="flex space-x-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage 
                      src={message.user.profileImageUrl || `https://ui-avatars.com/api/?name=${getUserDisplayName(message.user)}&background=1565C0&color=fff`}
                    />
                    <AvatarFallback>
                      {getUserDisplayName(message.user).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">
                        {getUserDisplayName(message.user)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {message.user.role}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <p className="text-gray-700 text-sm">{message.content}</p>
                      
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveReplyId(activeReplyId === message.id ? null : message.id)}
                          className="text-xs h-6 px-2"
                        >
                          <Reply className="w-3 h-3 mr-1" />
                          Reply
                        </Button>
                        {message.replies && message.replies.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reply Input */}
                    {activeReplyId === message.id && (
                      <div className="mt-3 ml-4">
                        <div className="flex space-x-2">
                          <Input
                            type="text"
                            placeholder="Write a reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="flex-1 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleReply(message.id);
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleReply(message.id)}
                            disabled={!replyText.trim() || createReplyMutation.isPending}
                          >
                            <Send className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Replies */}
                    {message.replies && message.replies.length > 0 && (
                      <div className="mt-3 ml-6 space-y-2">
                        {message.replies.map((reply) => (
                          <div key={reply.id} className="flex space-x-2">
                            <Avatar className="w-6 h-6 flex-shrink-0">
                              <AvatarImage 
                                src={reply.user.profileImageUrl || `https://ui-avatars.com/api/?name=${getUserDisplayName(reply.user)}&background=1565C0&color=fff`}
                              />
                              <AvatarFallback className="text-xs">
                                {getUserDisplayName(reply.user).charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-gray-900 text-xs">
                                  {getUserDisplayName(reply.user)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTime(reply.createdAt)}
                                </span>
                              </div>
                              <div className="bg-gray-100 rounded-lg p-2 border">
                                <p className="text-gray-700 text-xs">{reply.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* New Message Input */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex space-x-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage 
                src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${getUserDisplayName(user)}&background=3B82F6&color=fff`}
              />
              <AvatarFallback>
                {getUserDisplayName(user).charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Add a comment to this thread..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleNewMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleNewMessage}
                  disabled={!replyText.trim() || createMessageMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {createMessageMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}