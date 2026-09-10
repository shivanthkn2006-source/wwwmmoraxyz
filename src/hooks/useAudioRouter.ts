import { useState, useEffect, useCallback } from 'react';
import {
  audioRouter,
  type AudioDeviceOption,
  type ConnectionState,
  type AudioDiagnostics,
} from '@/services/AudioRouterService';

export function useAudioRouter() {
  const [status, setStatus] = useState<ConnectionState>(audioRouter.getCurrentStatus());
  const [devices, setDevices] = useState<{ inputs: AudioDeviceOption[]; outputs: AudioDeviceOption[] }>({
    inputs: [],
    outputs: [],
  });
  const [activeInput, setActiveInput] = useState<string>(audioRouter.getActiveInputDeviceId());
  const [activeOutput, setActiveOutput] = useState<string>(audioRouter.getActiveOutputDeviceId());
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [diagnostics, setDiagnostics] = useState<AudioDiagnostics>(audioRouter.getDiagnostics());

  useEffect(() => {
    const unsubStatus = audioRouter.onStatusChange(setStatus);
    const unsubDevices = audioRouter.onDeviceListChange(setDevices);
    const unsubLevel = audioRouter.onLevelUpdate(setAudioLevel);

    void audioRouter.refreshDeviceList();

    const interval = setInterval(() => {
      setDiagnostics(audioRouter.getDiagnostics());
    }, 2000);

    return () => {
      unsubStatus();
      unsubDevices();
      unsubLevel();
      clearInterval(interval);
    };
  }, []);

  const switchInput = useCallback(async (deviceId: string) => {
    setActiveInput(deviceId);
    await audioRouter.setInputDevice(deviceId);
  }, []);

  const switchOutput = useCallback(async (deviceId: string) => {
    setActiveOutput(deviceId);
    await audioRouter.setOutputDevice(deviceId);
  }, []);

  const grantMicOnce = useCallback(async () => {
    const ok = await audioRouter.ensureMicPermission();
    setDiagnostics(audioRouter.getDiagnostics());
    return ok;
  }, []);

  return {
    status,
    devices,
    activeInput,
    activeOutput,
    audioLevel,
    diagnostics,
    switchInput,
    switchOutput,
    grantMicOnce,
    refreshDevices: () => audioRouter.refreshDeviceList(),
    interruptZoe: () => audioRouter.interruptZoe(),
    toggleVoiceInput: (active: boolean) => audioRouter.toggleVoiceInput(active),
  };
}

export default useAudioRouter;
