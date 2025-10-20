import type { Notification } from "@/components/alerts/NotificationCenter";
import { useUser } from "@clerk/clerk-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  orderUpdates: boolean;
  newBeats: boolean;
  promotions: boolean;
  soundEnabled: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  isLoading: boolean;
  error: Error | null;

  // Actions
  markAsRead: (notificationId: string) => void;
  markAsUnread: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAll: () => void;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;

  // Real-time
  addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void;
  subscribeToNotifications: () => void;
  unsubscribeFromNotifications: () => void;
}

const useNotifications = (): UseNotificationsReturn => {
  const { user, isLoaded } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    orderUpdates: true,
    newBeats: true,
    promotions: false,
    soundEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Simuler le chargement des notifications depuis l'API
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Notifications simulées basées sur l'utilisateur
      const mockNotifications: Notification[] = [
        {
          id: `welcome-${user.id}`,
          type: "info",
          title: "Bienvenue sur BroLab !",
          message: `Salut ${user.firstName || "Utilisateur"} ! Découvrez nos beats exclusifs.`,
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: "/beats",
          actionLabel: "Explorer",
        },
        {
          id: `profile-${user.id}`,
          type: "warning",
          title: "Complétez votre profil",
          message: "Ajoutez plus d'informations pour une expérience personnalisée.",
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          read: false,
          actionUrl: "/profile",
          actionLabel: "Compléter",
        },
      ];

      setNotifications(mockNotifications);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erreur lors du chargement"));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Charger les paramètres utilisateur
  const loadSettings = useCallback(async () => {
    if (!user) return;

    try {
      // Simuler le chargement des paramètres depuis l'API
      const savedSettings = localStorage.getItem(`notifications-settings-${user.id}`);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (err) {
      console.error("Erreur lors du chargement des paramètres:", err);
    }
  }, [user]);

  // Sauvegarder les paramètres
  const saveSettings = useCallback(
    async (newSettings: NotificationSettings) => {
      if (!user) return;

      try {
        localStorage.setItem(`notifications-settings-${user.id}`, JSON.stringify(newSettings));
        // Ici, on pourrait aussi envoyer les paramètres à l'API
      } catch (err) {
        console.error("Erreur lors de la sauvegarde des paramètres:", err);
      }
    },
    [user]
  );

  // Charger les données au montage
  useEffect(() => {
    if (isLoaded && user) {
      loadNotifications();
      loadSettings();
    }
  }, [isLoaded, user, loadNotifications, loadSettings]);

  // Jouer un son pour les nouvelles notifications
  const playNotificationSound = useCallback(() => {
    if (!settings.soundEnabled) return;

    try {
      // Créer un son simple avec Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (err) {
      console.warn("Impossible de jouer le son de notification:", err);
    }
  }, [settings.soundEnabled]);

  // Actions sur les notifications
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

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("Toutes les notifications ont été marquées comme lues");
  }, []);

  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    toast.success("Toutes les notifications ont été supprimées");
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp">) => {
      const newNotification: Notification = {
        ...notification,
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };

      setNotifications(prev => [newNotification, ...prev]);

      // Jouer le son et afficher un toast
      playNotificationSound();

      if (notification.type === "error") {
        toast.error(notification.title);
      } else if (notification.type === "success") {
        toast.success(notification.title);
      } else if (notification.type === "warning") {
        toast.warning(notification.title);
      } else {
        toast.info(notification.title);
      }
    },
    [playNotificationSound]
  );

  const updateSettings = useCallback(
    (newSettings: Partial<NotificationSettings>) => {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      saveSettings(updatedSettings);
      toast.success("Paramètres de notification mis à jour");
    },
    [settings, saveSettings]
  );

  // Simulation d'abonnement aux notifications en temps réel
  const subscribeToNotifications = useCallback(() => {
    if (isSubscribed || !user) return;

    setIsSubscribed(true);

    // Simuler des notifications périodiques pour la démo
    const interval = setInterval(() => {
      const randomNotifications = [
        {
          type: "beat" as const,
          title: "Nouveau beat disponible",
          message: 'Un nouveau beat "Future Bass" vient d\'être ajouté.',
          read: false,
          actionUrl: "/beats/future-bass",
          actionLabel: "Écouter",
          metadata: { beatTitle: "Future Bass" },
        },
        {
          type: "order" as const,
          title: "Commande en cours",
          message: "Votre commande est en cours de traitement.",
          read: false,
          actionUrl: "/orders",
          actionLabel: "Voir",
        },
        {
          type: "success" as const,
          title: "Téléchargement prêt",
          message: "Votre beat est prêt à être téléchargé.",
          read: false,
          actionUrl: "/downloads",
          actionLabel: "Télécharger",
        },
      ];

      const randomNotification =
        randomNotifications[Math.floor(Math.random() * randomNotifications.length)];

      // Ajouter une notification aléatoire toutes les 30 secondes (pour la démo)
      if (Math.random() > 0.7) {
        addNotification(randomNotification);
      }
    }, 30000);

    // Nettoyer l'intervalle
    return () => {
      clearInterval(interval);
      setIsSubscribed(false);
    };
  }, [isSubscribed, user, addNotification]);

  const unsubscribeFromNotifications = useCallback(() => {
    setIsSubscribed(false);
  }, []);

  // Calculer le nombre de notifications non lues
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // S'abonner automatiquement aux notifications
  useEffect(() => {
    if (isLoaded && user && settings.pushNotifications) {
      const cleanup = subscribeToNotifications();
      return cleanup;
    }

    return undefined;
  }, [isLoaded, user, settings.pushNotifications, subscribeToNotifications]);

  return {
    notifications,
    unreadCount,
    settings,
    isLoading,
    error,

    // Actions
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    clearAll,
    updateSettings,

    // Real-time
    addNotification,
    subscribeToNotifications,
    unsubscribeFromNotifications,
  };
};

export default useNotifications;
