import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bell, BellDot, CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

interface NotificationWithUser {
  id: number;
  userId: string;
  messageType: string;
  content: string;
  exchangeRequestId?: number;
  rateOfferId?: number;
  actionType?: string;
  targetUserId?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    profileImageUrl: string | null;
  };
}

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications (using chat messages with notification types)
  const { data: messages = [], refetch } = useQuery<NotificationWithUser[]>({
    queryKey: ["/api/chat/messages"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // WebSocket for real-time updates
  useWebSocket("/ws", (message) => {
    if (message.type === "new_message") {
      refetch();
    }
  });

  // Filter notifications for current user
  const notifications = messages.filter(msg => 
    (msg.messageType === "notification" || msg.messageType === "bid_action") &&
    (msg.targetUserId === user?.id || !msg.targetUserId)
  ).slice(0, 20); // Show latest 20 notifications

  // Update unread count
  useEffect(() => {
    const recentNotifications = notifications.filter(notification => {
      const notificationTime = new Date(notification.createdAt);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return notificationTime > oneHourAgo;
    });
    setUnreadCount(recentNotifications.length);
  }, [notifications]);

  const getNotificationIcon = (messageType: string, actionType?: string) => {
    switch (messageType) {
      case "bid_action":
        return actionType === "accept" ? 
          <CheckCircle className="h-4 w-4 text-green-600" /> : 
          <XCircle className="h-4 w-4 text-red-600" />;
      case "notification":
        return <Bell className="h-4 w-4 text-blue-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (messageType: string, actionType?: string) => {
    switch (messageType) {
      case "bid_action":
        return actionType === "accept" ? 
          "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : 
          "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800";
      case "notification":
        return "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800";
      default:
        return "bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800";
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Yesterday";
    
    return format(date, "MMM d");
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellDot className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              {unreadCount > 0 && (
                <Badge variant="secondary">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <CardDescription>
              Recent activity and updates
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You'll see updates about your trades here
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification, index) => {
                    const isTargeted = notification.targetUserId === user.id;
                    const isRecent = new Date(notification.createdAt) > new Date(Date.now() - 60 * 60 * 1000);
                    
                    return (
                      <div key={notification.id}>
                        <div className={`p-4 hover:bg-muted/50 transition-colors ${
                          isTargeted ? getNotificationColor(notification.messageType, notification.actionType) : ''
                        } ${isRecent ? 'border-l-4 border-l-primary' : ''}`}>
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.messageType, notification.actionType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium text-foreground">
                                  {notification.user.firstName || "User"}
                                </p>
                                <div className="flex items-center gap-2">
                                  {isTargeted && (
                                    <Badge variant="outline" className="text-xs">
                                      For You
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {formatNotificationTime(notification.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {notification.content}
                              </p>
                              {notification.messageType === "bid_action" && (
                                <Badge 
                                  variant="outline" 
                                  className="mt-2 text-xs"
                                >
                                  {notification.actionType === "accept" ? "Bid Accepted" : "Bid Rejected"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {index < notifications.length - 1 && <Separator />}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}