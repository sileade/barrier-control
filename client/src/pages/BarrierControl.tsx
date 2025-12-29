import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  Camera, 
  DoorOpen, 
  Shield, 
  ShieldAlert, 
  Scan,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";

export default function BarrierControl() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  const [cameraUrl, setCameraUrl] = useState("");
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    plate: string | null;
    confidence: number;
    isAllowed: boolean;
    barrierOpened: boolean | undefined;
  } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: cameraSetting } = trpc.settings.get.useQuery({ key: "camera_url" });
  
  useEffect(() => {
    if (cameraSetting?.value) {
      setCameraUrl(cameraSetting.value);
    }
  }, [cameraSetting]);

  const openBarrierMutation = trpc.barrier.open.useMutation({
    onSuccess: () => {
      toast.success("Barrier opened successfully");
      utils.passages.list.invalidate();
      utils.passages.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to open barrier");
    },
  });

  const recognizeMutation = trpc.recognition.analyze.useMutation({
    onSuccess: (result) => {
      setLastResult(result);
      setIsScanning(false);
      
      if (result.isAllowed && result.barrierOpened) {
        toast.success(`Access granted for ${result.plate}`);
      } else if (result.isAllowed) {
        toast.success(`Recognized: ${result.plate} (allowed)`);
      } else if (result.plate) {
        toast.warning(`Unknown vehicle: ${result.plate}`);
      } else {
        toast.error("Could not recognize license plate");
      }
      
      utils.passages.list.invalidate();
      utils.passages.stats.invalidate();
    },
    onError: (error) => {
      setIsScanning(false);
      toast.error(error.message || "Recognition failed");
    },
  });

  const saveCameraUrlMutation = trpc.settings.set.useMutation({
    onSuccess: () => {
      toast.success("Camera URL saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save camera URL");
    },
  });

  const captureAndRecognize = useCallback(async () => {
    if (!canvasRef.current) return;
    
    setIsScanning(true);
    setLastResult(null);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      toast.error("Canvas not available");
      setIsScanning(false);
      return;
    }

    // If video is available, capture from it
    if (videoRef.current && videoRef.current.readyState >= 2) {
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      ctx.drawImage(videoRef.current, 0, 0);
    } else {
      // Demo mode - create a placeholder image
      canvas.width = 640;
      canvas.height = 480;
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "24px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Demo Mode - No Camera", canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillText("Simulating recognition...", canvas.width / 2, canvas.height / 2 + 20);
    }

    const imageBase64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
    recognizeMutation.mutate({ imageBase64, autoOpen });
  }, [autoOpen, recognizeMutation]);

  const handleManualOpen = () => {
    setIsOpenDialogOpen(true);
  };

  const confirmManualOpen = () => {
    openBarrierMutation.mutate({ confirm: true });
    setIsOpenDialogOpen(false);
  };

  const handleSaveCameraUrl = () => {
    if (user?.role === "admin") {
      saveCameraUrlMutation.mutate({
        key: "camera_url",
        value: cameraUrl,
        description: "IP camera stream URL",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Barrier Control</h1>
          <p className="text-muted-foreground">Monitor camera and control barrier access</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${cameraUrl ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
          {cameraUrl ? "Camera Connected" : "No Camera"}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Camera Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Live Camera Feed
            </CardTitle>
            <CardDescription>
              Real-time video stream from the entrance camera
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {cameraUrl ? (
                <video
                  ref={videoRef}
                  src={cameraUrl}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                  onError={() => toast.error("Failed to load camera stream")}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <Camera className="h-16 w-16 mb-4 opacity-50" />
                  <p>No camera configured</p>
                  <p className="text-sm">Enter camera URL in settings below</p>
                </div>
              )}
              
              {/* Scanning overlay */}
              {isScanning && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Scan className="h-16 w-16 mx-auto mb-4 animate-pulse" />
                    <p className="text-lg font-medium">Scanning license plate...</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Control buttons */}
            <div className="flex flex-wrap gap-3 mt-4">
              <Button 
                onClick={captureAndRecognize} 
                disabled={isScanning}
                className="flex-1"
              >
                <Scan className="h-4 w-4 mr-2" />
                {isScanning ? "Scanning..." : "Scan Plate"}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleManualOpen}
                disabled={openBarrierMutation.isPending}
                className="flex-1"
              >
                <DoorOpen className="h-4 w-4 mr-2" />
                Manual Open
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Control Panel */}
        <div className="space-y-6">
          {/* Last Recognition Result */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Last Recognition</CardTitle>
            </CardHeader>
            <CardContent>
              {lastResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Plate:</span>
                    <span className="font-mono font-bold text-lg">
                      {lastResult.plate || "Not detected"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Confidence:</span>
                    <Badge 
                      variant="outline"
                      className={
                        lastResult.confidence >= 80 
                          ? "border-green-500 text-green-500" 
                          : lastResult.confidence >= 50 
                            ? "border-yellow-500 text-yellow-500"
                            : "border-red-500 text-red-500"
                      }
                    >
                      {lastResult.confidence}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    {lastResult.isAllowed ? (
                      <Badge className="bg-green-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Allowed
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Denied
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Barrier:</span>
                    <Badge variant="outline">
                      {lastResult.barrierOpened ? "Opened" : "Closed"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recent scans</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auto-Open Setting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-open">Auto-open barrier</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically open for allowed plates
                  </p>
                </div>
                <Switch
                  id="auto-open"
                  checked={autoOpen}
                  onCheckedChange={setAutoOpen}
                />
              </div>
              
              {user?.role === "admin" && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="camera-url">Camera URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="camera-url"
                      value={cameraUrl}
                      onChange={(e) => setCameraUrl(e.target.value)}
                      placeholder="rtsp://camera-ip/stream"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleSaveCameraUrl}
                      disabled={saveCameraUrlMutation.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 ${saveCameraUrlMutation.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter IP camera stream URL (RTSP/HTTP)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={captureAndRecognize}>
                <Scan className="h-4 w-4 mr-2" />
                Quick Scan
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive" onClick={handleManualOpen}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Emergency Open
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Manual Open Confirmation Dialog */}
      <AlertDialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Manual Barrier Open
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to manually open the barrier. This action will be logged.
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmManualOpen} className="bg-destructive">
              <DoorOpen className="h-4 w-4 mr-2" />
              Open Barrier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
