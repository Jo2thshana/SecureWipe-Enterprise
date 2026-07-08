import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDevices } from '../context/DeviceContext';
import { useNotifications } from '../context/NotificationContext';
import GlassCard from '../components/common/GlassCard';
import RiskAnalysisCard from '../components/RiskAnalysisCard';
import Button from '../components/common/Button';
import { ShieldAlert, HardDrive, ShieldCheck } from 'lucide-react';

export default function FullWipe() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { devices, analyzeDevice } = useDevices();
  const { showNotification } = useNotifications();

  const deviceId = searchParams.get('deviceId');
  const device = devices.find(d => d.id === deviceId);

  const [riskReport, setRiskReport] = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [algorithm, setAlgorithm] = useState('dod_3pass');

  useEffect(() => {
    if (deviceId) {
      setLoadingRisk(true);
      analyzeDevice(deviceId)
        .then(res => setRiskReport(res))
        .catch(err => {
          console.error('[Full Wipe] Device analysis failed:', err);
          showNotification(err.response?.data?.error || 'Profiling analysis failed.', 'danger', 'Analysis Error');
        })
        .finally(() => setLoadingRisk(false));
    }
  }, [deviceId]);

  const handleProceed = () => {
    if (!device) return;
    navigate(`/wipe-summary?deviceId=${deviceId}&type=FULL&algorithm=${algorithm}`);
  };

  const isSSD = device && (device.type === 'ssd' || device.type === 'internal_sata_ssd' || device.type === 'nvme_ssd');

  const algos = [
    { id: 'single_pass', name: '1 Pass Overwrite', desc: 'Overwrites all target files once with random data. Normal speed.', security: 'Basic' },
    { id: 'double_pass', name: '2 Pass Overwrite', desc: 'Overwrites all target files twice (Zeroes, then random bytes). High speed.', security: 'High' },
    { id: 'dod_3pass', name: '3 Pass Overwrite (DoD)', desc: 'Overwrites all target files three times (Zeroes, Ones, then random bytes). Moderate speed.', security: 'Maximum' }
  ];

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 pb-12">
      {/* Left panel: Info & Risk */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className="w-6 h-6 text-cyber-primary shadow-neon-purple rounded" />
          <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Device Sanitization</h2>
        </div>

        {device ? (
          <GlassCard className="bg-slate-950 bg-opacity-70 border-cyber-border p-4 flex items-center space-x-3">
            <HardDrive className="w-5 h-5 text-cyber-secondary" />
            <div>
              <h4 className="font-bold text-sm text-slate-100">{device.name}</h4>
              <p className="text-[10px] text-cyber-muted uppercase tracking-widest font-semibold">
                Path: {device.path} | Capacity: {(device.capacity / (1024 * 1024 * 1024)).toFixed(1)} GB
              </p>
            </div>
          </GlassCard>
        ) : (
          <div className="p-4 text-center text-xs text-red-400 glass-panel border-red-900 rounded-xl">
            Warning: Target device not selected. Return to Dashboard to scan.
          </div>
        )}

        <RiskAnalysisCard report={riskReport} loading={loadingRisk} />
      </div>

      {/* Right panel: Algorithm selection or SSD Roadmap warning */}
      {!isSSD ? (
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center space-x-2.5 pb-2">
            <ShieldCheck className="w-6 h-6 text-cyber-secondary shadow-neon-cyan" />
            <h3 className="text-lg font-bold uppercase tracking-widest text-slate-200">Wiping Protocol Configuration</h3>
          </div>

          <div className="space-y-4">
            {algos.map((alg) => (
              <div 
                key={alg.id}
                onClick={() => setAlgorithm(alg.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  algorithm === alg.id 
                    ? 'border-cyber-primary bg-cyber-primary bg-opacity-10 shadow-neon-purple' 
                    : 'border-slate-800 bg-slate-950 bg-opacity-60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-sm text-slate-100">{alg.name}</h4>
                  <span className={`text-[9px] px-2 py-0.5 border rounded-full font-bold uppercase ${
                    alg.id === 'schneier_7pass' ? 'border-red-500 text-red-400' : 
                    alg.id === 'dod_3pass' ? 'border-cyan-500 text-cyan-400' : 'border-purple-500 text-purple-400'
                  }`}>
                    {alg.security}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-normal">{alg.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
            <Button 
              variant="primary" 
              onClick={handleProceed}
              disabled={!device}
              className="w-full sm:w-auto px-8 py-3 shadow-neon-purple text-xs font-bold uppercase tracking-wider"
            >
              Configure Destruction Schedule
            </Button>
          </div>
        </div>
      ) : (
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center space-x-2.5 pb-2">
            <ShieldAlert className="w-6 h-6 text-amber-500 shadow-neon-amber" />
            <h3 className="text-lg font-bold uppercase tracking-widest text-slate-200">SSD Diagnostics & Roadmap</h3>
          </div>

          <GlassCard glowColor="warning" className="p-6 border-amber-900 border-opacity-35 bg-slate-950 bg-opacity-70 space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] text-cyber-muted font-bold tracking-widest uppercase">Storage Type</span>
              <h4 className="text-xl font-bold text-amber-400">{device.type === 'nvme_ssd' ? 'Internal NVMe SSD' : 'Internal SATA SSD'}</h4>
              <div className="text-xs text-slate-400 mt-1">Bus Type: {device.busType || 'Unknown'} | Connection Type: {device.connectionType || 'Internal'}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-900 border-opacity-60 pt-4">
              <div className="space-y-3">
                <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase block">Current Version Supports</span>
                <div className="space-y-2 text-xs text-slate-200">
                  <div className="flex items-center"><span className="text-emerald-400 mr-2 font-bold">✓</span> Device Detection</div>
                  <div className="flex items-center"><span className="text-emerald-400 mr-2 font-bold">✓</span> Device Analysis</div>
                  <div className="flex items-center"><span className="text-emerald-400 mr-2 font-bold">✓</span> File Browsing</div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] text-amber-400 font-bold tracking-widest uppercase block">Future Versions Will Support</span>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center"><span className="text-amber-500 mr-2 font-bold">•</span> Advanced SSD Secure Erase</div>
                  <div className="flex items-center"><span className="text-amber-500 mr-2 font-bold">•</span> Verification</div>
                  <div className="flex items-center"><span className="text-amber-500 mr-2 font-bold">•</span> Certificate Generation</div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-900 border-opacity-60 pt-4 text-xs text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-200 uppercase tracking-wider block mb-1">Architecture Notice:</span>
              Standard software overwrite passes cannot guarantee complete data sanitization due to SSD wear-leveling controllers. To prevent premature wear on targeted physical blocks, write execution features are blocked for SSD media in this release.
            </div>
          </GlassCard>

          <div className="pt-4 flex justify-end">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-8 py-3 text-xs font-bold uppercase tracking-wider"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
