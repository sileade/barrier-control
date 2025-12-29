import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Plus, Settings, Trash2, CheckCircle, XCircle, AlertCircle, 
  Wifi, WifiOff, Camera, Video, Shield, Zap, Globe, Cpu,
  RefreshCw, Play, Square, Eye
} from "lucide-react";

// Barrier integration types with icons and descriptions
const BARRIER_TYPES = [
  { 
    value: 'came', 
    label: 'CAME', 
    icon: Shield,
    description: 'Итальянские шлагбаумы CAME с HTTP API',
    color: 'bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30'
  },
  { 
    value: 'nice', 
    label: 'Nice', 
    icon: Shield,
    description: 'Шлагбаумы Nice с Serial/HTTP интерфейсом',
    color: 'bg-green-500/20 border-green-500/50 hover:bg-green-500/30'
  },
  { 
    value: 'bft', 
    label: 'BFT', 
    icon: Shield,
    description: 'Шлагбаумы BFT с HTTP API',
    color: 'bg-orange-500/20 border-orange-500/50 hover:bg-orange-500/30'
  },
  { 
    value: 'doorhan', 
    label: 'Doorhan', 
    icon: Shield,
    description: 'Шлагбаумы Doorhan с HTTP/Modbus',
    color: 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30'
  },
  { 
    value: 'gpio', 
    label: 'GPIO', 
    icon: Cpu,
    description: 'Управление через GPIO (Raspberry Pi)',
    color: 'bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30'
  },
  { 
    value: 'custom_http', 
    label: 'Custom HTTP', 
    icon: Globe,
    description: 'Пользовательский HTTP endpoint',
    color: 'bg-gray-500/20 border-gray-500/50 hover:bg-gray-500/30'
  },
];

// Camera integration types with icons and descriptions
const CAMERA_TYPES = [
  { 
    value: 'hikvision', 
    label: 'Hikvision', 
    icon: Camera,
    description: 'Камеры Hikvision с RTSP/ISAPI',
    color: 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30'
  },
  { 
    value: 'dahua', 
    label: 'Dahua', 
    icon: Camera,
    description: 'Камеры Dahua с RTSP/HTTP',
    color: 'bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30'
  },
  { 
    value: 'axis', 
    label: 'Axis', 
    icon: Camera,
    description: 'Камеры Axis с RTSP/VAPIX',
    color: 'bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30'
  },
  { 
    value: 'onvif', 
    label: 'ONVIF', 
    icon: Video,
    description: 'Универсальный протокол ONVIF',
    color: 'bg-green-500/20 border-green-500/50 hover:bg-green-500/30'
  },
  { 
    value: 'custom_rtsp', 
    label: 'Custom RTSP', 
    icon: Video,
    description: 'Пользовательский RTSP поток',
    color: 'bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30'
  },
  { 
    value: 'custom_http', 
    label: 'Custom HTTP', 
    icon: Globe,
    description: 'Пользовательский HTTP поток',
    color: 'bg-gray-500/20 border-gray-500/50 hover:bg-gray-500/30'
  },
];

type BarrierType = 'came' | 'nice' | 'bft' | 'doorhan' | 'gpio' | 'custom_http';
type CameraType = 'hikvision' | 'dahua' | 'axis' | 'onvif' | 'custom_rtsp' | 'custom_http';

