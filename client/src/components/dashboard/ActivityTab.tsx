import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Download, Eye, Heart, Music } from "lucide-react";

interface RecentActivity {
  id: string;
  type: "purchase" | "favorite" | "download" | "view";
  beatTitle: string;
  date: string;
  amount?: number;
}

interface ActivityTabProps {
  activities?: RecentActivity[];
}

export default function ActivityTab({ activities = [] }: ActivityTabProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <Music className="w-4 h-4 text-green-400" />;
      case "favorite":
        return <Heart className="w-4 h-4 text-red-400" />;
      case "download":
        return <Download className="w-4 h-4 text-blue-400" />;
      case "view":
        return <Eye className="w-4 h-4 text-purple-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Données par défaut si aucune activité n'est fournie
  const defaultActivities: RecentActivity[] = [
    {
      id: "1",
      type: "download",
      beatTitle: "Tropical Vibes",
      date: new Date().toISOString(),
      amount: 9.99,
    },
    {
      id: "2",
      type: "favorite",
      beatTitle: "Midnight Groove",
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "3",
      type: "purchase",
      beatTitle: "Urban Flow",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 14.99,
    },
  ];

  const displayActivities = activities.length > 0 ? activities : defaultActivities;

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayActivities.map(activity => (
              <div
                key={activity.id}
                className="flex items-center space-x-4 p-4 bg-[var(--dark-gray)] rounded-lg"
              >
                <div className="flex-shrink-0">{getActivityIcon(activity.type)}</div>
                <div className="flex-1">
                  <p className="text-white font-medium">{activity.beatTitle}</p>
                  <p className="text-gray-400 text-sm">
                    {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                    {activity.amount && ` • $${activity.amount.toFixed(2)}`}
                  </p>
                </div>
                <div className="text-gray-500 text-sm">{formatDate(activity.date)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
