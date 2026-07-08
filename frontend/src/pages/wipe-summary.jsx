import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDevices } from '../context/DeviceContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';
import GlassCard from '../components/common/GlassCard';
import Button from '../components/common/Button';
import ConfirmationModal from '../components/common/ConfirmationModal';
import WarningAlert from '../components/common/WarningAlert';
import ProgressVisualizer from '../components/ProgressVisualizer';
import { ShieldAlert, Award, FileSpreadsheet, Hourglass, ShieldCheck, XOctagon } from 'lucide-react';

export default function WipeSummary() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { devices, fetchDevices } = useDevices();
  const { showNotification } = useNotifications();

  // Parse Query Parameters
  const deviceId = searchParams.get('deviceId');
  const wipeType = searchParams.get('type') || 'FULL';
  const algoId = searchParams.get('algorithm') || 'dod_3pass';
  const isSimulation = searchParams.get('isSimulation') === 'true' || (deviceId && deviceId.includes('virtual'));
  
  let selectedFiles = [];
  try {
    const filesParam = searchParams.get('files');
    if (filesParam) {
      selectedFiles = JSON.parse(decodeURIComponent(filesParam));
    }
  } catch (parseErr) {
    console.error('[Wipe Summary] Failed to parse selected files:', parseErr);
  }

  const device = devices.find(d => d.id === deviceId);
  const isSSD = device && (device.type === 'ssd' || device.type === 'internal_sata_ssd' || device.type === 'nvme_ssd');

  // States
  const [showConfirm, setShowConfirm] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [progress, setProgress] = useState(null);
  const [showWipeSummary, setShowWipeSummary] = useState(false);
  const [jobId, setJobId] = useState('');

  // Map Algorithm Labels
  const getAlgoLabel = (id) => {
    switch (id) {
      case 'single_pass': return '1 Pass Overwrite';
      case 'double_pass': return '2 Pass Overwrite';
      case 'dod_3pass':
      default:
        return '3 Pass Overwrite (DoD)';
    }
  };

  // Compute Time Estimates
  const getEstimatedTime = () => {
    if (isSimulation) return '15 Seconds (Demo)';
    const baseFiles = wipeType === 'FULL' ? 100 : selectedFiles.length;
    const passes = algoId === 'dod_3pass' ? 3 : algoId === 'double_pass' ? 2 : 1;
    const seconds = baseFiles * passes * 0.1; // Simulated delay bounds
    return seconds > 60 ? `${Math.ceil(seconds / 60)} Minutes` : `${Math.ceil(seconds)} Seconds`;
  };

  const handleStartWipe = async () => {
    if (isSSD) {
      showNotification('SSD detected. Secure erase is write-blocked.', 'danger', 'Wipe Blocked');
      return;
    }

    console.log('[Wipe Summary] Confirmation received. Starting wipe process...');
    setShowConfirm(false);
    setIsWiping(true);

    try {
      let activeJobId = '';

      console.log('[Wipe Summary] Dispatching API request. Type:', wipeType, 'Algorithm:', algoId, 'Simulation:', isSimulation);
      if (wipeType === 'FULL') {
        const res = await api.post('/start-full-wipe', { deviceId, algorithm: algoId, isSimulation });
        if (!res.data.success) {
          showNotification(res.data.message || 'Full wipe failed to start.', 'danger', 'Error');
          setIsWiping(false);
          return;
        }
        activeJobId = res.data.data.jobId;
      } else {
        const res = await api.post('/start-selective-wipe', { deviceId, filePaths: selectedFiles, algorithm: algoId, isSimulation });
        if (!res.data.success) {
          showNotification(res.data.message || 'Selective wipe failed to start.', 'danger', 'Error');
          setIsWiping(false);
          return;
        }
        activeJobId = res.data.data.jobId;
      }

      setJobId(activeJobId);
      console.log('[Wipe Summary] API request successful. Received jobId:', activeJobId);
      showNotification('Destruction script triggered on device.', 'info', 'Sanitization Run');
      
      const ssePath = `/api/progress/${activeJobId}`;
      console.log('[Wipe Summary] Connecting to SSE progress stream:', ssePath);
      const eventSource = new EventSource(ssePath);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[Wipe Summary] SSE Progress tick received:', data);
          
          if (data.status === 'connected') return;

          setProgress(data);

          if (data.stage === 'completed' || data.stage === 'failed') {
            console.log('[Wipe Summary] SSE stream finished. Stage:', data.stage);
            eventSource.close();
            setIsWiping(false);
            setShowWipeSummary(true);
            if (data.stage === 'completed') {
              showNotification('Sanitization check complete. Asset cleared.', 'success', 'Audit Complete');
              fetchDevices(); // Automatically refresh device statistics
            } else {
              showNotification(data.error || 'Sanitization process failed.', 'danger', 'Wipe Error');
            }
          }
        } catch (parseErr) {
          console.error('[Wipe Summary] Error parsing progress stream tick:', parseErr);
        }
      };

      eventSource.onerror = (err) => {
        console.error('[Wipe Summary] [SSE Error] Connection dropped or failed:', err);
        eventSource.close();
        setIsWiping(false);
        showNotification('Secure progress stream interrupted. Re-establishing connection...', 'warning', 'Connection Alert');
      };

    } catch (err) {
      console.error('[Wipe Summary] Wipe initiation failed with exception:', err);
      setIsWiping(false);
      const errorMsg = err.response?.data?.error || err.message || 'Wipe initiation failed.';
      showNotification(errorMsg, 'danger', 'Error');
    }
  };

  // Intercept rendering for SSDs to block operations and display info panel
  if (device && isSSD) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className="w-6 h-6 text-amber-500 shadow-neon-amber" />
          <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Operation Blocked</h2>
        </div>

        <GlassCard glowColor="warning" className="p-6 border-amber-900 border-opacity-35 bg-slate-950 bg-opacity-70 space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] text-cyber-muted font-bold tracking-widest uppercase">Storage Type</span>
            <h4 className="text-xl font-bold text-amber-400">
              {device.type === 'nvme_ssd' ? 'Internal NVMe SSD' : 'Internal SATA SSD'}
            </h4>
            <div className="text-xs text-slate-400 mt-1">
              Bus Type: {device.busType || 'Unknown'} | Connection Type: {device.connectionType || 'Internal'}
            </div>
          </div>

          <div className="p-4 bg-amber-950 bg-opacity-20 border border-amber-900 border-opacity-30 rounded-xl space-y-2 text-amber-400 text-xs">
            <div className="flex items-center space-x-2 font-bold uppercase tracking-wider text-amber-500">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>Sanitization Blocked</span>
            </div>
            <p className="text-slate-300 leading-normal">
              Standard software overwrite sanitization is disabled for SSD media in this version to prevent physical drive wear and ensure forensic safety. Advanced SSD Secure Erase will be available in a future version.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-8 py-3 text-xs font-bold uppercase tracking-wider"
            >
              Return to Dashboard
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (showWipeSummary) {
    const isPassed = progress?.stage === 'completed';
    const totalFiles = progress?.totalFiles || (wipeType === 'FULL' ? 100 : selectedFiles.length);
    const succeededFiles = progress?.filesProcessed || (isPassed ? totalFiles : 0);
    const failedFiles = progress?.failedFiles !== undefined ? progress.failedFiles : (isPassed ? 0 : totalFiles - succeededFiles);
    
    const formattedBytes = progress?.bytesWritten 
      ? progress.bytesWritten > 1024 * 1024
        ? `${(progress.bytesWritten / (1024 * 1024)).toFixed(1)} MB`
        : `${(progress.bytesWritten / 1024).toFixed(1)} KB`
      : '0 KB';

    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className={`w-6 h-6 ${isPassed ? 'text-emerald-400' : 'text-red-400'}`} />
          <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Secure Wipe Summary</h2>
        </div>

        <GlassCard glowColor={isPassed ? 'green' : 'danger'} className="space-y-6 bg-slate-950 bg-opacity-70 border-cyber-border">
          <div className="text-center py-4">
            <h3 className={`text-2xl font-black uppercase tracking-widest ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
              Wipe {isPassed ? 'SUCCESS' : 'FAILED'}
            </h3>
            <p className="text-xs text-cyber-muted mt-1 font-semibold uppercase tracking-wider">
              Asset Disposal Protocol Summary
            </p>
          </div>

          <div className="p-4 bg-slate-900 bg-opacity-50 border border-slate-800 rounded-2xl text-xs space-y-3">
            <div className="flex justify-between py-1.5 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted">Device Name:</span>
              <span className="font-bold text-slate-200">{device?.name || 'Unknown'}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted">Wipe Method:</span>
              <span className="font-bold text-slate-200">{getAlgoLabel(algoId)}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted">Files Selected:</span>
              <span className="font-bold text-slate-200">{totalFiles}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted">Files Successfully Wiped:</span>
              <span className="font-bold text-emerald-400">{succeededFiles}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted">Failed Files:</span>
              <span className={`font-bold ${failedFiles > 0 ? 'text-red-400' : 'text-slate-200'}`}>{failedFiles}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted">Total Data Wiped:</span>
              <span className="font-bold text-slate-200">{formattedBytes}</span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-cyber-muted">Final Status:</span>
              <span className={`font-bold ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPassed ? 'COMPLETED' : 'FAILED'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button 
              variant="primary" 
              onClick={() => navigate(`/verification?jobId=${jobId}`)}
              className="w-full sm:w-auto px-8 py-3 shadow-neon-purple text-xs font-bold uppercase tracking-wider"
            >
              Continue to Verification
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (isWiping || progress) {
    console.log('[Wipe Summary] Rendering active destruction progress visualizer. Progress state:', progress);
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-2.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span>
          <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Destruction Active</h2>
        </div>
        <ProgressVisualizer progress={progress} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center space-x-2.5">
        <ShieldAlert className="w-6 h-6 text-cyber-primary shadow-neon-purple" />
        <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Disposal Schedule Summary</h2>
      </div>

      <WarningAlert 
        title="CRITICAL SECURITY CLEARANCE WARNING"
        message="You are scheduling irreversible destruction commands. Once launched, sector-level bit writing runs directly. Raw data directories, filesystem maps, and master block tables will be overwritten. Data retrieval is forensically impossible."
      />

      {device ? (
        <GlassCard glowColor="purple" className="space-y-6 bg-slate-950 bg-opacity-70 border-cyber-border">
          {/* Summary grid */}
          <div className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted flex items-center"><ShieldCheck className="w-4 h-4 mr-1.5" /> Target Asset:</span>
              <span className="font-bold text-slate-200">{device.name} [{device.path}]</span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted flex items-center"><FileSpreadsheet className="w-4 h-4 mr-1.5" /> Wipe Scope:</span>
              <span className="font-bold text-slate-200">
                {wipeType === 'FULL' ? 'COMPLETE DEVICE VOLUME' : `${selectedFiles.length} Target Files`}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-800 border-opacity-40">
              <span className="text-cyber-muted flex items-center"><Award className="w-4 h-4 mr-1.5" /> Protocol:</span>
              <span className="font-bold text-cyber-secondary drop-shadow-[0_0_6px_rgba(6,182,212,0.2)]">
                {getAlgoLabel(algoId)} {isSimulation && ' (SIMULATED)'}
              </span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-cyber-muted flex items-center"><Hourglass className="w-4 h-4 mr-1.5" /> Est. sanitization time:</span>
              <span className="font-bold text-slate-200">{getEstimatedTime()}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 border-opacity-40">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-wider"
            >
              <XOctagon className="w-4 h-4" />
              <span>Cancel</span>
            </Button>
            <Button 
              variant="primary" 
              onClick={() => {
                console.log('[Wipe Summary] Before wipe starts. Triggering confirmation modal.');
                setShowConfirm(true);
              }}
              className="flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-wider shadow-neon-purple"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Start Secure Wipe</span>
            </Button>
          </div>
        </GlassCard>
      ) : (
        <div className="p-4 text-center text-xs text-red-400 glass-panel border-red-900 rounded-xl">
          Error: Reference asset invalid. Return to Dashboard.
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleStartWipe}
        confirmText={device && (device.type === 'internal_hdd' || device.type === 'internal_sata_ssd' || device.type === 'nvme_ssd' || device.type === 'ssd') ? 'DESTROY' : undefined}
        title="PROCEED WITH SECURE DESTRUCTION?"
        message={`Confirm scheduling of ${getAlgoLabel(algoId)} erasure over selected components of ${device?.name}. All indexes and clusters will be overwritten. Data recovery is forensically impossible.`}
      />
    </div>
  );
}
