import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Bell, 
  RefreshCw, 
  Download, 
  Filter, 
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  AlertTriangle,
  Car,
  ShieldAlert,
  Hand,
  FileText,
  Eye,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";

type NotificationType = 'unknown_vehicle' | 'blacklist_detected' | 'manual_open' | 'unauthorized_access' | 'daily_summary' | 'quiet_hours_summary';
type NotificationStatus = 'sent' | 'failed' | 'pending';
type NotificationChannel = 'email' | 'telegram' | 'both';

export default function NotificationHistory() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [plateFilter, setPlateFilter] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { data: notifications, isLoading, refetch } = trpc.notificationHistory.list.useQuery({
    limit: 100,
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    licensePlate: plateFilter || undefined,
  });

  const { data: statsData } = trpc.notificationHistory.stats.useQuery();

  const resendMutation = trpc.notificationHistory.resend.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Уведомление успешно отправлено повторно");
      } else {
        toast.error(`Ошибка отправки: ${result.errorMessage}`);
      }
      refetch();
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  const { data: exportData, refetch: exportCsv } = trpc.notificationHistory.export.useQuery(
    {
      type: typeFilter !== "all" ? typeFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    { enabled: false }
  );

  const handleExport = async () => {
    const result = await exportCsv();
    if (result.data?.csv) {
      const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notification_history_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Экспортировано ${result.data.count} записей`);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'unknown_vehicle':
        return <Car className="h-4 w-4" />;
      case 'blacklist_detected':
        return <ShieldAlert className="h-4 w-4" />;
      case 'manual_open':
        return <Hand className="h-4 w-4" />;
      case 'unauthorized_access':
        return <AlertTriangle className="h-4 w-4" />;
      case 'daily_summary':
      case 'quiet_hours_summary':
        return <FileText className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'unknown_vehicle':
        return 'Неизвестный автомобиль';
      case 'blacklist_detected':
        return 'Чёрный список';
      case 'manual_open':
        return 'Ручное открытие';
      case 'unauthorized_access':
        return 'Несанкционированный доступ';
      case 'daily_summary':
        return 'Ежедневная сводка';
      case 'quiet_hours_summary':
        return 'Сводка тихих часов';
      default:
        return type;
    }
  };

  const getTypeBadgeVariant = (type: NotificationType) => {
    switch (type) {
      case 'blacklist_detected':
      case 'unauthorized_access':
        return 'destructive';
      case 'unknown_vehicle':
        return 'secondary';
      case 'manual_open':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: NotificationStatus) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: NotificationStatus) => {
    switch (status) {
      case 'sent':
        return 'Отправлено';
      case 'failed':
        return 'Ошибка';
      case 'pending':
        return 'Ожидает';
      default:
        return status;
    }
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'telegram':
        return <MessageSquare className="h-4 w-4" />;
      case 'both':
        return (
          <div className="flex gap-1">
            <Mail className="h-4 w-4" />
            <MessageSquare className="h-4 w-4" />
          </div>
        );
      default:
        return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: 'secondary',
      medium: 'default',
      high: 'destructive',
      critical: 'destructive',
    };
    const labels: Record<string, string> = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      critical: 'Критический',
    };
    return (
      <Badge variant={variants[severity] || 'default'}>
        {labels[severity] || severity}
      </Badge>
    );
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">История уведомлений</h1>
            <p className="text-muted-foreground">
              Журнал всех отправленных уведомлений с возможностью повторной отправки
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Обновить
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Экспорт CSV
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData?.stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">уведомлений в системе</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Отправлено</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statsData?.stats?.sent || 0}</div>
              <p className="text-xs text-muted-foreground">успешно доставлено</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ошибки</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{statsData?.stats?.failed || 0}</div>
              <p className="text-xs text-muted-foreground">не удалось отправить</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ожидают</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{statsData?.stats?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">в очереди</p>
            </CardContent>
          </Card>
        </div>

        {/* By Type Statistics */}
        {statsData?.byType && statsData.byType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Статистика по типам</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {statsData.byType.map((item: any) => (
                  <div key={item.type} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    {getTypeIcon(item.type)}
                    <div>
                      <p className="text-sm font-medium">{getTypeLabel(item.type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.count} ({item.sent} отпр.)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Фильтры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Тип уведомления</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все типы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="unknown_vehicle">Неизвестный автомобиль</SelectItem>
                    <SelectItem value="blacklist_detected">Чёрный список</SelectItem>
                    <SelectItem value="manual_open">Ручное открытие</SelectItem>
                    <SelectItem value="unauthorized_access">Несанкционированный доступ</SelectItem>
                    <SelectItem value="daily_summary">Ежедневная сводка</SelectItem>
                    <SelectItem value="quiet_hours_summary">Сводка тихих часов</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все статусы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="sent">Отправлено</SelectItem>
                    <SelectItem value="failed">Ошибка</SelectItem>
                    <SelectItem value="pending">Ожидает</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Номер авто</Label>
                <Input
                  placeholder="Поиск по номеру..."
                  value={plateFilter}
                  onChange={(e) => setPlateFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Журнал уведомлений</CardTitle>
            <CardDescription>
              {notifications?.length || 0} записей найдено
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Тип</TableHead>
                      <TableHead>Заголовок</TableHead>
                      <TableHead>Номер авто</TableHead>
                      <TableHead>Важность</TableHead>
                      <TableHead>Канал</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((notification: any) => (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(notification.type)}
                            <Badge variant={getTypeBadgeVariant(notification.type)}>
                              {getTypeLabel(notification.type)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {notification.title}
                        </TableCell>
                        <TableCell>
                          {notification.licensePlate ? (
                            <Badge variant="outline" className="font-mono">
                              {notification.licensePlate}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getSeverityBadge(notification.severity)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getChannelIcon(notification.channel)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(notification.status)}
                            <span className={
                              notification.status === 'sent' ? 'text-green-600' :
                              notification.status === 'failed' ? 'text-red-600' :
                              'text-yellow-600'
                            }>
                              {getStatusLabel(notification.status)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(notification.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedNotification(notification);
                                setShowDetails(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendMutation.mutate({ id: notification.id })}
                              disabled={resendMutation.isPending}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Нет уведомлений</h3>
                <p className="text-muted-foreground">
                  История уведомлений пуста или не соответствует фильтрам
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedNotification && getTypeIcon(selectedNotification.type)}
                Детали уведомления
              </DialogTitle>
              <DialogDescription>
                ID: {selectedNotification?.id}
              </DialogDescription>
            </DialogHeader>
            {selectedNotification && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Тип</Label>
                    <p className="font-medium">{getTypeLabel(selectedNotification.type)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Статус</Label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedNotification.status)}
                      <span>{getStatusLabel(selectedNotification.status)}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Важность</Label>
                    <div>{getSeverityBadge(selectedNotification.severity)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Канал</Label>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(selectedNotification.channel)}
                      <span className="capitalize">{selectedNotification.channel}</span>
                    </div>
                  </div>
                  {selectedNotification.licensePlate && (
                    <div>
                      <Label className="text-muted-foreground">Номер авто</Label>
                      <Badge variant="outline" className="font-mono">
                        {selectedNotification.licensePlate}
                      </Badge>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Попыток отправки</Label>
                    <p>{selectedNotification.retryCount || 0}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Заголовок</Label>
                  <p className="font-medium">{selectedNotification.title}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Сообщение</Label>
                  <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                    {selectedNotification.message}
                  </div>
                </div>

                {selectedNotification.errorMessage && (
                  <div>
                    <Label className="text-muted-foreground text-red-500">Ошибка</Label>
                    <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-red-600 text-sm">
                      {selectedNotification.errorMessage}
                    </div>
                  </div>
                )}

                {selectedNotification.photoUrl && (
                  <div>
                    <Label className="text-muted-foreground">Фото</Label>
                    <img
                      src={selectedNotification.photoUrl}
                      alt="Фото"
                      className="mt-2 rounded-lg max-h-48 object-cover"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <Label className="text-muted-foreground">Создано</Label>
                    <p>{formatDate(selectedNotification.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Отправлено</Label>
                    <p>{formatDate(selectedNotification.sentAt)}</p>
                  </div>
                  {selectedNotification.lastRetryAt && (
                    <div>
                      <Label className="text-muted-foreground">Последняя попытка</Label>
                      <p>{formatDate(selectedNotification.lastRetryAt)}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowDetails(false)}>
                    Закрыть
                  </Button>
                  <Button
                    onClick={() => {
                      resendMutation.mutate({ id: selectedNotification.id });
                      setShowDetails(false);
                    }}
                    disabled={resendMutation.isPending}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Отправить повторно
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
