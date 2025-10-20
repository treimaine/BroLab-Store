import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Download,
  File,
  FileMusic,
  FileText,
  Hash,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useState } from "react";
import FileUpload from "@/components/ui/file-upload";

interface FileRecord {
  id: string;
  owner_id: number;
  reservation_id?: string;
  order_id?: number;
  storage_path: string;
  mime_type?: string;
  size_bytes?: number;
  role: "upload" | "deliverable" | "invoice";
  created_at: string;
}

interface FileUploadProps {
  onUploadSuccess: () => void;
}

function FileUploadComponent({ onUploadSuccess }: FileUploadProps) {
  const [role, setRole] = useState<"upload" | "deliverable" | "invoice">("upload");
  const [reservationId, setReservationId] = useState("");
  const [orderId, setOrderId] = useState("");
  const { toast } = useToast();

  const handleUploadSuccess = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("role", role);
      if (reservationId) formData.append("reservation_id", reservationId);
      if (orderId) formData.append("order_id", orderId);

      const response = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      toast({
        title: "Upload réussi",
        description: `Fichier "${file.name}" uploadé avec succès`,
      });

      setReservationId("");
      setOrderId("");
      onUploadSuccess();
    } catch (error: any) {
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUploadError = (error: any) => {
    toast({
      title: "Erreur de validation",
      description: error.message,
      variant: "destructive",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload de fichiers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="role">Type de fichier</Label>
          <Select value={role} onValueChange={(value: any) => setRole(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upload">Upload utilisateur</SelectItem>
              <SelectItem value="deliverable">Livrable</SelectItem>
              <SelectItem value="invoice">Facture</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reservationId">ID Réservation (optionnel)</Label>
            <Input
              id="reservationId"
              value={reservationId}
              onChange={e => setReservationId(e.target.value)}
              placeholder="uuid-reservation"
            />
          </div>
          <div>
            <Label htmlFor="orderId">ID Commande (optionnel)</Label>
            <Input
              id="orderId"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              placeholder="123"
              type="number"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <FileUpload
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              acceptedFileTypes={[".pdf", ".doc", ".docx", ".mp3", ".wav", ".zip", ".jpg", ".png"]}
              maxFileSize={100 * 1024 * 1024} // 100MB
              uploadDelay={0} // Pas de simulation d'upload
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FileList() {
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: files = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/storage/files", selectedRole],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRole !== "all") params.append("role", selectedRole);

      const response = await apiRequest("GET", `/api/storage/files?${params}`);
      const data = await response.json();
      return data.files || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest("DELETE", `/api/storage/files/${fileId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fichier supprimé",
        description: "Le fichier a été supprimé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/storage/files"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de suppression",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadFile = async (fileId: string, fileName: string) => {
    try {
      const response = await apiRequest("GET", `/api/storage/signed-url/${fileId}`);
      const data = await response.json();

      // Open download URL in new tab
      window.open(data.url, "_blank");

      toast({
        title: "Téléchargement initié",
        description: `Téléchargement de "${fileName}" en cours`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur de téléchargement",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="w-4 h-4" />;
    if (mimeType.startsWith("audio/")) return <FileMusic className="w-4 h-4" />;
    if (mimeType.includes("pdf") || mimeType.includes("document"))
      return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "upload":
        return "bg-blue-500";
      case "deliverable":
        return "bg-green-500";
      case "invoice":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <File className="w-5 h-5" />
            Gestion des fichiers
          </CardTitle>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les fichiers</SelectItem>
              <SelectItem value="upload">Uploads utilisateurs</SelectItem>
              <SelectItem value="deliverable">Livrables</SelectItem>
              <SelectItem value="invoice">Factures</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Chargement des fichiers...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Aucun fichier trouvé</div>
        ) : (
          <div className="space-y-3">
            {files.map((file: FileRecord) => (
              <div
                key={file.id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.mime_type)}
                    <div>
                      <div className="font-medium">{file.storage_path.split("/").pop()}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          User {file.owner_id}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(file.created_at).toLocaleDateString("fr-FR")}
                        </span>
                        <span>{formatFileSize(file.size_bytes)}</span>
                        {file.reservation_id && (
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            Rés: {file.reservation_id.slice(0, 8)}...
                          </span>
                        )}
                        {file.order_id && (
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            Cmd: {file.order_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={`text-white ${getRoleBadgeColor(file.role)}`}>
                      {file.role}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadFile(file.id, file.storage_path.split("/").pop() || "file")
                      }
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(file.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FileManager() {
  const [activeTab, setActiveTab] = useState("list");
  const queryClient = useQueryClient();

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/storage/files"] });
    setActiveTab("list");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Gestionnaire de fichiers</h2>
        <p className="text-gray-400">Gérez les uploads, livrables et factures des utilisateurs</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Liste des fichiers</TabsTrigger>
          <TabsTrigger value="upload">Upload de fichiers</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <FileList />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <FileUploadComponent onUploadSuccess={handleUploadSuccess} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