export default function Integrations() {
  const [activeTab, setActiveTab] = useState('barriers');
  const [showBarrierDialog, setShowBarrierDialog] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [selectedBarrierType, setSelectedBarrierType] = useState<BarrierType | null>(null);
  const [selectedCameraType, setSelectedCameraType] = useState<CameraType | null>(null);
  const [editingBarrier, setEditingBarrier] = useState<any>(null);
  const [editingCamera, setEditingCamera] = useState<any>(null);
  const [testingBarrier, setTestingBarrier] = useState<number | null>(null);
  const [testingCamera, setTestingCamera] = useState<number | null>(null);
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);

  // Barrier form state
  const [barrierForm, setBarrierForm] = useState({
    name: '',
    host: '',
    port: 80,
    username: '',
    password: '',
    apiEndpoint: '',
    apiKey: '',
    openCommand: '',
    closeCommand: '',
    statusCommand: '',
    gpioPin: 17,
    gpioActiveHigh: true,
    openDuration: 5000,
    timeout: 10000,
    isActive: true,
    isPrimary: false,
  });

  // Camera form state
  const [cameraForm, setCameraForm] = useState({
    name: '',
    host: '',
    port: 80,
    username: '',
    password: '',
    rtspUrl: '',
    httpSnapshotUrl: '',
    streamChannel: 1,
    streamSubtype: 0,
    recognitionEnabled: true,
    recognitionInterval: 1000,
    recognitionConfidenceThreshold: 70,
    isActive: true,
    isPrimary: false,
  });

  // Queries
  const { data: barriers, refetch: refetchBarriers } = trpc.barrierIntegrations.list.useQuery();
  const { data: cameras, refetch: refetchCameras } = trpc.cameraIntegrations.list.useQuery();

  // Mutations
  const createBarrier = trpc.barrierIntegrations.create.useMutation({
    onSuccess: () => {
      toast.success('Интеграция шлагбаума создана');
      refetchBarriers();
      setShowBarrierDialog(false);
      resetBarrierForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateBarrier = trpc.barrierIntegrations.update.useMutation({
    onSuccess: () => {
      toast.success('Интеграция шлагбаума обновлена');
      refetchBarriers();
      setShowBarrierDialog(false);
      setEditingBarrier(null);
      resetBarrierForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteBarrier = trpc.barrierIntegrations.delete.useMutation({
    onSuccess: () => {
      toast.success('Интеграция шлагбаума удалена');
      refetchBarriers();
    },
    onError: (error) => toast.error(error.message),
  });

  const testBarrier = trpc.barrierIntegrations.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Подключение успешно');
      } else {
        toast.error(`Ошибка: ${result.error}`);
      }
      setTestingBarrier(null);
      refetchBarriers();
    },
    onError: (error) => {
      toast.error(error.message);
      setTestingBarrier(null);
    },
  });

  const executeBarrier = trpc.barrierIntegrations.execute.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Команда выполнена');
      } else {
        toast.error(`Ошибка: ${result.error}`);
      }
      refetchBarriers();
    },
    onError: (error) => toast.error(error.message),
  });

  const createCamera = trpc.cameraIntegrations.create.useMutation({
    onSuccess: () => {
      toast.success('Интеграция камеры создана');
      refetchCameras();
      setShowCameraDialog(false);
      resetCameraForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateCamera = trpc.cameraIntegrations.update.useMutation({
    onSuccess: () => {
      toast.success('Интеграция камеры обновлена');
      refetchCameras();
      setShowCameraDialog(false);
      setEditingCamera(null);
      resetCameraForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteCamera = trpc.cameraIntegrations.delete.useMutation({
    onSuccess: () => {
      toast.success('Интеграция камеры удалена');
      refetchCameras();
    },
    onError: (error) => toast.error(error.message),
  });

  const testCamera = trpc.cameraIntegrations.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Подключение успешно');
        if (result.imageBase64) {
          setSnapshotPreview(result.imageBase64);
        }
      } else {
        toast.error(`Ошибка: ${result.error}`);
      }
      setTestingCamera(null);
      refetchCameras();
    },
    onError: (error) => {
      toast.error(error.message);
      setTestingCamera(null);
    },
  });

  const resetBarrierForm = () => {
    setBarrierForm({
      name: '',
      host: '',
      port: 80,
      username: '',
      password: '',
      apiEndpoint: '',
      apiKey: '',
      openCommand: '',
      closeCommand: '',
      statusCommand: '',
      gpioPin: 17,
      gpioActiveHigh: true,
      openDuration: 5000,
      timeout: 10000,
      isActive: true,
      isPrimary: false,
    });
    setSelectedBarrierType(null);
  };

  const resetCameraForm = () => {
    setCameraForm({
      name: '',
      host: '',
      port: 80,
      username: '',
      password: '',
      rtspUrl: '',
      httpSnapshotUrl: '',
      streamChannel: 1,
      streamSubtype: 0,
      recognitionEnabled: true,
      recognitionInterval: 1000,
      recognitionConfidenceThreshold: 70,
      isActive: true,
      isPrimary: false,
    });
    setSelectedCameraType(null);
  };

  const handleBarrierTypeSelect = (type: BarrierType) => {
    setSelectedBarrierType(type);
    // Set default commands based on type
    const defaults: Record<BarrierType, Partial<typeof barrierForm>> = {
      came: { openCommand: '/api/barrier/open', closeCommand: '/api/barrier/close', statusCommand: '/api/barrier/status', port: 80 },
      nice: { openCommand: '/nice/open', closeCommand: '/nice/close', statusCommand: '/nice/status', port: 80 },
      bft: { openCommand: '/bft/command/open', closeCommand: '/bft/command/close', statusCommand: '/bft/status', port: 80 },
      doorhan: { openCommand: '/doorhan/open', closeCommand: '/doorhan/close', statusCommand: '/doorhan/status', port: 80 },
      gpio: { gpioPin: 17, gpioActiveHigh: true, openDuration: 5000, port: 8080 },
      custom_http: { port: 80 },
    };
    setBarrierForm(prev => ({ ...prev, ...defaults[type] }));
  };

  const handleCameraTypeSelect = (type: CameraType) => {
    setSelectedCameraType(type);
    // Set default values based on type
    const defaults: Record<CameraType, Partial<typeof cameraForm>> = {
      hikvision: { port: 80, streamChannel: 1, streamSubtype: 0 },
      dahua: { port: 80, streamChannel: 1, streamSubtype: 0 },
      axis: { port: 80, streamChannel: 1 },
      onvif: { port: 80, streamChannel: 1 },
      custom_rtsp: { port: 554 },
      custom_http: { port: 80 },
    };
    setCameraForm(prev => ({ ...prev, ...defaults[type] }));
  };

  const handleEditBarrier = (barrier: any) => {
    setEditingBarrier(barrier);
    setSelectedBarrierType(barrier.type);
    setBarrierForm({
      name: barrier.name || '',
      host: barrier.host || '',
      port: barrier.port || 80,
      username: barrier.username || '',
      password: barrier.password || '',
      apiEndpoint: barrier.apiEndpoint || '',
      apiKey: barrier.apiKey || '',
      openCommand: barrier.openCommand || '',
      closeCommand: barrier.closeCommand || '',
      statusCommand: barrier.statusCommand || '',
      gpioPin: barrier.gpioPin || 17,
      gpioActiveHigh: barrier.gpioActiveHigh ?? true,
      openDuration: barrier.openDuration || 5000,
      timeout: barrier.timeout || 10000,
      isActive: barrier.isActive ?? true,
      isPrimary: barrier.isPrimary ?? false,
    });
    setShowBarrierDialog(true);
  };

  const handleEditCamera = (camera: any) => {
    setEditingCamera(camera);
    setSelectedCameraType(camera.type);
    setCameraForm({
      name: camera.name || '',
      host: camera.host || '',
      port: camera.port || 80,
      username: camera.username || '',
      password: camera.password || '',
      rtspUrl: camera.rtspUrl || '',
      httpSnapshotUrl: camera.httpSnapshotUrl || '',
      streamChannel: camera.streamChannel || 1,
      streamSubtype: camera.streamSubtype || 0,
      recognitionEnabled: camera.recognitionEnabled ?? true,
      recognitionInterval: camera.recognitionInterval || 1000,
      recognitionConfidenceThreshold: camera.recognitionConfidenceThreshold || 70,
      isActive: camera.isActive ?? true,
      isPrimary: camera.isPrimary ?? false,
    });
    setShowCameraDialog(true);
  };

  const handleSaveBarrier = () => {
    if (!selectedBarrierType) return;
    
    const data = {
      ...barrierForm,
      type: selectedBarrierType,
    };

    if (editingBarrier) {
      updateBarrier.mutate({ id: editingBarrier.id, ...data });
    } else {
      createBarrier.mutate(data);
    }
  };

  const handleSaveCamera = () => {
    if (!selectedCameraType) return;
    
    const data = {
      ...cameraForm,
      type: selectedCameraType,
    };

    if (editingCamera) {
      updateCamera.mutate({ id: editingCamera.id, ...data });
    } else {
      createCamera.mutate(data);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle className="w-3 h-3 mr-1" /> Online</Badge>;
      case 'offline':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50"><WifiOff className="w-3 h-3 mr-1" /> Offline</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50"><AlertCircle className="w-3 h-3 mr-1" /> Unknown</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Интеграции</h1>
            <p className="text-gray-400">Настройка подключений к шлагбаумам и камерам</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="barriers" className="data-[state=active]:bg-blue-600">
              <Shield className="w-4 h-4 mr-2" />
              Шлагбаумы ({barriers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="cameras" className="data-[state=active]:bg-blue-600">
              <Camera className="w-4 h-4 mr-2" />
              Камеры ({cameras?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Barriers Tab */}
          <TabsContent value="barriers" className="space-y-6">
            {/* Type Selection Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {BARRIER_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Card 
                    key={type.value}
                    className={`cursor-pointer transition-all border-2 ${type.color} hover:scale-105`}
                    onClick={() => {
                      handleBarrierTypeSelect(type.value as BarrierType);
                      setEditingBarrier(null);
                      setShowBarrierDialog(true);
                    }}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className="w-8 h-8 mx-auto mb-2 text-white" />
                      <h3 className="font-semibold text-white">{type.label}</h3>
                      <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Existing Integrations */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Настроенные интеграции</h2>
              {barriers && barriers.length > 0 ? (
                <div className="grid gap-4">
                  {barriers.map((barrier: any) => {
                    const typeInfo = BARRIER_TYPES.find(t => t.value === barrier.type);
                    const Icon = typeInfo?.icon || Shield;
                    return (
                      <Card key={barrier.id} className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${typeInfo?.color || 'bg-gray-500/20'}`}>
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-white">{barrier.name}</h3>
                                  {barrier.isPrimary && (
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Primary</Badge>
                                  )}
                                  {!barrier.isActive && (
                                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">Inactive</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">
                                  {typeInfo?.label} • {barrier.host}:{barrier.port}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {getStatusBadge(barrier.lastStatus)}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setTestingBarrier(barrier.id);
                                    testBarrier.mutate({ id: barrier.id });
                                  }}
                                  disabled={testingBarrier === barrier.id}
                                >
                                  {testingBarrier === barrier.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Wifi className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-400 border-green-500/50 hover:bg-green-500/20"
                                  onClick={() => executeBarrier.mutate({ id: barrier.id, action: 'open' })}
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-400 border-red-500/50 hover:bg-red-500/20"
                                  onClick={() => executeBarrier.mutate({ id: barrier.id, action: 'close' })}
                                >
                                  <Square className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditBarrier(barrier)}
                                >
                                  <Settings className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-400 border-red-500/50 hover:bg-red-500/20"
                                  onClick={() => {
                                    if (confirm('Удалить эту интеграцию?')) {
                                      deleteBarrier.mutate({ id: barrier.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          {barrier.lastError && (
                            <p className="text-sm text-red-400 mt-2">Ошибка: {barrier.lastError}</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-white mb-2">Нет настроенных шлагбаумов</h3>
                    <p className="text-gray-400 mb-4">Выберите тип шлагбаума выше для добавления интеграции</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Cameras Tab */}
          <TabsContent value="cameras" className="space-y-6">
            {/* Type Selection Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {CAMERA_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Card 
                    key={type.value}
                    className={`cursor-pointer transition-all border-2 ${type.color} hover:scale-105`}
                    onClick={() => {
                      handleCameraTypeSelect(type.value as CameraType);
                      setEditingCamera(null);
                      setShowCameraDialog(true);
                    }}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className="w-8 h-8 mx-auto mb-2 text-white" />
                      <h3 className="font-semibold text-white">{type.label}</h3>
                      <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Existing Integrations */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Настроенные интеграции</h2>
              {cameras && cameras.length > 0 ? (
                <div className="grid gap-4">
                  {cameras.map((camera: any) => {
                    const typeInfo = CAMERA_TYPES.find(t => t.value === camera.type);
                    const Icon = typeInfo?.icon || Camera;
                    return (
                      <Card key={camera.id} className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${typeInfo?.color || 'bg-gray-500/20'}`}>
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-white">{camera.name}</h3>
                                  {camera.isPrimary && (
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Primary</Badge>
                                  )}
                                  {!camera.isActive && (
                                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">Inactive</Badge>
                                  )}
                                  {camera.recognitionEnabled && (
                                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                                      <Zap className="w-3 h-3 mr-1" /> Recognition
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">
                                  {typeInfo?.label} • {camera.host}:{camera.port}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {getStatusBadge(camera.lastStatus)}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setTestingCamera(camera.id);
                                    testCamera.mutate({ id: camera.id });
                                  }}
                                  disabled={testingCamera === camera.id}
                                >
                                  {testingCamera === camera.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditCamera(camera)}
                                >
                                  <Settings className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-400 border-red-500/50 hover:bg-red-500/20"
                                  onClick={() => {
                                    if (confirm('Удалить эту интеграцию?')) {
                                      deleteCamera.mutate({ id: camera.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          {camera.lastError && (
                            <p className="text-sm text-red-400 mt-2">Ошибка: {camera.lastError}</p>
                          )}
                          {camera.lastSnapshot && (
                            <div className="mt-3">
                              <img 
                                src={camera.lastSnapshot} 
                                alt="Last snapshot" 
                                className="h-20 rounded border border-gray-700"
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <Camera className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-white mb-2">Нет настроенных камер</h3>
                    <p className="text-gray-400 mb-4">Выберите тип камеры выше для добавления интеграции</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Barrier Dialog */}
        <Dialog open={showBarrierDialog} onOpenChange={(open) => {
          setShowBarrierDialog(open);
          if (!open) {
            setEditingBarrier(null);
            resetBarrierForm();
          }
        }}>
          <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingBarrier ? 'Редактировать шлагбаум' : 'Добавить шлагбаум'}
              </DialogTitle>
              <DialogDescription>
                {selectedBarrierType && BARRIER_TYPES.find(t => t.value === selectedBarrierType)?.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input
                    value={barrierForm.name}
                    onChange={(e) => setBarrierForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Главный въезд"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип</Label>
                  <Select 
                    value={selectedBarrierType || ''} 
                    onValueChange={(v) => handleBarrierTypeSelect(v as BarrierType)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      {BARRIER_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedBarrierType !== 'gpio' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Хост</Label>
                    <Input
                      value={barrierForm.host}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="192.168.1.100"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Порт</Label>
                    <Input
                      type="number"
                      value={barrierForm.port}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, port: parseInt(e.target.value) || 80 }))}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
              )}

              {selectedBarrierType !== 'gpio' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Логин</Label>
                    <Input
                      value={barrierForm.username}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="admin"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Пароль</Label>
                    <Input
                      type="password"
                      value={barrierForm.password}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
              )}

              {selectedBarrierType === 'custom_http' && (
                <>
                  <div className="space-y-2">
                    <Label>API Endpoint (базовый URL)</Label>
                    <Input
                      value={barrierForm.apiEndpoint}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                      placeholder="http://192.168.1.100:8080"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      value={barrierForm.apiKey}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="your-api-key"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </>
              )}

              {selectedBarrierType !== 'gpio' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Команда открытия</Label>
                    <Input
                      value={barrierForm.openCommand}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, openCommand: e.target.value }))}
                      placeholder="/api/open"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Команда закрытия</Label>
                    <Input
                      value={barrierForm.closeCommand}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, closeCommand: e.target.value }))}
                      placeholder="/api/close"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Команда статуса</Label>
                    <Input
                      value={barrierForm.statusCommand}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, statusCommand: e.target.value }))}
                      placeholder="/api/status"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
              )}

              {selectedBarrierType === 'gpio' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>GPIO Pin</Label>
                    <Input
                      type="number"
                      value={barrierForm.gpioPin}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, gpioPin: parseInt(e.target.value) || 17 }))}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Время открытия (мс)</Label>
                    <Input
                      type="number"
                      value={barrierForm.openDuration}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, openDuration: parseInt(e.target.value) || 5000 }))}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={barrierForm.gpioActiveHigh}
                        onCheckedChange={(checked) => setBarrierForm(prev => ({ ...prev, gpioActiveHigh: checked }))}
                      />
                      <Label>Active High</Label>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Таймаут (мс)</Label>
                  <Input
                    type="number"
                    value={barrierForm.timeout}
                    onChange={(e) => setBarrierForm(prev => ({ ...prev, timeout: parseInt(e.target.value) || 10000 }))}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="space-y-2 flex items-end gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={barrierForm.isActive}
                      onCheckedChange={(checked) => setBarrierForm(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label>Активен</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={barrierForm.isPrimary}
                      onCheckedChange={(checked) => setBarrierForm(prev => ({ ...prev, isPrimary: checked }))}
                    />
                    <Label>Основной</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBarrierDialog(false)}>
                Отмена
              </Button>
              <Button onClick={handleSaveBarrier} disabled={!barrierForm.name || !selectedBarrierType}>
                {editingBarrier ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Camera Dialog */}
        <Dialog open={showCameraDialog} onOpenChange={(open) => {
          setShowCameraDialog(open);
          if (!open) {
            setEditingCamera(null);
            resetCameraForm();
          }
        }}>
          <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingCamera ? 'Редактировать камеру' : 'Добавить камеру'}
              </DialogTitle>
              <DialogDescription>
                {selectedCameraType && CAMERA_TYPES.find(t => t.value === selectedCameraType)?.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input
                    value={cameraForm.name}
                    onChange={(e) => setCameraForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Камера въезда"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип</Label>
                  <Select 
                    value={selectedCameraType || ''} 
                    onValueChange={(v) => handleCameraTypeSelect(v as CameraType)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Хост</Label>
                  <Input
                    value={cameraForm.host}
                    onChange={(e) => setCameraForm(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="192.168.1.101"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Порт</Label>
                  <Input
                    type="number"
                    value={cameraForm.port}
                    onChange={(e) => setCameraForm(prev => ({ ...prev, port: parseInt(e.target.value) || 80 }))}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Логин</Label>
                  <Input
                    value={cameraForm.username}
                    onChange={(e) => setCameraForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="admin"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Пароль</Label>
                  <Input
                    type="password"
                    value={cameraForm.password}
                    onChange={(e) => setCameraForm(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </div>

              {(selectedCameraType === 'custom_rtsp' || selectedCameraType === 'custom_http') && (
                <div className="space-y-2">
                  <Label>RTSP URL</Label>
                  <Input
                    value={cameraForm.rtspUrl}
                    onChange={(e) => setCameraForm(prev => ({ ...prev, rtspUrl: e.target.value }))}
                    placeholder="rtsp://user:pass@192.168.1.101:554/stream"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>HTTP Snapshot URL</Label>
                <Input
                  value={cameraForm.httpSnapshotUrl}
                  onChange={(e) => setCameraForm(prev => ({ ...prev, httpSnapshotUrl: e.target.value }))}
                  placeholder="http://192.168.1.101/snapshot.jpg"
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              {(selectedCameraType === 'hikvision' || selectedCameraType === 'dahua' || selectedCameraType === 'axis' || selectedCameraType === 'onvif') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Канал</Label>
                    <Input
                      type="number"
                      value={cameraForm.streamChannel}
                      onChange={(e) => setCameraForm(prev => ({ ...prev, streamChannel: parseInt(e.target.value) || 1 }))}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtype (0=main, 1=sub)</Label>
                    <Input
                      type="number"
                      value={cameraForm.streamSubtype}
                      onChange={(e) => setCameraForm(prev => ({ ...prev, streamSubtype: parseInt(e.target.value) || 0 }))}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={cameraForm.recognitionEnabled}
                    onCheckedChange={(checked) => setCameraForm(prev => ({ ...prev, recognitionEnabled: checked }))}
                  />
                  <Label>Включить распознавание номеров</Label>
                </div>
                
                {cameraForm.recognitionEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Интервал распознавания (мс)</Label>
                      <Input
                        type="number"
                        value={cameraForm.recognitionInterval}
                        onChange={(e) => setCameraForm(prev => ({ ...prev, recognitionInterval: parseInt(e.target.value) || 1000 }))}
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Порог уверенности (%)</Label>
                      <Input
                        type="number"
                        value={cameraForm.recognitionConfidenceThreshold}
                        onChange={(e) => setCameraForm(prev => ({ ...prev, recognitionConfidenceThreshold: parseInt(e.target.value) || 70 }))}
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={cameraForm.isActive}
                    onCheckedChange={(checked) => setCameraForm(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label>Активна</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={cameraForm.isPrimary}
                    onCheckedChange={(checked) => setCameraForm(prev => ({ ...prev, isPrimary: checked }))}
                  />
                  <Label>Основная</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCameraDialog(false)}>
                Отмена
              </Button>
              <Button onClick={handleSaveCamera} disabled={!cameraForm.name || !selectedCameraType}>
                {editingCamera ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Snapshot Preview Dialog */}
        <Dialog open={!!snapshotPreview} onOpenChange={() => setSnapshotPreview(null)}>
          <DialogContent className="max-w-3xl bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Снимок с камеры</DialogTitle>
            </DialogHeader>
            {snapshotPreview && (
              <img src={snapshotPreview} alt="Camera snapshot" className="w-full rounded" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
