import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useClerk, useUser } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Download,
  Edit3,
  Heart,
  Mail,
  Music,
  Save,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";

interface UserProfileProps {
  className?: string;
}

interface UserStats {
  totalOrders: number;
  totalDownloads: number;
  totalFavorites: number;
  totalSpent: number;
  memberSince: string;
  lastActivity: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ className }) => {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Statistiques utilisateur (placeholder soft) – affichage non trompeur
  const userStats: UserStats = {
    totalOrders: 0,
    totalDownloads: 0,
    totalFavorites: 0,
    totalSpent: 0,
    memberSince: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US") : "N/A",
    lastActivity: "—",
  };

  React.useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
      });
    }
  }, [user]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
      });
    }
  }, [user]);

  const handlePhotoUpload = useCallback(
    async (file: File) => {
      if (!user) return;

      setIsUploadingPhoto(true);
      try {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error("Please select a valid image file");
          return;
        }

        // Validate size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Image must be smaller than 5MB");
          return;
        }

        // Update profile photo via Clerk
        await user.setProfileImage({ file });
        toast.success("Profile photo updated successfully");
      } catch (error) {
        console.error("Error uploading photo:", error);
        toast.error("Error uploading photo");
      } finally {
        setIsUploadingPhoto(false);
      }
    },
    [user]
  );

  const handleSave = useCallback(async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      await user.update({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
      });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile");
    } finally {
      setIsUpdating(false);
    }
  }, [user, formData]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const getUserInitials = useCallback(() => {
    if (!user) return "U";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  }, [user]);

  const getUserRole = useCallback(() => {
    // Rôle affiché de façon neutre tant que la billing réelle n'est pas branchée
    return { label: "Standard", icon: User, color: "bg-blue-500" };
  }, []);

  if (!isLoaded) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">User not signed in</p>
        </CardContent>
      </Card>
    );
  }

  const role = getUserRole();
  const RoleIcon = role.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <AvatarUpload
                  src={user.imageUrl}
                  alt={user.fullName || "User"}
                  size="lg"
                  className="w-16 h-16"
                  onUpload={url => {
                    // Mettre à jour l'avatar dans Clerk
                    user.setProfileImage({ file: url });
                  }}
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-semibold text-white">{user.fullName || "User"}</h3>
                  <Badge className={`${role.color} text-white`}>
                    <RoleIcon className="w-3 h-3 mr-1" />
                    {role.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex space-x-2"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isUpdating}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="viewing"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEdit}
                      className="hover:bg-purple-600 hover:text-white transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Personal information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Personal information
              </h4>
              <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                💡 Click the camera icon to upload a new photo
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                {isEditing ? (
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={e => handleInputChange("firstName", e.target.value)}
                    disabled={isUpdating}
                  />
                ) : (
                  <p className="text-sm py-2 px-3 bg-muted rounded-md">
                    {user.firstName || "Not provided"}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                {isEditing ? (
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={e => handleInputChange("lastName", e.target.value)}
                    disabled={isUpdating}
                  />
                ) : (
                  <p className="text-sm py-2 px-3 bg-muted rounded-md">
                    {user.lastName || "Not provided"}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                {isEditing ? (
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={e => handleInputChange("username", e.target.value)}
                    disabled={isUpdating}
                  />
                ) : (
                  <p className="text-sm py-2 px-3 bg-muted rounded-md">
                    {user.username || "Not provided"}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Member since</Label>
                <p className="text-sm py-2 px-3 bg-muted rounded-md flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {userStats.memberSince}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* User stats */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Statistics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-muted rounded-lg"
              >
                <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{userStats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Orders</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-muted rounded-lg"
              >
                <Download className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{userStats.totalDownloads}</p>
                <p className="text-xs text-muted-foreground">Downloads</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-muted rounded-lg"
              >
                <Heart className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <p className="text-2xl font-bold">{userStats.totalFavorites}</p>
                <p className="text-xs text-muted-foreground">Favorites</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-muted rounded-lg"
              >
                <Music className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold">{userStats.totalSpent.toFixed(0)}€</p>
                <p className="text-xs text-muted-foreground">Spent</p>
              </motion.div>
            </div>
          </div>

          <Separator />

          {/* Recent activity */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Activity
            </h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last activity</span>
              <span className="text-muted-foreground">{userStats.lastActivity}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UserProfile;
