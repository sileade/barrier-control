import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Car, 
  Shield, 
  ShieldAlert, 
  Activity,
  TrendingUp,
  Clock
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.passages.stats.useQuery({ days: 30 });
  const { data: dailyStats, isLoading: dailyLoading } = trpc.passages.dailyStats.useQuery({ days: 7 });
  const { data: recentPassages, isLoading: passagesLoading } = trpc.passages.list.useQuery({ limit: 5 });

  const chartData = dailyStats?.map(d => ({
    date: new Date(d.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' }),
    allowed: Number(d.allowed) || 0,
    denied: Number(d.denied) || 0,
    total: Number(d.total) || 0,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || 'User'}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          System Online
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Passages</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allowed</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-500">{stats?.allowed || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.total ? ((Number(stats.allowed) / Number(stats.total)) * 100).toFixed(1) : 0}% of total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denied</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-500">{stats?.denied || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.total ? ((Number(stats.denied) / Number(stats.total)) * 100).toFixed(1) : 0}% of total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Opens</CardTitle>
            <Car className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-500">{stats?.manual || 0}</div>
                <p className="text-xs text-muted-foreground">Manual barrier activations</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="allowed" 
                    stackId="1"
                    stroke="hsl(142.1 76.2% 36.3%)" 
                    fill="hsl(142.1 76.2% 36.3% / 0.3)" 
                    name="Allowed"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="denied" 
                    stackId="1"
                    stroke="hsl(0 72% 51%)" 
                    fill="hsl(0 72% 51% / 0.3)" 
                    name="Denied"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Daily Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="allowed" fill="hsl(142.1 76.2% 36.3%)" name="Allowed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="denied" fill="hsl(0 72% 51%)" name="Denied" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Passages */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Passages</CardTitle>
        </CardHeader>
        <CardContent>
          {passagesLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentPassages && recentPassages.length > 0 ? (
            <div className="space-y-3">
              {recentPassages.map((passage) => (
                <div 
                  key={passage.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${passage.isAllowed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {passage.isAllowed ? (
                        <Shield className="h-4 w-4 text-green-500" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{passage.licensePlate}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(passage.timestamp).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={passage.isAllowed ? "default" : "destructive"}>
                    {passage.isAllowed ? 'Allowed' : 'Denied'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No passages recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
