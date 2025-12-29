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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { 
  Camera, 
  DoorOpen, 
  Shield, 
  Scan,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Grid2X2,
  Grid3X3,
  Square,
  Maximize2,
  Minimize2,
  Star,
  StarOff,
  Wifi,
  WifiOff
} from "lucide-react";

type ViewMode = "single" | "grid2x2" | "grid3x3";

interface CameraFeed {
  id: number;
  name: string;
  url: string;
  isPrimary: boolean;
  status: "online" | "offline" | "error";
}

export default function BarrierControl() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  const [cameraUrl, setCameraUrl] = useState("");
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [selectedCamera, setSelectedCamera] = useState<number | null>(null);
  const [fullscreenCamera, setFullscreenCamera] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{
    plate: string | null;
    confidence: number;
    isAllowed: boolean;
    barrierOpened: boolean | undefined;
  } | null>(null);
  
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: cameraSetting } = trpc.settings.get.useQuery({ key: "camera_url" });
  const { data: cameraIntegrations } = trpc.cameraIntegrations.list.useQuery();
  
  // Build camera list from integrations
  const cameras: CameraFeed[] = cameraIntegrations?.map(cam => ({
    id: cam.id,
    name: cam.name,
    url: cam.rtspUrl || cam.httpSnapshotUrl || (cam.host ? `http://${cam.host}:${cam.port || 80}/stream` : ""),
    isPrimary: cam.isPrimary || false,
    status: cam.isActive ? "online" : "offline"
  })) || [];

  // If no integrations, use legacy camera URL
  const legacyCamera: CameraFeed | null = cameraSetting?.value ? {
    id: 0,
    name: "Main Camera",
    url: cameraSetting.value,
    isPrimary: true,
    status: "online"
  } : null;

  const allCameras = cameras.length > 0 ? cameras : (legacyCamera ? [legacyCamera] : []);
  const primaryCamera = allCameras.find(c => c.isPrimary) || allCameras[0];
  
  useEffect(() => {
    if (cameraSetting?.value) {
      setCameraUrl(cameraSetting.value);
    }
  }, [cameraSetting]);

  useEffect(() => {
    if (primaryCamera && selectedCamera === null) {
      setSelectedCamera(primaryCamera.id);
    }
  }, [primaryCamera, selectedCamera]);

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

  const captureAndRecognize = useCallback(async (cameraId?: number) => {
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

    // Get the video element for the specified camera or primary camera
    const targetCameraId = cameraId ?? selectedCamera ?? primaryCamera?.id;
    const videoRef = targetCameraId !== undefined ? videoRefs.current.get(targetCameraId) : null;

    // If video is available, capture from it
    if (videoRef && videoRef.readyState >= 2) {
      canvas.width = videoRef.videoWidth || 640;
      canvas.height = videoRef.videoHeight || 480;
      ctx.drawImage(videoRef, 0, 0);
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
  }, [autoOpen, recognizeMutation, selectedCamera, primaryCamera]);

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

  const setVideoRef = (id: number, el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(id, el);
    } else {
      videoRefs.current.delete(id);
    }
  };

  const getGridClass = () => {
    switch (viewMode) {
      case "grid2x2":
        return "grid grid-cols-2 gap-2";
      case "grid3x3":
        return "grid grid-cols-3 gap-2";
      default:
        return "";
    }
  };

  const getCamerasToShow = () => {
    if (viewMode === "single") {
      const cam = allCameras.find(c => c.id === selectedCamera) || primaryCamera;
      return cam ? [cam] : [];
    }
    return allCameras;
  };

  const renderCameraFeed = (camera: CameraFeed, isFullscreen: boolean = false) => {
    const isSelected = selectedCamera === camera.id;
    const isPrimary = camera.isPrimary;
    
    return (
      <div 
        key={camera.id}
        className={`relative aspect-video bg-black rounded-lg overflow-hidden cursor-pointer transition-all ${
          isSelected && viewMode !== "single" ? "ring-2 ring-primary" : ""
        } ${isFullscreen ? "fixed inset-4 z-50 aspect-auto" : ""}`}
        onClick={() => {
          if (viewMode !== "single") {
            setSelectedCamera(camera.id);
          }
        }}
      >
        {/* Camera status indicator */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`bg-black/50 backdrop-blur-sm ${
              camera.status === "online" ? "border-green-500 text-green-500" :
              camera.status === "offline" ? "border-gray-500 text-gray-500" :
              "border-red-500 text-red-500"
            }`}
          >
            {camera.status === "online" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {camera.name}
          </Badge>
          {isPrimary && (
            <Badge className="bg-yellow-500/80 text-black">
              <Star className="h-3 w-3 mr-1" />
              Primary
            </Badge>
          )}
        </div>

        {/* Fullscreen toggle */}
        <div className="absolute top-2 right-2 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenCamera(fullscreenCamera === camera.id ? null : camera.id);
                }}
              >
                {fullscreenCamera === camera.id ? (
                  <Minimize2 className="h-4 w-4 text-white" />
                ) : (
                  <Maximize2 className="h-4 w-4 text-white" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {fullscreenCamera === camera.id ? "Exit fullscreen" : "Fullscreen"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Scan button overlay */}
        {viewMode !== "single" && (
          <div className="absolute bottom-2 right-2 z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    captureAndRecognize(camera.id);
                  }}
                  disabled={isScanning}
                >
                  <Scan className="h-4 w-4 text-white" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Scan from this camera</TooltipContent>
            </Tooltip>
          </div>
        )}

        {camera.url ? (
          <video
            ref={(el) => setVideoRef(camera.id, el)}
            src={camera.url}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
            onError={() => toast.error(`Failed to load stream: ${camera.name}`)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <Camera className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">{camera.name}</p>
            <p className="text-xs">No stream URL</p>
          </div>
        )}
        
        {/* Scanning overlay */}
        {isScanning && selectedCamera === camera.id && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <Scan className="h-12 w-12 mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-medium">Scanning...</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Fullscreen overlay
  if (fullscreenCamera !== null) {
    const camera = allCameras.find(c => c.id === fullscreenCamera);
    if (camera) {
      return (
        <div className="fixed inset-0 z-50 bg-black">
          {renderCameraFeed(camera, true)}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <Button onClick={() => captureAndRecognize(camera.id)} disabled={isScanning}>
              <Scan className="h-4 w-4 mr-2" />
              Scan Plate
            </Button>
            <Button variant="destructive" onClick={handleManualOpen}>
              <DoorOpen className="h-4 w-4 mr-2" />
              Manual Open
            </Button>
            <Button variant="outline" onClick={() => setFullscreenCamera(null)}>
              <Minimize2 className="h-4 w-4 mr-2" />
              Exit Fullscreen
            </Button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Barrier Control</h1>
          <p className="text-muted-foreground">Monitor cameras and control barrier access</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode selector */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "single" ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("single")}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Single camera</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "grid2x2" ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("grid2x2")}
                  disabled={allCameras.length < 2}
                >
                  <Grid2X2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>2x2 Grid</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "grid3x3" ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("grid3x3")}
                  disabled={allCameras.length < 3}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>3x3 Grid</TooltipContent>
            </Tooltip>
          </div>
          
          <Badge variant="outline" className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${allCameras.length > 0 ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
            {allCameras.length} Camera{allCameras.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Camera Feed(s) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  {viewMode === "single" ? "Live Camera Feed" : "Multi-Camera View"}
                </CardTitle>
                <CardDescription>
                  {viewMode === "single" 
                    ? "Real-time video stream from the selected camera"
                    : `Viewing ${getCamerasToShow().length} camera${getCamerasToShow().length !== 1 ? 's' : ''}`
                  }
                </CardDescription>
              </div>
              {viewMode === "single" && allCameras.length > 1 && (
                <Select
                  value={selectedCamera?.toString()}
                  onValueChange={(val) => setSelectedCamera(parseInt(val))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCameras.map(cam => (
                      <SelectItem key={cam.id} value={cam.id.toString()}>
                        <div className="flex items-center gap-2">
                          {cam.isPrimary && <Star className="h-3 w-3 text-yellow-500" />}
                          {cam.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {allCameras.length === 0 ? (
              <div className="aspect-video bg-black rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                <Camera className="h-16 w-16 mb-4 opacity-50" />
                <p>No cameras configured</p>
                <p className="text-sm">Go to Integrations to add cameras</p>
              </div>
            ) : (
              <div className={getGridClass()}>
                {getCamerasToShow().map(camera => renderCameraFeed(camera))}
              </div>
            )}
            
            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Control buttons */}
            <div className="flex flex-wrap gap-3 mt-4">
              <Button 
                onClick={() => captureAndRecognize()} 
                disabled={isScanning || allCameras.length === 0}
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
              
              {user?.role === "admin" && allCameras.length === 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="camera-url">Legacy Camera URL</Label>
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
                    Use Integrations page for advanced camera setup
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => captureAndRecognize()}>
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
