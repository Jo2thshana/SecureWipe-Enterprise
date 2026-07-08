import React from 'react';
import DeviceCard from './DeviceCard';
import LoadingSpinner from './common/LoadingSpinner';
import { HardDrive, Laptop, Usb } from 'lucide-react';

export default function DeviceGrid({ devices, onAnalyze, onFullWipe, onSelectiveWipe, loading = false, scanning = false }) {
  if (scanning) {
    return (
      <div className="py-20 glass-panel rounded-2xl border border-cyber-border flex items-center justify-center">
        <LoadingSpinner size="lg" message="Scanning operational endpoints for connected hardware..." />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="py-20 glass-panel rounded-2xl border border-cyber-border text-center space-y-4">
        <HardDrive className="w-16 h-16 text-cyber-muted mx-auto animate-bounce" />
        <h4 className="text-lg font-bold text-slate-300 uppercase tracking-widest">No Storage Media Detected</h4>
        <p className="text-xs text-cyber-muted max-w-sm mx-auto leading-relaxed">
          Please mount your storage device and trigger a hardware scan.
        </p>
      </div>
    );
  }

  const removableDevices = devices.filter(
    (d) => d.type === 'pendrive' || d.type === 'external_hdd'
  );
  
  const internalDevices = devices.filter(
    (d) => d.type === 'internal_hdd' || d.type === 'internal_sata_ssd' || d.type === 'nvme_ssd' || d.type === 'ssd'
  );

  return (
    <div className="space-y-8">
      {/* Removable Devices Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-cyan-400">
          <Usb className="w-4 h-4" />
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300">Removable Devices ({removableDevices.length})</h4>
        </div>
        {removableDevices.length === 0 ? (
          <div className="p-6 text-center text-xs text-cyber-muted border border-dashed border-slate-800 rounded-xl bg-slate-950 bg-opacity-30">
            No removable devices (USB pen drives or external HDDs) currently connected.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {removableDevices.map((device) => (
              <div key={device.id} className="h-full">
                <DeviceCard 
                  device={device}
                  onAnalyze={onAnalyze}
                  onFullWipe={onFullWipe}
                  onSelectiveWipe={onSelectiveWipe}
                  loading={loading}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Internal Devices Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-purple-400">
          <Laptop className="w-4 h-4" />
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300">Internal Devices ({internalDevices.length})</h4>
        </div>
        {internalDevices.length === 0 ? (
          <div className="p-6 text-center text-xs text-cyber-muted border border-dashed border-slate-800 rounded-xl bg-slate-950 bg-opacity-30">
            No internal HDDs or SSDs detected.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {internalDevices.map((device) => (
              <div key={device.id} className="h-full">
                <DeviceCard 
                  device={device}
                  onAnalyze={onAnalyze}
                  onFullWipe={onFullWipe}
                  onSelectiveWipe={onSelectiveWipe}
                  loading={loading}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
