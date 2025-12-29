import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, 
  Camera, 
  Key, 
  Save,
  RefreshCw,
  Shield,
  Database,
  Bell
} from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const [cameraUrl, setCameraUrl] = useState("");
  const [medicalApiKey, setMedicalApiKey] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");

  const { data: settings, isLoading } = trpc.settings.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  useEffect(() => {
    if (settings) {
      const camera = settings.find(s => s.key === "camera_url");
      const apiKey = settings.find(s => s.key === "medical_api_key");
      const email = settings.find(s => s.key === "notification_email");
      
      if (camera?.value) setCameraUrl(camera.value);
      if (apiKey?.value) setMedicalApiKey(apiKey.value);
      if (email?.value) setNotificationEmail(email.value);
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

  const handleSaveEmail = () => {
    saveMutation.mutate({
      key: "notification_email",
      value: notificationEmail,
      description: "Email for system notifications",
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
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6">
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

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure system notifications and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notification-email">Notification Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="notification-email"
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="flex-1"
                  />
                  <Button onClick={handleSaveEmail} disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Email address for receiving system alerts and notifications about unauthorized access attempts.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Notification Events</Label>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Unknown vehicle detected</li>
                  <li>• Manual barrier activation</li>
                  <li>• System errors and warnings</li>
                  <li>• Daily activity summary</li>
                </ul>
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
                  <span className="ml-2 font-medium">1.0.0</span>
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
