import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMessage } from "@shared/schema";
import { Send, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

export default function ChatRoomThreaded() {
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessageWithUser | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessageWithUser[]>({
    queryKey: ["/api/chat/messages"],
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, messageType: "general" }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      setMessage("");
      toast({
        title: "Message sent",
        description: "Your message has been posted successfully.",
      });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ parentId, content }: { parentId: number; content: string }) => {
      const response = await fetch(`/api/chat/messages/${parentId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("Failed to send reply");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      setReplyContent("");
      setReplyingTo(null);
      toast({
        title: "Reply sent",
        description: "Your reply has been posted successfully.",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && user) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyContent.trim() && user && replyingTo) {
      sendReplyMutation.mutate({
        parentId: replyingTo.id,
        content: replyContent.trim(),
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Chat Room</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" />
          <span>Chat Room</span>
          <span className="text-sm text-gray-500">({messages.length} messages)</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-96">
          {messages.map((msg) => {
            const displayName = msg.user.companyName || `${msg.user.firstName} ${msg.user.lastName}`.trim() || "Anonymous";
            
            return (
              <div key={msg.id} className="space-y-2">
                {/* Main message */}
                <div className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{displayName}</span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="mt-1">
                      <p className="text-gray-700">{msg.content}</p>
                    </div>
                    <div className="mt-2 flex items-center space-x-4">
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="text-xs text-gray-500 hover:text-primary-600 flex items-center space-x-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Reply</span>
                      </button>
                      {msg.replies && msg.replies.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {msg.replies.length} {msg.replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {msg.replies && msg.replies.length > 0 && (
                  <div className="ml-11 space-y-2 border-l-2 border-gray-200 pl-4">
                    {msg.replies.map((reply) => {
                      const replyDisplayName = reply.user.companyName || `${reply.user.firstName} ${reply.user.lastName}`.trim() || "Anonymous";
                      return (
                        <div key={reply.id} className="flex space-x-2">
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {replyDisplayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">{replyDisplayName}</span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{reply.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reply input for this message */}
                {replyingTo?.id === msg.id && (
                  <div className="ml-11 border-l-2 border-primary-200 pl-4">
                    <form onSubmit={handleReplySubmit} className="flex space-x-2">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {user?.firstName?.charAt(0) || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder={`Reply to ${displayName}...`}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          autoFocus
                        />
                        <div className="mt-2 flex space-x-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={!replyContent.trim() || sendReplyMutation.isPending}
                          >
                            {sendReplyMutation.isPending ? "Sending..." : "Reply"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t pt-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="flex items-center space-x-1"
            >
              <Send className="w-4 h-4" />
              <span>{sendMessageMutation.isPending ? "Sending..." : "Send"}</span>
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}