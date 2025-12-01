import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  BellRing,
  Check,
  CheckCircle,
  Download,
  Heart,
  Info,
  Music,
  ShoppingCart,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error" | "beat" | "order" | "download" | "favorite";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: {
    beatId?: string;
    orderId?: string;
    amount?: number;
    beatTitle?: string;
  };
}

interface NotificationCenterProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className,
  isOpen = false,
  onClose,
}) => {
  const { isSignedIn: _isSignedIn } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    // Load initial notifications
    const initialNotifications: Notification[] = [
      {
        id: "1",
        type: "order",
        title: "Commande confirmée",
        message: "Votre commande #1234 a été confirmée et sera traitée sous peu.",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        read: false,
        actionUrl: "/orders/1234",
        actionLabel: "Voir la commande",
        metadata: {
          orderId: "1234",
          amount: 29.99,
        },
      },
      {
        id: "2",
        type: "beat",
        title: "Nouveau beat disponible",
        message: 'Un nouveau beat "Urban Vibes" correspond à vos préférences.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        read: false,
        actionUrl: "/beats/urban-vibes",
        actionLabel: "Écouter",
        metadata: {
          beatId: "urban-vibes",
          beatTitle: "Urban Vibes",
        },
      },
      {
        id: "3",
        type: "download",
        title: "Téléchargement prêt",
        message: 'Votre beat "Chill Hop" est prêt à être téléchargé.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        read: true,
        actionUrl: "/downloads",
        actionLabel: "Télécharger",
        metadata: {
          beatTitle: "Chill Hop",
        },
      },
      {
        id: "4",
        type: "success",
        title: "Paiement réussi",
        message: "Votre paiement de 49.99€ a été traité avec succès.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        read: true,
        metadata: {
          amount: 49.99,
        },
      },
      {
        id: "5",
        type: "favorite",
        title: "Beat ajouté aux favoris",
        message: 'Le beat "Trap Nation" a été ajouté à vos favoris.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        read: true,
        metadata: {
          beatTitle: "Trap Nation",
        },
      },
    ];
    setNotifications(initialNotifications);
  }, []);

  const getNotificationIcon = useCallback((type: Notification["type"]) => {
    switch (type) {
      case "beat":
        return <Music className="w-4 h-4" />;
      case "order":
        return <ShoppingCart className="w-4 h-4" />;
      case "download":
        return <Download className="w-4 h-4" />;
      case "favorite":
        return <Heart className="w-4 h-4" />;
      case "success":
        return <CheckCircle className="w-4 h-4" />;
      case "warning":
        return <AlertCircle className="w-4 h-4" />;
      case "error":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  }, []);

  const getNotificationColor = useCallback((type: Notification["type"]) => {
    switch (type) {
      case "beat":
        return "text-purple-500 bg-purple-50";
      case "order":
        return "text-blue-500 bg-blue-50";
      case "download":
        return "text-green-500 bg-green-50";
      case "favorite":
        return "text-red-500 bg-red-50";
      case "success":
        return "text-green-500 bg-green-50";
      case "warning":
        return "text-yellow-500 bg-yellow-50";
      case "error":
        return "text-red-500 bg-red-50";
      default:
        return "text-gray-500 bg-gray-50";
    }
  }, []);

  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "À l'instant";
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)} h`;
    return `Il y a ${Math.floor(diffInMinutes / 1440)} j`;
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const markAsUnread = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId ? { ...notification, read: false } : notification
      )
    );
  }, []);

  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    toast.success("Notification supprimée");
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("Toutes les notifications ont été marquées comme lues");
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    toast.success("Toutes les notifications ont été supprimées");
  }, []);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === "unread") return !notification.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`absolute right-0 top-12 w-96 z-50 ${className}`}
    >
      <Card className="shadow-lg border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BellRing className="w-5 h-5" />
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex space-x-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                Toutes ({notifications.length})
              </Button>
              <Button
                variant={filter === "unread" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("unread")}
              >
                Non lues ({unreadCount})
              </Button>
            </div>

            {notifications.length > 0 && (
              <div className="flex space-x-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                    <Check className="w-3 h-3" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-96">
            <AnimatePresence>
              {filteredNotifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 text-center text-muted-foreground"
                >
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune notification</p>
                  <p className="text-sm">
                    {filter === "unread"
                      ? "Toutes vos notifications sont lues"
                      : "Vous êtes à jour !"}
                  </p>
                </motion.div>
              ) : (
                filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
                      notification.read ? "" : "bg-blue-50/50"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium truncate">{notification.title}</h4>
                          <div className="flex items-center space-x-1">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>

                        {notification.metadata && (
                          <div className="flex items-center space-x-2 mb-2">
                            {notification.metadata.amount && (
                              <Badge variant="outline" className="text-xs">
                                {notification.metadata.amount}€
                              </Badge>
                            )}
                            {notification.metadata.beatTitle && (
                              <Badge variant="outline" className="text-xs">
                                {notification.metadata.beatTitle}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex space-x-2">
                            {notification.actionUrl && notification.actionLabel && (
                              <Button size="sm" variant="outline" className="text-xs h-7">
                                {notification.actionLabel}
                              </Button>
                            )}
                          </div>

                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                notification.read
                                  ? markAsUnread(notification.id)
                                  : markAsRead(notification.id)
                              }
                            >
                              {notification.read ? (
                                <X className="w-3 h-3" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NotificationCenter;
