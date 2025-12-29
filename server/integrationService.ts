/**
 * Integration Service - handles communication with barrier and camera hardware
 */

import axios from 'axios';
import {
  getBarrierIntegrationById,
  getCameraIntegrationById,
  updateBarrierIntegrationStatus,
  updateCameraIntegrationStatus,
  getPrimaryBarrierIntegration,
  getPrimaryCameraIntegration,
} from './db';
import type { BarrierIntegration, CameraIntegration } from '../drizzle/schema';

// ============ BARRIER INTEGRATION TYPES ============

export interface BarrierCommand {
  action: 'open' | 'close' | 'status';
  integration: BarrierIntegration;
}

export interface BarrierResponse {
  success: boolean;
  status?: 'open' | 'closed' | 'opening' | 'closing' | 'unknown';
  error?: string;
}

// ============ CAMERA INTEGRATION TYPES ============

export interface CameraSnapshot {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
}

export interface CameraStreamInfo {
  success: boolean;
  rtspUrl?: string;
  httpUrl?: string;
  error?: string;
}

// ============ BARRIER HANDLERS ============

/**
 * CAME barrier integration
 */
async function handleCameBarrier(command: BarrierCommand): Promise<BarrierResponse> {
  const { action, integration } = command;
  const baseUrl = `http://${integration.host}:${integration.port || 80}`;
  
  try {
    const endpoint = action === 'open' 
      ? integration.openCommand || '/api/barrier/open'
      : action === 'close'
      ? integration.closeCommand || '/api/barrier/close'
      : integration.statusCommand || '/api/barrier/status';
    
    const response = await axios({
      method: action === 'status' ? 'GET' : 'POST',
      url: `${baseUrl}${endpoint}`,
      auth: integration.username && integration.password ? {
        username: integration.username,
        password: integration.password,
      } : undefined,
      timeout: integration.timeout || 10000,
    });
    
    return {
      success: true,
      status: response.data?.status || 'unknown',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'CAME barrier communication error',
    };
  }
}

/**
 * Nice barrier integration
 */
async function handleNiceBarrier(command: BarrierCommand): Promise<BarrierResponse> {
  const { action, integration } = command;
  const baseUrl = `http://${integration.host}:${integration.port || 80}`;
  
  try {
    const endpoint = action === 'open'
      ? integration.openCommand || '/nice/open'
      : action === 'close'
      ? integration.closeCommand || '/nice/close'
      : integration.statusCommand || '/nice/status';
    
    const response = await axios({
      method: action === 'status' ? 'GET' : 'POST',
      url: `${baseUrl}${endpoint}`,
      headers: integration.apiKey ? { 'X-API-Key': integration.apiKey } : undefined,
      timeout: integration.timeout || 10000,
    });
    
    return {
      success: true,
      status: response.data?.status || 'unknown',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Nice barrier communication error',
    };
  }
}

/**
 * BFT barrier integration
 */
async function handleBftBarrier(command: BarrierCommand): Promise<BarrierResponse> {
  const { action, integration } = command;
  const baseUrl = `http://${integration.host}:${integration.port || 80}`;
  
  try {
    const endpoint = action === 'open'
      ? integration.openCommand || '/bft/command/open'
      : action === 'close'
      ? integration.closeCommand || '/bft/command/close'
      : integration.statusCommand || '/bft/status';
    
    const response = await axios({
      method: action === 'status' ? 'GET' : 'POST',
      url: `${baseUrl}${endpoint}`,
      auth: integration.username && integration.password ? {
        username: integration.username,
        password: integration.password,
      } : undefined,
      timeout: integration.timeout || 10000,
    });
    
    return {
      success: true,
      status: response.data?.status || 'unknown',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'BFT barrier communication error',
    };
  }
}

/**
 * Doorhan barrier integration
 */
async function handleDoorhanBarrier(command: BarrierCommand): Promise<BarrierResponse> {
  const { action, integration } = command;
  const baseUrl = `http://${integration.host}:${integration.port || 80}`;
  
  try {
    const endpoint = action === 'open'
      ? integration.openCommand || '/doorhan/open'
      : action === 'close'
      ? integration.closeCommand || '/doorhan/close'
      : integration.statusCommand || '/doorhan/status';
    
    const response = await axios({
      method: action === 'status' ? 'GET' : 'POST',
      url: `${baseUrl}${endpoint}`,
      headers: integration.apiKey ? { 'Authorization': `Bearer ${integration.apiKey}` } : undefined,
      timeout: integration.timeout || 10000,
    });
    
    return {
      success: true,
      status: response.data?.status || 'unknown',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Doorhan barrier communication error',
    };
  }
}

/**
 * GPIO barrier integration (for Raspberry Pi or similar)
 */
