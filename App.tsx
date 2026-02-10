import React, { useState, useRef, useEffect } from 'react';
import TopoCanvas from './components/TopoCanvas';
import ControlPanel from './components/ControlPanel';
import Watermark from './components/Watermark';
import { ProjectConfig, GeneratedTopology, NodeType, VendorID, NetworkPlane } from './types';
import { generateTopology } from './utils/generator';
import { PLANE_CONFIG } from './constants';
import { Info, GripHorizontal } from 'lucide-react';

const INITIAL_CONFIG: ProjectConfig = {
  projectId: 'PRJ-2025-001',
  projectName: '云交付项目 A',
  vendorId: 'HUAWEI_CLOUD',
  mode: 'HCI',
  network: {
      deploymentMode: 'Converged',
      coreRedundancy: 'Redundant',
      enableManagement: true,
      managementRedundancy: 'Single',
      enableBusiness: true,
      businessRedundancy: 'Redundant',
      enableStorage: true,
      storageRedundancy: 'Redundant',
      enableBackup: true,
      backupRedundancy: 'Single',
      enableIpmi: true
  },
  nodeCount: 6,
  storageCount: 3,
  showWatermark: true,
  showLegend: true,
  watermarkText: '内部机密 - 禁止外传'
};

const App: React.FC = () => {
  const [config, setConfig] = useState<ProjectConfig>(INITIAL_CONFIG);
  const [topologyData, setTopologyData] = useState<GeneratedTopology | null>({ nodes: [], edges: [], groups: [] });
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  
  // Interaction State
  const [activeLineStyle, setActiveLineStyle] = useState<NetworkPlane | null>(null);

  // Legend State
  const [legendLabels, setLegendLabels] = useState<Record<string, string>>({});
  const [legendPos, setLegendPos] = useState({ x: window.innerWidth - 240, y: window.innerHeight - 300 });
  const isDraggingLegend = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleGenerate = () => {
    const data = generateTopology(config);
    setTopologyData(data);
  };

  const handleExport = () => {
    if (!topologyData) return;
    const jsonString = JSON.stringify({ config, graph: topologyData, customIcons, legendLabels }, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.projectName.replace(/\s+/g, '_')}_topology.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
           const imported = JSON.parse(ev.target?.result as string);
           if (imported.config && imported.graph) {
               setConfig(imported.config);
               setTopologyData(imported.graph);
               if (imported.customIcons) setCustomIcons(imported.customIcons);
               if (imported.legendLabels) setLegendLabels(imported.legendLabels);
           } else {
               alert('无效的配置文件格式');
           }
        } catch (err) {
            alert('文件解析失败');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleClear = () => {
      if (window.confirm("确定要清空画布吗？所有未保存的更改将丢失。")) {
          setTopologyData({ nodes: [], edges: [], groups: [] });
      }
  };

  const handleIconUpload = (vendor: VendorID, type: NodeType, url: string) => {
    const key = `${vendor}_${type}`;
    setCustomIcons(prev => ({ ...prev, [key]: url }));
  };

  const handleDropNode = (x: number, y: number, type: NodeType, iconUrl: string) => {
      const currentData = topologyData || { nodes: [], edges: [], groups: [] };
      const newNodeId = `manual-${Date.now()}`;
      const newNode = {
          id: newNodeId,
          type: type,
          label: `${type.toUpperCase()}-Manual`,
          x: x - 30, 
          y: y - 30,
          ip: '0.0.0.0',
          iconUrl: iconUrl
      };
      setTopologyData({
          ...currentData,
          nodes: [...currentData.nodes, newNode]
      });
  };

  const toggleLegendEdit = (key: string, original: string) => {
      const current = legendLabels[key] || original;
      const newLabel = prompt("修改图例名称:", current);
      if (newLabel) {
          setLegendLabels(prev => ({ ...prev, [key]: newLabel }));
      }
  };

  // Legend Drag Logic
  const handleLegendMouseDown = (e: React.MouseEvent) => {
    isDraggingLegend.current = true;
    dragOffset.current = {
      x: e.clientX - legendPos.x,
      y: e.clientY - legendPos.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingLegend.current) {
      setLegendPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingLegend.current = false;
  };

  return (
    <div 
      className="flex h-screen w-screen bg-gray-50 overflow-hidden font-sans"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      
      {/* Sidebar Controls */}
      <ControlPanel 
        config={config} 
        customIcons={customIcons}
        activeLineStyle={activeLineStyle}
        onConfigChange={setConfig} 
        onGenerate={handleGenerate}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
        onIconUpload={handleIconUpload}
        onSelectLineStyle={setActiveLineStyle}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex flex-col">
        
        {/* Header/Toolbar Overlay - Simplified */}
        <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm shadow-sm border border-gray-200 px-6 py-2 rounded-full flex items-center gap-4">
           <span className="text-xs font-semibold text-gray-500">项目名称:</span>
           <input 
             type="text" 
             value={config.projectName}
             onChange={(e) => setConfig({ ...config, projectName: e.target.value })}
             className="text-lg font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-500 focus:outline-none w-64 text-center transition-all"
           />
        </div>

        {/* Draggable Legend Overlay */}
        {config.showLegend && (
          <div 
            className="absolute z-30 bg-white/95 backdrop-blur shadow-xl border border-gray-200 rounded-lg w-[220px] select-none flex flex-col"
            style={{ left: legendPos.x, top: legendPos.y }}
          >
            {/* Legend Header / Drag Handle */}
            <div 
              className="bg-gray-50 px-3 py-2 rounded-t-lg border-b border-gray-100 flex items-center justify-between cursor-move"
              onMouseDown={handleLegendMouseDown}
            >
               <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">网络平面图例</span>
               <GripHorizontal size={14} className="text-gray-400" />
            </div>
            
            <div className="p-3 space-y-2">
              {Object.entries(PLANE_CONFIG).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1 rounded" onDoubleClick={() => toggleLegendEdit(key, value.label)}>
                  <div className="w-8 h-0 border-b relative" style={{ borderColor: value.color, borderStyle: value.style === 'dashed' ? 'dashed' : 'solid', borderWidth: value.width }}>
                     <div className="absolute -right-1 top-1/2 -mt-[3px] w-1.5 h-1.5 rounded-full" style={{ backgroundColor: value.color }}></div>
                  </div>
                  <span className="text-xs font-medium text-gray-700 truncate" title="双击编辑">{legendLabels[key] || value.label}</span>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 bg-gray-50 rounded-b-lg border-t border-gray-100">
               <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <Info size={12} />
                  <span>双击文字可修改</span>
               </div>
            </div>
          </div>
        )}

        {/* Watermark Overlay */}
        <Watermark text={config.watermarkText} visible={config.showWatermark} />

        {/* Canvas */}
        <TopoCanvas 
            data={topologyData} 
            config={config} 
            customIcons={customIcons}
            activeLineStyle={activeLineStyle}
            onDropNode={handleDropNode}
            onSelectLineStyle={setActiveLineStyle}
        />
        
      </div>
    </div>
  );
};

export default App;