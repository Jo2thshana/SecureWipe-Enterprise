import React, { createContext, useState, useContext, useCallback } from 'react';
import api from '../services/api';
import { useNotifications } from './NotificationContext';

const DeviceContext = createContext({
  devices: [],
  selectedDevice: null,
  loading: false,
  scanning: false,
  fetchDevices: async () => {},
  selectDevice: (device) => {},
  analyzeDevice: async (deviceId) => {}
});

export function DeviceProvider({ children }) {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const { showNotification } = useNotifications();

  const fetchDevices = useCallback(async () => {
    setScanning(true);
    try {
      const { data } = await api.get('/devices');
      setDevices(data.data.devices);
      
      // Update selected device if it's in the list
      if (selectedDevice) {
        const updated = data.data.devices.find(d => d.id === selectedDevice.id);
        if (updated) setSelectedDevice(updated);
      }
      
      showNotification('Storage device scanning complete.', 'success', 'System Scan');
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to detect connected devices.', 'danger', 'Scan Error');
    } finally {
      setScanning(false);
    }
  }, [selectedDevice, showNotification]);

  const selectDevice = (device) => {
    setSelectedDevice(device);
  };

  const analyzeDevice = async (deviceId) => {
    setLoading(true);
    try {
      const { data } = await api.post('/devices/analyze', { deviceId });
      showNotification('Device analysis complete.', 'success', 'Asset Profiling');
      return data.data.report;
    } catch (err) {
      showNotification(err.response?.data?.error || 'Profiling analysis failed.', 'danger', 'Error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <DeviceContext.Provider value={{
      devices,
      selectedDevice,
      loading,
      scanning,
      fetchDevices,
      selectDevice,
      analyzeDevice
    }}>
      {children}
    </DeviceContext.Provider>
  );
}

export const useDevices = () => useContext(DeviceContext);
