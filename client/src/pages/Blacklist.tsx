import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  ShieldBan, 
  Plus, 
  Pencil, 
  Trash2, 
  AlertTriangle,
  Ban,
  Search,
  Bell,
  BellOff,
  Calendar,
  Car,
  User,
  FileText,
  Download,
  Upload,
  FileUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

type Severity = "low" | "medium" | "high" | "critical";

const severityConfig: Record<Severity, { label: string; color: string; bgColor: string }> = {
  low: { label: "Низкий", color: "text-green-500", bgColor: "bg-green-500/10" },
  medium: { label: "Средний", color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  high: { label: "Высокий", color: "text-orange-500", bgColor: "bg-orange-500/10" },
  critical: { label: "Критический", color: "text-red-500", bgColor: "bg-red-500/10" },
};

export default function Blacklist() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  
  // Import dialog state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "result">("upload");
  const [importCsvData, setImportCsvData] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: { row: number; plate: string; error: string }[];
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    licensePlate: "",
    reason: "",
    severity: "medium" as Severity,
    ownerName: "",
    vehicleModel: "",
    vehicleColor: "",
    notifyOnDetection: true,
    expiresAt: "",
  });

  const { data: entries, isLoading } = trpc.blacklist.list.useQuery(
    { includeInactive: showInactive },
    { refetchInterval: 30000 }
  );

  const { data: stats } = trpc.blacklist.stats.useQuery();

  // Export query
  const exportQuery = trpc.blacklist.export.useQuery(
    { includeInactive: showInactive },
    { enabled: false }
  );

  // Preview import mutation
  const previewImportMutation = trpc.blacklist.previewImport.useMutation({
    onSuccess: (data) => {
      if (!data.hasRequiredFields) {
        toast.error("CSV файл должен содержать колонку 'licensePlate'");
        return;
      }
      setImportStep("preview");
    },
    onError: (error) => {
      toast.error(error.message || "Ошибка при анализе файла");
    },
  });

  // Import mutation
  const importMutation = trpc.blacklist.import.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      setImportStep("result");
      utils.blacklist.list.invalidate();
      utils.blacklist.stats.invalidate();
      
      if (result.imported > 0 || result.updated > 0) {
        toast.success(`Импорт завершён: ${result.imported} добавлено, ${result.updated} обновлено`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Ошибка при импорте");
    },
  });

  const createMutation = trpc.blacklist.create.useMutation({
    onSuccess: () => {
      toast.success("Номер добавлен в чёрный список");
      utils.blacklist.list.invalidate();
      utils.blacklist.stats.invalidate();
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Ошибка при добавлении");
    },
  });

  const updateMutation = trpc.blacklist.update.useMutation({
    onSuccess: () => {
      toast.success("Запись обновлена");
      utils.blacklist.list.invalidate();
      setEditingEntry(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Ошибка при обновлении");
    },
  });

  const deleteMutation = trpc.blacklist.delete.useMutation({
    onSuccess: () => {
      toast.success("Запись удалена из чёрного списка");
      utils.blacklist.list.invalidate();
      utils.blacklist.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Ошибка при удалении");
    },
  });

  const resetForm = () => {
    setFormData({
      licensePlate: "",
      reason: "",
      severity: "medium",
      ownerName: "",
      vehicleModel: "",
      vehicleColor: "",
      notifyOnDetection: true,
      expiresAt: "",
    });
  };

  const resetImport = () => {
    setImportStep("upload");
    setImportCsvData("");
    setImportFileName("");
    setImportResult(null);
    setSkipDuplicates(true);
    setUpdateExisting(false);
  };

  const handleSubmit = () => {
    if (!formData.licensePlate.trim()) {
      toast.error("Введите номер автомобиля");
      return;
    }

    const data = {
      licensePlate: formData.licensePlate.toUpperCase().replace(/\s/g, ''),
      reason: formData.reason || undefined,
      severity: formData.severity,
      ownerName: formData.ownerName || undefined,
      vehicleModel: formData.vehicleModel || undefined,
      vehicleColor: formData.vehicleColor || undefined,
      notifyOnDetection: formData.notifyOnDetection,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setFormData({
      licensePlate: entry.licensePlate,
      reason: entry.reason || "",
      severity: entry.severity,
      ownerName: entry.ownerName || "",
      vehicleModel: entry.vehicleModel || "",
      vehicleColor: entry.vehicleColor || "",
      notifyOnDetection: entry.notifyOnDetection,
      expiresAt: entry.expiresAt ? new Date(entry.expiresAt).toISOString().split('T')[0] : "",
    });
  };

  const handleExport = async () => {
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Экспортировано ${result.data.count} записей`);
      }
    } catch (error) {
      toast.error("Ошибка при экспорте");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Пожалуйста, выберите CSV файл");
      return;
    }

    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportCsvData(text);
      previewImportMutation.mutate({ csvData: text });
    };
    reader.onerror = () => {
      toast.error("Ошибка при чтении файла");
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    importMutation.mutate({
      csvData: importCsvData,
      skipDuplicates,
      updateExisting,
    });
  };

  const filteredEntries = entries?.filter(entry => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.licensePlate.toLowerCase().includes(query) ||
      entry.ownerName?.toLowerCase().includes(query) ||
      entry.reason?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldBan className="h-6 w-6 text-red-500" />
            Чёрный список
          </h1>
          <p className="text-muted-foreground">Управление заблокированными номерами</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Button */}
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={exportQuery.isFetching}
          >
            {exportQuery.isFetching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Экспорт CSV
          </Button>

          {/* Import Button */}
          {isAdmin && (
            <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
              setIsImportDialogOpen(open);
              if (!open) resetImport();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Импорт CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {importStep === "upload" && "Импорт чёрного списка"}
                    {importStep === "preview" && "Предпросмотр импорта"}
                    {importStep === "result" && "Результат импорта"}
                  </DialogTitle>
                  <DialogDescription>
                    {importStep === "upload" && "Загрузите CSV файл с номерами для добавления в чёрный список"}
                    {importStep === "preview" && "Проверьте данные перед импортом"}
                    {importStep === "result" && "Импорт завершён"}
                  </DialogDescription>
                </DialogHeader>

                {/* Upload Step */}
                {importStep === "upload" && (
                  <div className="space-y-4 py-4">
                    <div 
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">
                        {importFileName || "Выберите CSV файл"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Нажмите для выбора или перетащите файл сюда
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Формат CSV файла:</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Обязательная колонка: <code className="bg-muted px-1 rounded">licensePlate</code>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Дополнительные колонки: severity, reason, ownerName, vehicleModel, vehicleColor, notifyOnDetection
                      </p>
                    </div>

                    {previewImportMutation.isPending && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Анализ файла...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview Step */}
                {importStep === "preview" && previewImportMutation.data && (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-center">
                            {previewImportMutation.data.totalRows}
                          </div>
                          <p className="text-xs text-muted-foreground text-center">Всего строк</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-center text-green-500">
                            {previewImportMutation.data.newEntries}
                          </div>
                          <p className="text-xs text-muted-foreground text-center">Новых</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-center text-yellow-500">
                            {previewImportMutation.data.duplicates}
                          </div>
                          <p className="text-xs text-muted-foreground text-center">Дубликатов</p>
                        </CardContent>
                      </Card>
                    </div>

                    {previewImportMutation.data.sampleRows.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Предпросмотр данных:</h4>
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {previewImportMutation.data.headers.slice(0, 5).map((header) => (
                                  <TableHead key={header}>{header}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {previewImportMutation.data.sampleRows.slice(0, 5).map((row, i) => (
                                <TableRow key={i}>
                                  {previewImportMutation.data!.headers.slice(0, 5).map((header) => (
                                    <TableCell key={header} className="max-w-[150px] truncate">
                                      {row[header] || "—"}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h4 className="font-medium">Опции импорта:</h4>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="skipDuplicates"
                          checked={skipDuplicates}
                          onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
                        />
                        <Label htmlFor="skipDuplicates">
                          Пропускать дубликаты (номера, которые уже есть в списке)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="updateExisting"
                          checked={updateExisting}
                          onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
                        />
                        <Label htmlFor="updateExisting">
                          Обновлять существующие записи данными из файла
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Result Step */}
                {importStep === "result" && importResult && (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-center mb-2">
                            <CheckCircle className="h-6 w-6 text-green-500" />
                          </div>
                          <div className="text-2xl font-bold text-center">{importResult.imported}</div>
                          <p className="text-xs text-muted-foreground text-center">Добавлено</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-center mb-2">
                            <Pencil className="h-6 w-6 text-blue-500" />
                          </div>
                          <div className="text-2xl font-bold text-center">{importResult.updated}</div>
                          <p className="text-xs text-muted-foreground text-center">Обновлено</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-center mb-2">
                            <AlertCircle className="h-6 w-6 text-yellow-500" />
                          </div>
                          <div className="text-2xl font-bold text-center">{importResult.skipped}</div>
                          <p className="text-xs text-muted-foreground text-center">Пропущено</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-center mb-2">
                            <XCircle className="h-6 w-6 text-red-500" />
                          </div>
                          <div className="text-2xl font-bold text-center">{importResult.errors.length}</div>
                          <p className="text-xs text-muted-foreground text-center">Ошибок</p>
                        </CardContent>
                      </Card>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 text-red-500">Ошибки импорта:</h4>
                        <div className="rounded-md border max-h-[200px] overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Строка</TableHead>
                                <TableHead>Номер</TableHead>
                                <TableHead>Ошибка</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importResult.errors.map((error, i) => (
                                <TableRow key={i}>
                                  <TableCell>{error.row}</TableCell>
                                  <TableCell className="font-mono">{error.plate}</TableCell>
                                  <TableCell className="text-red-500">{error.error}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter>
                  {importStep === "upload" && (
                    <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                      Отмена
                    </Button>
                  )}
                  {importStep === "preview" && (
                    <>
                      <Button variant="outline" onClick={() => {
                        setImportStep("upload");
                        setImportCsvData("");
                        setImportFileName("");
                      }}>
                        Назад
                      </Button>
                      <Button 
                        onClick={handleImport}
                        disabled={importMutation.isPending}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {importMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Импорт...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Импортировать
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  {importStep === "result" && (
                    <Button onClick={() => {
                      setIsImportDialogOpen(false);
                      resetImport();
                    }}>
                      Готово
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Add Button */}
          {isAdmin && (
            <Dialog open={isAddDialogOpen || !!editingEntry} onOpenChange={(open) => {
              if (!open) {
                setIsAddDialogOpen(false);
                setEditingEntry(null);
                resetForm();
              } else {
                setIsAddDialogOpen(true);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingEntry ? "Редактировать запись" : "Добавить в чёрный список"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingEntry 
                      ? "Измените информацию о заблокированном автомобиле"
                      : "Добавьте номер автомобиля для блокировки доступа"
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="licensePlate">Номер автомобиля *</Label>
                    <Input
                      id="licensePlate"
                      value={formData.licensePlate}
                      onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                      placeholder="A123BC777"
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="severity">Уровень угрозы</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(value: Severity) => setFormData({ ...formData, severity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🟢 Низкий</SelectItem>
                        <SelectItem value="medium">🟡 Средний</SelectItem>
                        <SelectItem value="high">🟠 Высокий</SelectItem>
                        <SelectItem value="critical">🔴 Критический</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Причина блокировки</Label>
                    <Textarea
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Опишите причину добавления в чёрный список..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ownerName">Владелец</Label>
                      <Input
                        id="ownerName"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        placeholder="ФИО"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleModel">Модель</Label>
                      <Input
                        id="vehicleModel"
                        value={formData.vehicleModel}
                        onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                        placeholder="Toyota Camry"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleColor">Цвет</Label>
                      <Input
                        id="vehicleColor"
                        value={formData.vehicleColor}
                        onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value })}
                        placeholder="Чёрный"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiresAt">Срок действия</Label>
                      <Input
                        id="expiresAt"
                        type="date"
                        value={formData.expiresAt}
                        onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="notify" className="text-sm">
                        Уведомлять при обнаружении
                      </Label>
                    </div>
                    <Switch
                      id="notify"
                      checked={formData.notifyOnDetection}
                      onCheckedChange={(checked) => setFormData({ ...formData, notifyOnDetection: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingEntry(null);
                    resetForm();
                  }}>
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {editingEntry ? "Сохранить" : "Добавить"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего в списке</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active ?? 0}</div>
            <p className="text-xs text-muted-foreground">активных записей</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Попыток проезда</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAttempts ?? 0}</div>
            <p className="text-xs text-muted-foreground">заблокировано</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего записей</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">включая неактивные</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру, владельцу или причине..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm whitespace-nowrap">
                Показать неактивные
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blacklist Table */}
      <Card>
        <CardHeader>
          <CardTitle>Заблокированные номера</CardTitle>
          <CardDescription>
            Автомобили из этого списка не смогут проехать через шлагбаум
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredEntries && filteredEntries.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Номер</TableHead>
                    <TableHead>Уровень</TableHead>
                    <TableHead className="hidden md:table-cell">Причина</TableHead>
                    <TableHead className="hidden lg:table-cell">Владелец</TableHead>
                    <TableHead className="hidden lg:table-cell">Попытки</TableHead>
                    <TableHead className="hidden md:table-cell">Уведомления</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className={!entry.isActive ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono font-medium">{entry.licensePlate}</span>
                          {!entry.isActive && (
                            <Badge variant="outline" className="text-xs">Неактивен</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${severityConfig[entry.severity as Severity].color} ${severityConfig[entry.severity as Severity].bgColor}`}
                        >
                          {severityConfig[entry.severity as Severity].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                        {entry.reason || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {entry.ownerName ? (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[120px]">{entry.ownerName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="secondary">{entry.attemptCount}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {entry.notifyOnDetection ? (
                          <Bell className="h-4 w-4 text-green-500" />
                        ) : (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(entry)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Удалить из чёрного списка?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Автомобиль с номером <strong>{entry.licensePlate}</strong> будет удалён из чёрного списка.
                                      Это действие можно отменить, добавив номер снова.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate({ id: entry.id })}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Удалить
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ShieldBan className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Чёрный список пуст</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? "Записи не найдены по вашему запросу"
                  : "Добавьте номера автомобилей для блокировки доступа"
                }
              </p>
              {isAdmin && !searchQuery && (
                <div className="flex justify-center gap-2">
                  <Button onClick={() => setIsAddDialogOpen(true)} className="bg-red-600 hover:bg-red-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить вручную
                  </Button>
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Импортировать CSV
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
