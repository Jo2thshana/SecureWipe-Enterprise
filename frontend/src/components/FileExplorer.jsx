import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Folder, File, ChevronDown, ChevronRight, CheckSquare, Square, ShieldAlert, Lock, AlertTriangle } from 'lucide-react';
import Button from './common/Button';
import LoadingSpinner from './common/LoadingSpinner';
import api from '../services/api';
import { useDevices } from '../context/DeviceContext';

export default function FileExplorer({ onWipeSelect }) {
  const [searchParams] = useSearchParams();
  const deviceId = searchParams.get('deviceId') || 'usb-kingston-32g';
  const { devices } = useDevices();
  const device = devices.find(d => d.id === deviceId);
  const isSSD = device && (device.type === 'ssd' || device.type === 'internal_sata_ssd' || device.type === 'nvme_ssd');

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Track lazy loading state per path
  const [loadingPaths, setLoadingPaths] = useState({});
  const [loadedFolders, setLoadedFolders] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  
  // Track selected file path checkbox status
  const [selectedPaths, setSelectedPaths] = useState({});

  // Fetch root level folders and files
  const fetchRootFiles = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/devices/${deviceId}/files`);
      setFiles(data.data.files || []);
      // Reset selections and loads
      setSelectedPaths({});
      setExpandedFolders({});
      setLoadedFolders({});
      setLoadingPaths({});
    } catch (err) {
      console.error('[FileExplorer] Failed to load root files:', err);
      setError(err.response?.data?.error || 'Failed to read directory structure from device. Ensure it is connected and readable.');
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchRootFiles();
  }, [fetchRootFiles]);

  // Lazily load subfolder content when expanded
  const loadFolderContents = async (folderPath) => {
    if (loadedFolders[folderPath] || loadingPaths[folderPath]) return;

    setLoadingPaths(prev => ({ ...prev, [folderPath]: true }));
    try {
      const { data } = await api.get(`/devices/${deviceId}/files`, {
        params: { path: folderPath }
      });
      const children = data.data.files || [];

      // Merge children into tree
      setFiles(prevFiles => {
        const updateTree = (nodes) => {
          return nodes.map(node => {
            if (node.path === folderPath) {
              return { ...node, children };
            }
            if (node.children) {
              return { ...node, children: updateTree(node.children) };
            }
            return node;
          });
        };
        return updateTree(prevFiles);
      });

      setLoadedFolders(prev => ({ ...prev, [folderPath]: true }));
    } catch (err) {
      console.error('[FileExplorer] Failed to load subfolder:', err);
      const errMsg = err.response?.data?.error || 'Access Denied';
      setFiles(prevFiles => {
        const updateTree = (nodes) => {
          return nodes.map(node => {
            if (node.path === folderPath) {
              return { ...node, error: errMsg, children: [] };
            }
            if (node.children) {
              return { ...node, children: updateTree(node.children) };
            }
            return node;
          });
        };
        return updateTree(prevFiles);
      });
      setLoadedFolders(prev => ({ ...prev, [folderPath]: true }));
    } finally {
      setLoadingPaths(prev => ({ ...prev, [folderPath]: false }));
    }
  };

  const toggleFolder = async (path) => {
    const isExpanded = !!expandedFolders[path];
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));

    if (!isExpanded) {
      await loadFolderContents(path);
    }
  };

  const getAllChildFiles = (node, list = []) => {
    if (node.type === 'file') {
      list.push(node);
    } else if (node.children) {
      for (const child of node.children) {
        getAllChildFiles(child, list);
      }
    }
    return list;
  };

  const handleSelectToggle = (node) => {
    if (isSSD) return; // Prevent selection on SSD
    if (node.error) return; // Disallow selecting error folders

    const isSelected = !!selectedPaths[node.path];
    const newSelections = { ...selectedPaths };

    if (node.type === 'file') {
      if (isSelected) {
        delete newSelections[node.path];
      } else {
        newSelections[node.path] = true;
      }
    } else {
      const children = getAllChildFiles(node);
      if (isSelected) {
        delete newSelections[node.path];
        children.forEach(c => delete newSelections[c.path]);
      } else {
        newSelections[node.path] = true;
        children.forEach(c => { newSelections[c.path] = true; });
      }
    }

    setSelectedPaths(newSelections);
  };

  const handleSelectAll = () => {
    if (isSSD) return; // Prevent selection on SSD
    const allSelected = Object.keys(selectedPaths).length > 5;
    if (allSelected) {
      setSelectedPaths({});
    } else {
      const selections = {};
      const selectAll = (nodes) => {
        for (const n of nodes) {
          if (n.error) continue;
          selections[n.path] = true;
          if (n.children) selectAll(n.children);
        }
      };
      selectAll(files);
      setSelectedPaths(selections);
    }
  };

  const getSelectedMetrics = () => {
    let fileCount = 0;
    let totalBytes = 0;
    const activePaths = [];

    const calculate = (nodes) => {
      for (const n of nodes) {
        if (n.type === 'file' && selectedPaths[n.path]) {
          fileCount++;
          totalBytes += n.size || 0;
          activePaths.push(n.name);
        }
        if (n.children) calculate(n.children);
      }
    };
    calculate(files);

    return { fileCount, totalBytes, activePaths };
  };

  const { fileCount, totalBytes } = getSelectedMetrics();

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderNode = (node, depth = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = !!expandedFolders[node.path];
    const isChecked = !!selectedPaths[node.path];
    const hasError = !!node.error;

    return (
      <div key={node.path} className="select-none">
        <div 
          className={`flex items-center space-x-2.5 py-1.5 px-3 hover:bg-slate-800 hover:bg-opacity-35 rounded-lg cursor-pointer transition-colors text-slate-300 ${
            hasError ? 'text-red-400 text-opacity-80' : ''
          }`}
          style={{ paddingLeft: `${Math.max(12, depth * 24)}px` }}
        >
          {/* Arrow indicator for folders */}
          {isFolder ? (
            <div 
              onClick={(e) => { e.stopPropagation(); toggleFolder(node.path); }} 
              className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
            >
              {loadingPaths[node.path] ? (
                <span className="w-3.5 h-3.5 border-2 border-cyber-secondary border-t-transparent rounded-full animate-spin block"></span>
              ) : isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          ) : (
            <span className="w-5" />
          )}

          {/* Checkbox */}
          {!isSSD && (
            <div 
              onClick={() => !hasError && handleSelectToggle(node)}
              className={`${hasError ? 'opacity-30 cursor-not-allowed' : isChecked ? 'text-cyber-secondary' : 'text-slate-500'} hover:scale-105 transition-transform`}
            >
              {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </div>
          )}

          {/* Icon & Label */}
          <div 
            onClick={() => hasError ? null : isFolder ? toggleFolder(node.path) : handleSelectToggle(node)} 
            className="flex items-center space-x-2 flex-grow truncate"
          >
            {hasError ? (
              <Lock className="w-4 h-4 text-red-500 flex-shrink-0" />
            ) : isFolder ? (
              <Folder className="w-4 h-4 text-purple-400 flex-shrink-0" />
            ) : (
              <File className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            )}
            <span className="text-xs font-medium truncate w-48">{node.name}</span>
          </div>

          {/* Size / Error details */}
          {hasError ? (
            <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider bg-red-950 bg-opacity-25 px-1.5 py-0.5 rounded border border-red-900 border-opacity-30">
              Access Denied
            </span>
          ) : !isFolder ? (
            <span className="text-[10px] text-cyber-muted font-mono self-center">
              {formatBytes(node.size)}
            </span>
          ) : null}
        </div>

        {/* Collapsible Children */}
        {isFolder && isExpanded && node.children && (
          <div className="mt-0.5">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleProceed = () => {
    const selectedFiles = [];
    const collect = (nodes) => {
      for (const n of nodes) {
        if (n.type === 'file' && selectedPaths[n.path]) {
          selectedFiles.push(n.path);
        }
        if (n.children) collect(n.children);
      }
    };
    collect(files);
    onWipeSelect(selectedFiles);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center">
        <LoadingSpinner size="lg" message="Scanning file directories..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 px-6 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
        <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest">Directory Access Failed</h4>
        <p className="text-xs text-cyber-muted max-w-md mx-auto leading-relaxed">
          {error}
        </p>
        <Button variant="ghost" onClick={fetchRootFiles} className="text-xs uppercase font-bold tracking-wider">
          Retry Scan
        </Button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="py-20 text-center space-y-4">
        <Folder className="w-12 h-12 text-cyber-muted mx-auto" />
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Items Found</h4>
        <p className="text-[10px] text-cyber-muted max-w-xs mx-auto">
          The selected drive contains no files or folders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selector Header controls */}
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-800 border-opacity-50">
        <span className="text-xs text-cyber-muted font-bold uppercase tracking-widest">{isSSD ? 'Browse Device Files' : 'Wipe Target Files'}</span>
        {!isSSD && (
          <button 
            onClick={handleSelectAll} 
            className="text-[10px] text-cyber-secondary hover:text-cyber-accent transition-colors font-bold uppercase tracking-wider"
          >
            Select All
          </button>
        )}
      </div>

      {/* Rendering directory list */}
      <div className="p-3 bg-slate-950 bg-opacity-70 border border-slate-900 rounded-2xl space-y-1 overflow-y-auto max-h-72">
        {files.map(node => renderNode(node, 0))}
      </div>

      {/* Bottom Sticky status bar */}
      <div className="p-4 bg-slate-900 bg-opacity-40 border border-cyber-border rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-[9px] text-cyber-muted uppercase tracking-wider font-bold block">{isSSD ? 'Device Metrics' : 'Selected Content'}</span>
          <span className="text-xs font-bold text-slate-200">
            {isSSD ? 'Read-only mode active' : `${fileCount} files (${formatBytes(totalBytes)})`}
          </span>
        </div>
        <Button 
          variant="secondary"
          onClick={handleProceed}
          disabled={isSSD || fileCount === 0}
          className={`text-xs py-2 px-4 flex items-center space-x-1.5 ${isSSD ? 'opacity-40 cursor-not-allowed' : 'shadow-neon-cyan'}`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{isSSD ? 'Sanitization Locked' : 'Proceed to Wipe'}</span>
        </Button>
      </div>
    </div>
  );
}
