import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, 
  Camera, 
  Save,
  RefreshCw,
  Shield,
  Database,
  Bell,
  Mail,
  Car,
  DoorOpen,
  AlertTriangle,
  Calendar,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Bot,
  MessageCircle
} from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  // Camera settings
  const [cameraUrl, setCameraUrl] = useState("");
  
  // Medical API settings
  const [medicalApiKey, setMedicalApiKey] = useState("");
  
  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [unknownVehicleNotify, setUnknownVehicleNotify] = useState(true);
  const [manualOpenNotify, setManualOpenNotify] = useState(true);
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(false);
  
  // Telegram settings
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramBotName, setTelegramBotName] = useState("");
  const [telegramNotifyAllowed, setTelegramNotifyAllowed] = useState(false);

  const { data: settings, isLoading } = trpc.settings.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  useEffect(() => {
    if (settings) {
      const camera = settings.find(s => s.key === "camera_url");
      const apiKey = settings.find(s => s.key === "medical_api_key");
      const notifEnabled = settings.find(s => s.key === "notifications_enabled");
      const unknownNotify = settings.find(s => s.key === "unknown_vehicle_notify");
      const manualNotify = settings.find(s => s.key === "manual_open_notify");
      const dailySummary = settings.find(s => s.key === "daily_summary_enabled");
      const tgEnabled = settings.find(s => s.key === "telegram_enabled");
      const tgBotToken = settings.find(s => s.key === "telegram_bot_token");
      const tgChatId = settings.find(s => s.key === "telegram_chat_id");
      const tgNotifyAllowed = settings.find(s => s.key === "telegram_notify_allowed");
      
      if (camera?.value) setCameraUrl(camera.value);
      if (apiKey?.value) setMedicalApiKey(apiKey.value);
      if (notifEnabled) setNotificationsEnabled(notifEnabled.value !== 'false');
      if (unknownNotify) setUnknownVehicleNotify(unknownNotify.value !== 'false');
      if (manualNotify) setManualOpenNotify(manualNotify.value !== 'false');
      if (dailySummary) setDailySummaryEnabled(dailySummary.value === 'true');
      if (tgEnabled) setTelegramEnabled(tgEnabled.value === 'true');
      if (tgBotToken?.value) setTelegramBotToken(tgBotToken.value);
      if (tgChatId?.value) setTelegramChatId(tgChatId.value);
      if (tgNotifyAllowed) setTelegramNotifyAllowed(tgNotifyAllowed.value === 'true');
    }
  }, [settings]);

  const saveMutation = trpc.settings.set.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
      utils.settings.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const testTelegramMutation = trpc.telegram.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Telegram connection successful! Check your Telegram for a test message.");
      } else {
        toast.error(`Telegram test failed: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to test Telegram connection");
    },
  });

  const getBotInfoMutation = trpc.telegram.getBotInfo.useMutation({
    onSuccess: (result) => {
      if (result.success && result.botName) {
        setTelegramBotName(result.botName);
        toast.success(`Bot verified: @${result.botName}`);
      } else {
        toast.error(`Invalid bot token: ${result.error}`);
        setTelegramBotName("");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to verify bot token");
      setTelegramBotName("");
    },
  });

  const handleSaveCameraUrl = () => {
    saveMutation.mutate({
      key: "camera_url",
      value: cameraUrl,
      description: "IP camera stream URL for license plate recognition",
    });
  };

  const handleSaveApiKey = () => {
    saveMutation.mutate({
      key: "medical_api_key",
      value: medicalApiKey,
      description: "API key for external medical database integration",
    });
  };

  const handleToggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    saveMutation.mutate({
      key: "notifications_enabled",
      value: enabled.toString(),
      description: "Enable/disable all notifications",
    });
  };

  const handleToggleUnknownVehicle = (enabled: boolean) => {
    setUnknownVehicleNotify(enabled);
    saveMutation.mutate({
      key: "unknown_vehicle_notify",
      value: enabled.toString(),
      description: "Notify when unknown vehicle is detected",
    });
  };

  const handleToggleManualOpen = (enabled: boolean) => {
    setManualOpenNotify(enabled);
    saveMutation.mutate({
      key: "manual_open_notify",
      value: enabled.toString(),
      description: "Notify when barrier is manually opened",
    });
  };

  const handleToggleDailySummary = (enabled: boolean) => {
    setDailySummaryEnabled(enabled);
    saveMutation.mutate({
      key: "daily_summary_enabled",
      value: enabled.toString(),
      description: "Send daily activity summary",
    });
  };

  const handleToggleTelegram = (enabled: boolean) => {
    setTelegramEnabled(enabled);
    saveMutation.mutate({
      key: "telegram_enabled",
      value: enabled.toString(),
      description: "Enable/disable Telegram notifications",
    });
  };

  const handleToggleTelegramAllowed = (enabled: boolean) => {
    setTelegramNotifyAllowed(enabled);
    saveMutation.mutate({
      key: "telegram_notify_allowed",
      value: enabled.toString(),
      description: "Notify about allowed vehicle passages",
    });
  };

  const handleSaveTelegramSettings = async () => {
    // Save bot token
    await saveMutation.mutateAsync({
      key: "telegram_bot_token",
      value: telegramBotToken,
      description: "Telegram bot token from @BotFather",
    });
    
    // Save chat ID
    await saveMutation.mutateAsync({
      key: "telegram_chat_id",
      value: telegramChatId,
      description: "Telegram chat ID for notifications",
    });
    
    toast.success("Telegram settings saved");
  };

  const handleTestTelegram = () => {
    if (!telegramBotToken || !telegramChatId) {
      toast.error("Please enter bot token and chat ID first");
      return;
    }
    testTelegramMutation.mutate({
      botToken: telegramBotToken,
      chatId: telegramChatId,
    });
  };

  const handleVerifyBotToken = () => {
    if (!telegramBotToken) {
      toast.error("Please enter bot token first");
      return;
    }
    getBotInfoMutation.mutate({
      botToken: telegramBotToken,
    });
  };

  const generateApiKey = () => {
    const key = `med_${Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`;
    setMedicalApiKey(key);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need administrator privileges to access system settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure system parameters and integrations</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Telegram Integration */}
          <Card className="border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                Telegram Notifications
              </CardTitle>
              <CardDescription>
                Receive instant notifications on your phone via Telegram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-blue-500" />
                  <div>
                    <Label htmlFor="telegram-enabled" className="text-base font-medium">
                      Enable Telegram
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications to Telegram in addition to email
                    </p>
                  </div>
                </div>
                <Switch
                  id="telegram-enabled"
                  checked={telegramEnabled}
                  onCheckedChange={handleToggleTelegram}
                  disabled={saveMutation.isPending}
                />
              </div>

              <Separator />

              {/* Bot configuration */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Bot Configuration</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="bot-token">Bot Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bot-token"
                      value={telegramBotToken}
                      onChange={(e) => {
                        setTelegramBotToken(e.target.value);
                        setTelegramBotName("");
                      }}
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      className="flex-1 font-mono text-sm"
                      type="password"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleVerifyBotToken}
                      disabled={getBotInfoMutation.isPending || !telegramBotToken}
                    >
                      {getBotInfoMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : telegramBotName ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                  {telegramBotName && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected to @{telegramBotName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Get your bot token from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@BotFather</a> on Telegram
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chat-id">Chat ID</Label>
                  <Input
                    id="chat-id"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="-1001234567890 or 123456789"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your personal chat ID or group/channel ID. Use <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@userinfobot</a> to get your ID
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveTelegramSettings} disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleTestTelegram}
                    disabled={testTelegramMutation.isPending || !telegramBotToken || !telegramChatId}
                  >
                    {testTelegramMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4 mr-2" />
                    )}
                    Send Test Message
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Telegram notification options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Telegram Notification Options</h4>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <Label htmlFor="telegram-allowed" className="font-medium">
                        Allowed Vehicle Passages
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Also notify when registered vehicles pass
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="telegram-allowed"
                    checked={telegramNotifyAllowed}
                    onCheckedChange={handleToggleTelegramAllowed}
                    disabled={!telegramEnabled || saveMutation.isPending}
                  />
                </div>
              </div>

              {/* Setup instructions */}
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="text-sm font-medium mb-2">Quick Setup Guide</h4>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Open Telegram and search for @BotFather</li>
                  <li>Send /newbot and follow the instructions to create a bot</li>
                  <li>Copy the bot token and paste it above</li>
                  <li>Start a chat with your new bot</li>
                  <li>Get your Chat ID from @userinfobot</li>
                  <li>Click "Send Test Message" to verify the connection</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure email alerts for security events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <Label htmlFor="notifications-enabled" className="text-base font-medium">
                      Enable Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Master switch for all email notifications
                    </p>
                  </div>
                </div>
                <Switch
                  id="notifications-enabled"
                  checked={notificationsEnabled}
                  onCheckedChange={handleToggleNotifications}
                  disabled={saveMutation.isPending}
                />
              </div>

              <Separator />

              {/* Individual notification settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Notification Types</h4>
                
                {/* Unknown vehicle notification */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Car className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <Label htmlFor="unknown-vehicle" className="font-medium">
                        Unknown Vehicle Detected
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Alert when unregistered vehicle attempts access
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="unknown-vehicle"
                    checked={unknownVehicleNotify}
                    onCheckedChange={handleToggleUnknownVehicle}
                    disabled={!notificationsEnabled || saveMutation.isPending}
                  />
                </div>

                {/* Manual open notification */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <DoorOpen className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                      <Label htmlFor="manual-open" className="font-medium">
                        Manual Barrier Open
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Alert when barrier is manually activated
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="manual-open"
                    checked={manualOpenNotify}
                    onCheckedChange={handleToggleManualOpen}
                    disabled={!notificationsEnabled || saveMutation.isPending}
                  />
                </div>

                {/* Daily summary */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <Label htmlFor="daily-summary" className="font-medium">
                        Daily Summary
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Receive daily activity report
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="daily-summary"
                    checked={dailySummaryEnabled}
                    onCheckedChange={handleToggleDailySummary}
                    disabled={!notificationsEnabled || saveMutation.isPending}
                  />
                </div>
              </div>

              <Separator />

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Notification Delivery</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Notifications are sent to the project owner via the Manus notification system.
                      You will receive alerts in your Manus dashboard and connected email.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Camera Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera Configuration
              </CardTitle>
              <CardDescription>
                Configure the IP camera for license plate recognition
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="camera-url">Camera Stream URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="camera-url"
                    value={cameraUrl}
                    onChange={(e) => setCameraUrl(e.target.value)}
                    placeholder="rtsp://192.168.1.100:554/stream1"
                    className="flex-1"
                  />
                  <Button onClick={handleSaveCameraUrl} disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the RTSP or HTTP stream URL of your IP camera. Supported formats: RTSP, HTTP/MJPEG.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Medical Database API */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Medical Database API
              </CardTitle>
              <CardDescription>
                Configure API access for external medical database integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    value={medicalApiKey}
                    onChange={(e) => setMedicalApiKey(e.target.value)}
                    placeholder="med_xxxxxxxxxxxxxxxx"
                    className="flex-1 font-mono"
                    type="password"
                  />
                  <Button variant="outline" onClick={generateApiKey}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                  <Button onClick={handleSaveApiKey} disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This API key is required for external systems to sync medical records with this system.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>API Endpoint</Label>
                <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                  POST /api/trpc/medical.sync
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this endpoint to sync medical records from external systems.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Request Example</Label>
                <pre className="p-3 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
{`{
  "apiKey": "your_api_key_here",
  "records": [
    {
      "licensePlate": "A123BC777",
      "driverName": "John Doe",
      "driverPhone": "+7 999 123 4567",
      "medicalStatus": "valid",
      "expirationDate": "2025-12-31"
    }
  ]
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Version:</span>
                  <span className="ml-2 font-medium">1.2.0</span>
                </div>
                <div>
                  <span className="text-muted-foreground">User:</span>
                  <span className="ml-2 font-medium">{user?.name || user?.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Role:</span>
                  <span className="ml-2 font-medium capitalize">{user?.role}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium text-green-500">Online</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