async function handleGpioBarrier(command: BarrierCommand): Promise<BarrierResponse> {
  const { action, integration } = command;
  
  // GPIO control would typically be done via a local service
  // This is a placeholder for the actual GPIO implementation
  const baseUrl = integration.apiEndpoint || `http://localhost:${integration.port || 8080}`;
  
  try {
    const response = await axios({
      method: 'POST',
      url: `${baseUrl}/gpio`,
      data: {
        pin: integration.gpioPin,
        action: action,
        activeHigh: integration.gpioActiveHigh,
        duration: integration.openDuration,
      },
      timeout: integration.timeout || 10000,
    });
    
    return {
      success: true,
      status: response.data?.status || 'unknown',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'GPIO barrier communication error',
    };
  }
}

/**
 * Custom HTTP barrier integration
 */
async function handleCustomHttpBarrier(command: BarrierCommand): Promise<BarrierResponse> {
  const { action, integration } = command;
  
  try {
    const endpoint = action === 'open'
      ? integration.openCommand
      : action === 'close'
      ? integration.closeCommand
      : integration.statusCommand;
    
    if (!endpoint) {
      return {
        success: false,
        error: `No endpoint configured for action: ${action}`,
      };
    }
    
    const url = integration.apiEndpoint 
      ? `${integration.apiEndpoint}${endpoint}`
      : `http://${integration.host}:${integration.port || 80}${endpoint}`;
    
    const headers: Record<string, string> = {};
    if (integration.apiKey) {
      headers['Authorization'] = `Bearer ${integration.apiKey}`;
    }
    
    const response = await axios({
      method: action === 'status' ? 'GET' : 'POST',
      url,
      headers,
      auth: integration.username && integration.password ? {
        username: integration.username,
        password: integration.password,
      } : undefined,
      timeout: integration.timeout || 10000,
    });
    
    return {
      success: true,
      status: response.data?.status || 'unknown',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Custom HTTP barrier communication error',
    };
  }
}

// ============ CAMERA HANDLERS ============

/**
 * Hikvision camera integration
 */
