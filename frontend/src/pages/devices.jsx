import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '../context/DeviceContext';
import DeviceGrid from '../components/DeviceGrid';
import Button from '../components/common/Button';
import { HardDrive, RefreshCcw } from 'lucide-react';
import WarningAlert from '../components/common/WarningAlert';

export default function Devices() {
  const { devices, scanning, fetchDevices, analyzeDevice } = useDevices();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleAnalyze = async (deviceId) => {
    await analyzeDevice(deviceId);
  };

  const handleFullWipe = (deviceId) => {
    navigate(`/full-wipe?deviceId=${deviceId}`);
  };

  const handleSelectiveWipe = (deviceId) => {
    navigate(`/selective-wipe?deviceId=${deviceId}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 border-opacity-50">
        <div className="flex items-center space-x-2.5">
          <HardDrive className="w-6 h-6 text-cyber-secondary shadow-neon-cyan" />
          <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Storage Asset Management</h2>
        </div>
        <Button 
          variant="ghost" 
          onClick={fetchDevices}
          disabled={scanning}
          className="flex items-center space-x-2 text-xs uppercase font-bold tracking-wider"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>Refresh Scan</span>
        </Button>
      </div>

      <WarningAlert 
        title="HARDWARE WRITE ACCESS ADVISORY"
        message="Only mount assets scheduled for immediate disposal or decommissioning. Operating system drives and active database volumes are automatically locked from write commands. SSD warning wear leveling wear profiles apply."
      />

      <div className="pt-2">
        <DeviceGrid 
          devices={devices}
          onAnalyze={handleAnalyze}
          onFullWipe={handleFullWipe}
          onSelectiveWipe={handleSelectiveWipe}
          scanning={scanning}
        />
      </div>
    </div>
  );
}
