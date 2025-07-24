import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Calendar, TrendingUp, Music, Download, Star, Clock, User, Trophy, Gift, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface UserStats {
  totalPurchases: number;
  totalSpent: number;
  favoriteGenre: string;
  joinDate: string;
  loyaltyPoints: number;
  nextRewardAt: number;
}

interface RecentActivity {
  id: string;
  type: 'purchase' | 'favorite' | 'download';
  beatTitle: string;
  date: string;
  amount?: number;
}

interface Recommendation {
  id: string;
  title: string;
  artist: string;
  genre: string;
  price: number;
  imageUrl: string;
  matchScore: number;
  reason: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check if user is authenticated
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Type guard for user object
  const typedUser = user as {
    id?: number;
    username?: string;
    email?: string;
    avatar?: string;
    name?: string;
    subscription?: string;
    memberSince?: string;
  } | null;

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && (error || !typedUser)) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access the dashboard',
        variant: 'destructive',
      });
      setTimeout(() => {
        setLocation('/login');
      }, 1000);
    }
  }, [isLoading, error, user, setLocation, toast]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="pt-16 bg-[var(--deep-black)] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-[var(--medium-gray)] rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-dark h-32"></div>
              ))}
            </div>
            <div className="card-dark h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state or redirect
  if (error || !user) {
    return (
      <div className="pt-16 bg-[var(--deep-black)] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-4">You need to be logged in to access this page</p>
            <p className="text-gray-400">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats: UserStats = {
    totalPurchases: 24,
    totalSpent: 1247.50,
    favoriteGenre: 'Trap',
    joinDate: '2023-03-15',
    loyaltyPoints: 450,
    nextRewardAt: 500
  };

  const recentActivity: RecentActivity[] = [
    { id: '1', type: 'purchase', beatTitle: 'Dark Vibes', date: '2024-01-15', amount: 49.99 },
    { id: '2', type: 'favorite', beatTitle: 'Summer Nights', date: '2024-01-14' },
    { id: '3', type: 'download', beatTitle: 'City Lights', date: '2024-01-13' },
    { id: '4', type: 'purchase', beatTitle: 'Emotional', date: '2024-01-12', amount: 29.99 },
    { id: '5', type: 'favorite', beatTitle: 'Hard Trap', date: '2024-01-11' },
  ];

  const recommendations: Recommendation[] = [
    {
      id: '1',
      title: 'Underground',
      artist: 'ProducerX',
      genre: 'Trap',
      price: 39.99,
      imageUrl: '/api/placeholder/200/200',
      matchScore: 95,
      reason: 'Based on your love for dark trap beats'
    },
    {
      id: '2',
      title: 'Melodic Dreams',
      artist: 'BeatMaker',
      genre: 'R&B',
      price: 34.99,
      imageUrl: '/api/placeholder/200/200',
      matchScore: 87,
      reason: 'Perfect for your melodic projects'
    },
    {
      id: '3',
      title: 'Energy Boost',
      artist: 'SoundWave',
      genre: 'Hip-Hop',
      price: 44.99,
      imageUrl: '/api/placeholder/200/200',
      matchScore: 82,
      reason: 'High-energy like your recent purchases'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <Download className="w-4 h-4 text-[var(--accent-green)]" />;
      case 'favorite': return <Star className="w-4 h-4 text-yellow-400" />;
      case 'download': return <Music className="w-4 h-4 text-[var(--accent-purple)]" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <img
              src={typedUser?.avatar || '/api/placeholder/64/64'}
              alt={typedUser?.name || 'User'}
              className="w-16 h-16 rounded-full object-cover border-2 border-[var(--accent-purple)]"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome back, {typedUser?.name || 'User'}</h1>
              <p className="text-gray-300">
                {typedUser?.subscription || 'Free'} Member since {typedUser?.memberSince || 'Recently'}
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-[var(--medium-gray)] mb-8">
            <TabsTrigger 
              value="overview" 
              className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-[var(--accent-purple)]"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-[var(--accent-purple)]"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger 
              value="recommendations" 
              className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-[var(--accent-purple)]"
            >
              For You
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-[var(--accent-purple)]"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Purchases</p>
                      <p className="text-2xl font-bold text-white">{stats.totalPurchases}</p>
                    </div>
                    <Download className="w-8 h-8 text-[var(--accent-purple)]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Spent</p>
                      <p className="text-2xl font-bold text-white">${stats.totalSpent.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-[var(--accent-green)]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Favorite Genre</p>
                      <p className="text-2xl font-bold text-white">{stats.favoriteGenre}</p>
                    </div>
                    <Music className="w-8 h-8 text-[var(--accent-cyan)]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Loyalty Points</p>
                      <p className="text-2xl font-bold text-white">{stats.loyaltyPoints}</p>
                    </div>
                    <Trophy className="w-8 h-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Loyalty Program */}
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Gift className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
                  Loyalty Program
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Progress to next reward</span>
                  <span className="text-white font-bold">
                    {stats.loyaltyPoints} / {stats.nextRewardAt} points
                  </span>
                </div>
                <Progress 
                  value={(stats.loyaltyPoints / stats.nextRewardAt) * 100} 
                  className="h-2"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    {stats.nextRewardAt - stats.loyaltyPoints} points to next reward
                  </span>
                  <Badge className="bg-[var(--accent-purple)]">
                    Free Beat Coming!
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Preview */}
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
                    Recent Activity
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveTab('activity')}
                    className="text-[var(--accent-purple)] hover:text-white"
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.slice(0, 3).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-[var(--dark-gray)] rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getActivityIcon(activity.type)}
                        <div>
                          <p className="text-white font-medium">{activity.beatTitle}</p>
                          <p className="text-gray-400 text-sm">
                            {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                            {activity.amount && ` - $${activity.amount}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-sm">{formatDate(activity.date)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white">Complete Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-[var(--dark-gray)] rounded-lg hover:bg-gray-700 transition-colors">
                      <div className="flex items-center space-x-4">
                        {getActivityIcon(activity.type)}
                        <div>
                          <p className="text-white font-medium">{activity.beatTitle}</p>
                          <p className="text-gray-400 text-sm">
                            {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                            {activity.amount && ` - $${activity.amount}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">{formatDate(activity.date)}</p>
                        {activity.amount && (
                          <p className="text-[var(--accent-green)] font-medium">${activity.amount}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white">Personalized Recommendations</CardTitle>
                <p className="text-gray-400">Based on your listening history and preferences</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.map((beat) => (
                    <div key={beat.id} className="bg-[var(--dark-gray)] rounded-lg p-4 hover:bg-gray-700 transition-colors">
                      <div className="aspect-square bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                        <img
                          src={beat.imageUrl}
                          alt={beat.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-white font-bold truncate">{beat.title}</h3>
                          <Badge className="bg-[var(--accent-green)]">
                            {beat.matchScore}% match
                          </Badge>
                        </div>
                        
                        <p className="text-gray-400 text-sm">by {beat.artist}</p>
                        <p className="text-gray-400 text-xs">{beat.reason}</p>
                        
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[var(--accent-purple)] font-bold">${beat.price}</span>
                          <Button size="sm" className="btn-primary">
                            Listen
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Email</label>
                    <div className="text-white bg-[var(--dark-gray)] p-3 rounded-lg">
                      {typedUser?.email || 'user@example.com'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Subscription</label>
                    <div className="flex items-center justify-between bg-[var(--dark-gray)] p-3 rounded-lg">
                      <span className="text-white">{typedUser?.subscription || 'Free'} Plan</span>
                      <Button size="sm" variant="outline" className="border-[var(--accent-purple)] text-[var(--accent-purple)]">
                        Manage
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Notifications</label>
                    <div className="bg-[var(--dark-gray)] p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white">New releases</span>
                        <Button size="sm" variant="outline" className="border-[var(--medium-gray)] text-white">
                          Enabled
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white">Personalized recommendations</span>
                        <Button size="sm" variant="outline" className="border-[var(--medium-gray)] text-white">
                          Enabled
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}