async function handleHikvisionCamera(integration: CameraIntegration, action: 'snapshot' | 'stream'): Promise<CameraSnapshot | CameraStreamInfo> {
  const baseUrl = `http://${integration.host}:${integration.port || 80}`;
  
  if (action === 'stream') {
    const rtspUrl = integration.rtspUrl || 
      `rtsp://${integration.username}:${integration.password}@${integration.host}:554/Streaming/Channels/${integration.streamChannel}0${integration.streamSubtype}`;
    return {
      success: true,
      rtspUrl,
      httpUrl: `${baseUrl}/ISAPI/Streaming/channels/${integration.streamChannel}0${integration.streamSubtype}/httpPreview`,
    };
  }
  
  try {
    const snapshotUrl = integration.httpSnapshotUrl || 
      `${baseUrl}/ISAPI/Streaming/channels/${integration.streamChannel}01/picture`;
    
    const response = await axios({
      method: 'GET',
      url: snapshotUrl,
      auth: integration.username && integration.password ? {
        username: integration.username,
        password: integration.password,
      } : undefined,
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    
    const base64 = Buffer.from(response.data).toString('base64');
    return {
      success: true,
      imageBase64: `data:image/jpeg;base64,${base64}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Hikvision camera communication error',
    };
  }
}

/**
 * Dahua camera integration
 */
async function handleDahuaCamera(integration: CameraIntegration, action: 'snapshot' | 'stream'): Promise<CameraSnapshot | CameraStreamInfo> {
  const baseUrl = `http://${integration.host}:${integration.port || 80}`;
  
  if (action === 'stream') {
    const rtspUrl = integration.rtspUrl || 
      `rtsp://${integration.username}:${integration.password}@${integration.host}:554/cam/realmonitor?channel=${integration.streamChannel}&subtype=${integration.streamSubtype}`;
    return {
      success: true,
      rtspUrl,
      httpUrl: `${baseUrl}/cgi-bin/mjpg/video.cgi?channel=${integration.streamChannel}&subtype=${integration.streamSubtype}`,
    };
  }
  
  try {
    const snapshotUrl = integration.httpSnapshotUrl || 
      `${baseUrl}/cgi-bin/snapshot.cgi?channel=${integration.streamChannel}`;
    
    const response = await axios({
      method: 'GET',
      url: snapshotUrl,
      auth: integration.username && integration.password ? {
        username: integration.username,
        password: integration.password,
      } : undefined,
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    
    const base64 = Buffer.from(response.data).toString('base64');
    return {
      success: true,
      imageBase64: `data:image/jpeg;base64,${base64}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Dahua camera communication error',
    };
  }
}

/**
 * Axis camera integration
 */
async function handleAxisCamera(integration: CameraIntegration, action: 'snapshot' | 'stream'): Promise<CameraSnapshot | CameraStreamInfo> {
  const baseUrl = `http://${integration.host}:${integration.port || 80}`;
  
  if (action === 'stream') {
    const rtspUrl = integration.rtspUrl || 
      `rtsp://${integration.username}:${integration.password}@${integration.host}:554/axis-media/media.amp`;
    return {
      success: true,
      rtspUrl,
      httpUrl: `${baseUrl}/axis-cgi/mjpg/video.cgi`,
    };
  }
  
  try {
    const snapshotUrl = integration.httpSnapshotUrl || 
      `${baseUrl}/axis-cgi/jpg/image.cgi`;
    
    const response = await axios({
      method: 'GET',
      url: snapshotUrl,
      auth: integration.username && integration.password ? {
        username: integration.username,
        password: integration.password,
      } : undefined,
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    
    const base64 = Buffer.from(response.data).toString('base64');
    return {
      success: true,
      imageBase64: `data:image/jpeg;base64,${base64}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Axis camera communication error',
    };
  }
}

/**
 * ONVIF camera integration
 */
async function handleOnvifCamera(integration: CameraIntegration, action: 'snapshot' | 'stream'): Promise<CameraSnapshot | CameraStreamInfo> {
  // ONVIF requires SOAP protocol - simplified implementation
  const baseUrl = `http://${integration.host}:${integration.port || 80}`;
  
  if (action === 'stream') {
    const rtspUrl = integration.rtspUrl || 
      `rtsp://${integration.username}:${integration.password}@${integration.host}:554/onvif/profile${integration.streamChannel}/media.smp`;
    return {
      success: true,
      rtspUrl,
      httpUrl: integration.httpSnapshotUrl || `${baseUrl}/onvif/snapshot`,
    };
  }
  
  try {
    const snapshotUrl = integration.httpSnapshotUrl || `${baseUrl}/onvif/snapshot`;
    
    const response = await axios({
      method: 'GET',
      url: snapshotUrl,
      auth: integration.username && integration.password ? {
        username: integration.username,
        password: integration.password,
      } : undefined,
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    
    const base64 = Buffer.from(response.data).toString('base64');
    return {
      success: true,
      imageBase64: `data:image/jpeg;base64,${base64}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'ONVIF camera communication error',
    };
  }
}

/**
 * Custom RTSP camera integration
 */
async function handleCustomRtspCamera(integration: CameraIntegration, action: 'snapshot' | 'stream'): Promise<CameraSnapshot | CameraStreamInfo> {
  if (action === 'stream') {
    return {
      success: true,
      rtspUrl: integration.rtspUrl || '',
      httpUrl: integration.httpSnapshotUrl || '',
    };
  }
  
  if (!integration.httpSnapshotUrl) {
    return {
      success: false,
      error: 'No snapshot URL configured for custom RTSP camera',
    };
  }
  
  try {
    const response = await axios({
      method: 'GET',
      url: integration.httpSnapshotUrl,
      auth: integration.username && integration.password ? {
        username: integration.username,
        password: integration.password,
      } : undefined,
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    
    const base64 = Buffer.from(response.data).toString('base64');
    return {
      success: true,
      imageBase64: `data:image/jpeg;base64,${base64}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Custom RTSP camera communication error',
    };
  }
}

/**
 * Custom HTTP camera integration
 */
async function handleCustomHttpCamera(integration: CameraIntegration, action: 'snapshot' | 'stream'): Promise<CameraSnapshot | CameraStreamInfo> {
  if (action === 'stream') {
    return {
      success: true,
      rtspUrl: integration.rtspUrl || '',
      httpUrl: integration.httpSnapshotUrl || '',
    };
  }
  
  if (!integration.httpSnapshotUrl) {
    return {
      success: false,
      error: 'No snapshot URL configured for custom HTTP camera',
    };
  }
  
  try {
    const headers: Record<string, string> = {};
    
    const response = await axios({
      method: 'GET',
      url: integration.httpSnapshotUrl,
      headers,
      auth: integration.username && integration.password ? {
        username: integration.username,
        password: integration.password,
      } : undefined,
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    
    const base64 = Buffer.from(response.data).toString('base64');
    return {
      success: true,
      imageBase64: `data:image/jpeg;base64,${base64}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Custom HTTP camera communication error',
    };
  }
}

// ============ MAIN INTEGRATION FUNCTIONS ============

/**
 * Execute barrier command
 */
export async function executeBarrierCommand(integrationId: number, action: 'open' | 'close' | 'status'): Promise<BarrierResponse> {
  const integration = await getBarrierIntegrationById(integrationId);
  
  if (!integration) {
    return { success: false, error: 'Integration not found' };
  }
  
  if (!integration.isActive) {
    return { success: false, error: 'Integration is not active' };
  }
  
  const command: BarrierCommand = { action, integration };
  let response: BarrierResponse;
  
  switch (integration.type) {
    case 'came':
      response = await handleCameBarrier(command);
      break;
    case 'nice':
      response = await handleNiceBarrier(command);
      break;
    case 'bft':
      response = await handleBftBarrier(command);
      break;
    case 'doorhan':
      response = await handleDoorhanBarrier(command);
      break;
    case 'gpio':
      response = await handleGpioBarrier(command);
      break;
    case 'custom_http':
      response = await handleCustomHttpBarrier(command);
      break;
    default:
      response = { success: false, error: `Unknown integration type: ${integration.type}` };
  }
  
  // Update integration status
  await updateBarrierIntegrationStatus(
    integrationId,
    response.success ? 'online' : 'error',
    response.error
  );
  
  return response;
}

/**
 * Execute barrier command using primary integration
 */
export async function executePrimaryBarrierCommand(action: 'open' | 'close' | 'status'): Promise<BarrierResponse> {
  const primary = await getPrimaryBarrierIntegration();
  
  if (!primary) {
    return { success: false, error: 'No primary barrier integration configured' };
  }
  
  return executeBarrierCommand(primary.id, action);
}

/**
 * Get camera snapshot
 */
export async function getCameraSnapshot(integrationId: number): Promise<CameraSnapshot> {
  const integration = await getCameraIntegrationById(integrationId);
  
  if (!integration) {
    return { success: false, error: 'Integration not found' };
  }
  
  if (!integration.isActive) {
    return { success: false, error: 'Integration is not active' };
  }
  
  let response: CameraSnapshot;
  
  switch (integration.type) {
    case 'hikvision':
      response = await handleHikvisionCamera(integration, 'snapshot') as CameraSnapshot;
      break;
    case 'dahua':
      response = await handleDahuaCamera(integration, 'snapshot') as CameraSnapshot;
      break;
    case 'axis':
      response = await handleAxisCamera(integration, 'snapshot') as CameraSnapshot;
      break;
    case 'onvif':
      response = await handleOnvifCamera(integration, 'snapshot') as CameraSnapshot;
      break;
    case 'custom_rtsp':
      response = await handleCustomRtspCamera(integration, 'snapshot') as CameraSnapshot;
      break;
    case 'custom_http':
      response = await handleCustomHttpCamera(integration, 'snapshot') as CameraSnapshot;
      break;
    default:
      response = { success: false, error: `Unknown integration type: ${integration.type}` };
  }
  
  // Update integration status
  await updateCameraIntegrationStatus(
    integrationId,
    response.success ? 'online' : 'error',
    response.error,
    response.imageBase64
  );
  
  return response;
}

/**
 * Get camera stream info
 */
export async function getCameraStreamInfo(integrationId: number): Promise<CameraStreamInfo> {
  const integration = await getCameraIntegrationById(integrationId);
  
  if (!integration) {
    return { success: false, error: 'Integration not found' };
  }
  
  if (!integration.isActive) {
    return { success: false, error: 'Integration is not active' };
  }
  
  switch (integration.type) {
    case 'hikvision':
      return handleHikvisionCamera(integration, 'stream') as Promise<CameraStreamInfo>;
    case 'dahua':
      return handleDahuaCamera(integration, 'stream') as Promise<CameraStreamInfo>;
    case 'axis':
      return handleAxisCamera(integration, 'stream') as Promise<CameraStreamInfo>;
    case 'onvif':
      return handleOnvifCamera(integration, 'stream') as Promise<CameraStreamInfo>;
    case 'custom_rtsp':
      return handleCustomRtspCamera(integration, 'stream') as Promise<CameraStreamInfo>;
    case 'custom_http':
      return handleCustomHttpCamera(integration, 'stream') as Promise<CameraStreamInfo>;
    default:
      return { success: false, error: `Unknown integration type: ${integration.type}` };
  }
}

/**
 * Get primary camera snapshot
 */
export async function getPrimaryCameraSnapshot(): Promise<CameraSnapshot> {
  const primary = await getPrimaryCameraIntegration();
  
  if (!primary) {
    return { success: false, error: 'No primary camera integration configured' };
  }
  
  return getCameraSnapshot(primary.id);
}

/**
 * Test barrier connection
 */
export async function testBarrierConnection(integrationId: number): Promise<BarrierResponse> {
  return executeBarrierCommand(integrationId, 'status');
}

/**
 * Test camera connection
 */
export async function testCameraConnection(integrationId: number): Promise<CameraSnapshot> {
  return getCameraSnapshot(integrationId);
}
