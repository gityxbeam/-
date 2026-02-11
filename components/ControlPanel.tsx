import React, { useState, useRef, useEffect } from 'react';
import { ProjectConfig, CustomIcon, VendorID, NodeType, NetworkPlane, SwitchRedundancy } from '../types';
import { Settings, Server, Database, LayoutGrid, FileDown, Play, Share2, Upload, AlertCircle, Check, Cable, FileUp, Trash2, MousePointer2, Box } from 'lucide-react';
import { INITIAL_ICONS, NODE_TYPE_LABELS, PLANE_CONFIG } from '../constants';

interface ControlPanelProps {
  config: ProjectConfig;
  customIcons: Record<string, string>;
  activeLineStyle: NetworkPlane | null;
  onConfigChange: (newConfig: ProjectConfig) => void;
  onGenerate: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onIconUpload: (vendor: VendorID, type: NodeType, url: string) => void;
  onSelectLineStyle: (plane: NetworkPlane | null) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  config, 
  customIcons,
  activeLineStyle,
  onConfigChange, 
  onGenerate, 
  onExport,
  onImport,
  onClear,
  onIconUpload,
  onSelectLineStyle
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'icons'>('config');
  const [iconLibVendor, setIconLibVendor] = useState<VendorID>(config.vendorId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{vendor: VendorID, type: NodeType} | null>(null);

  useEffect(() => {
    setIconLibVendor(config.vendorId);
  }, [config.vendorId]);

  const handleChange = (key: keyof ProjectConfig, value: any) => {
    onConfigChange({ ...config, [key]: value });
  };

  const handleNetworkChange = (key: string, value: any) => {
    onConfigChange({
      ...config,
      network: { ...config.network, [key]: value }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTarget) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
           onIconUpload(uploadTarget.vendor, uploadTarget.type, event.target.result as string);
           setUploadTarget(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = (type: NodeType) => {
    setUploadTarget({ vendor: iconLibVendor, type });
    fileInputRef.current?.click();
  };

  const getIconUrl = (vendor: VendorID, type: NodeType) => {
    const customKey = `${vendor}_${type}`;
    if (customIcons[customKey]) return customIcons[customKey];
    return INITIAL_ICONS[vendor]?.[type] || '';
  };

  const onDragStartNode = (event: React.DragEvent, type: NodeType) => {
    const url = getIconUrl(iconLibVendor, type);
    if (!url) {
      event.preventDefault();
      alert('请先上传该类型的图标文件！');
      return;
    }
    event.dataTransfer.setData('application/json', JSON.stringify({ type, iconUrl: url, category: 'node' }));
    event.dataTransfer.effectAllowed = 'copy';
  };

  // Helper for switch config row
  const SwitchConfigRow = ({ 
    label, 
    enableKey, 
    redundancyKey 
  }: { label: string, enableKey: string, redundancyKey: string }) => {
    const isEnabled = (config.network as any)[enableKey];
    const redundancy = (config.network as any)[redundancyKey];

    return (
      <div className="flex items-center gap-2 text-xs">
         <input 
            type="checkbox" 
            checked={isEnabled} 
            onChange={(e) => handleNetworkChange(enableKey, e.target.checked)}
            className="rounded text-brand-500 focus:ring-0"
         />
         <span className={`flex-1 ${!isEnabled && 'text-gray-400'}`}>{label}</span>
         {isEnabled && (
             <select 
               value={redundancy} 
               onChange={(e) => handleNetworkChange(redundancyKey, e.target.value)}
               className="border border-gray-200 rounded px-1 py-0.5 text-xs bg-white"
             >
               <option value="Single">单机</option>
               <option value="Redundant">堆叠</option>
             </select>
         )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-full flex flex-col shadow-lg z-10">
      <div className="p-5 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">T</div>
          <h1 className="text-xl font-bold text-gray-800">TopoAuto v5.0</h1>
        </div>
        <p className="text-xs text-gray-500">自动化云交付拓扑生成系统</p>
      </div>

      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'config' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          参数配置
        </button>
        <button 
          onClick={() => setActiveTab('icons')}
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'icons' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          图标库管理
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
        <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={onImport} />

        {activeTab === 'config' ? (
        <>
          <section>
            <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold">
              <Settings size={18} />
              <h2>项目基础信息</h2>
            </div>
            <div className="space-y-4">
               <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">厂商 (自动切换图标)</label>
                <select 
                  value={config.vendorId}
                  onChange={(e) => handleChange('vendorId', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                >
                  <option value="HUAWEI_CLOUD">华为 (Huawei)</option>
                  <option value="ZSTACK">ZStack</option>
                  <option value="XSKY">XSKY</option>
                  <option value="SANGFOR">深信服 (Sangfor)</option>
                  <option value="ALIYUN">阿里云 (Aliyun)</option>
                  <option value="AWS">亚马逊 (AWS)</option>
                  <option value="CISCO">思科 (Cisco)</option>
                  <option value="CUSTOM">自定义 (Custom)</option>
                </select>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section>
            <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold">
              <LayoutGrid size={18} />
              <h2>架构设计</h2>
            </div>
            
            <div className="space-y-5">
               <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">部署模式</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleChange('mode', 'HCI')} className={`px-3 py-2 text-xs rounded-md border ${config.mode === 'HCI' ? 'bg-brand-50 border-brand-500 text-brand-700 font-medium' : 'border-gray-200 text-gray-600'}`}>超融合 HCI</button>
                  <button onClick={() => handleChange('mode', 'Standard')} className={`px-3 py-2 text-xs rounded-md border ${config.mode === 'Standard' ? 'bg-brand-50 border-brand-500 text-brand-700 font-medium' : 'border-gray-200 text-gray-600'}`}>存算解耦</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">交换机组网策略</label>
                <select 
                  value={config.network.deploymentMode}
                  onChange={(e) => handleNetworkChange('deploymentMode', e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 bg-white mb-3"
                >
                   <option value="Converged">融合组网 (核心交换机)</option>
                   <option value="Physically_Separated">物理分平面 (多平面隔离)</option>
                </select>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3">
                  
                  {config.network.deploymentMode === 'Converged' ? (
                     <div>
                       <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">核心交换机集群</label>
                       <div className="flex items-center gap-2">
                          <button onClick={() => handleNetworkChange('coreRedundancy', 'Single')} className={`flex-1 py-1 text-xs border rounded ${config.network.coreRedundancy === 'Single' ? 'bg-white border-brand-500 text-brand-600' : 'border-gray-200 text-gray-500'}`}>单机</button>
                          <button onClick={() => handleNetworkChange('coreRedundancy', 'Redundant')} className={`flex-1 py-1 text-xs border rounded ${config.network.coreRedundancy === 'Redundant' ? 'bg-white border-brand-500 text-brand-600' : 'border-gray-200 text-gray-500'}`}>堆叠冗余</button>
                       </div>
                     </div>
                  ) : (
                    <div className="space-y-3">
                       <label className="block text-[10px] uppercase text-gray-400 font-bold">平面启用 & 冗余</label>
                       <SwitchConfigRow label="管理平面" enableKey="enableManagement" redundancyKey="managementRedundancy" />
                       <SwitchConfigRow label="业务平面" enableKey="enableBusiness" redundancyKey="businessRedundancy" />
                       <SwitchConfigRow label="存储平面" enableKey="enableStorage" redundancyKey="storageRedundancy" />
                       <SwitchConfigRow label="备份平面" enableKey="enableBackup" redundancyKey="backupRedundancy" />
                    </div>
                  )}
                  <hr className="border-gray-200" />
                  <div className="flex items-center justify-between">
                     <label className="text-xs text-gray-600">启用带外管理 (IPMI)</label>
                     <input type="checkbox" checked={config.network.enableIpmi} onChange={(e) => handleNetworkChange('enableIpmi', e.target.checked)} className="rounded text-brand-500 focus:ring-brand-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Management Node Config */}
                {config.mode === 'Standard' && (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                      <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold text-orange-800 flex items-center gap-1">管理节点 (MNA)</label>
                          <label className="text-[10px] flex items-center gap-1 text-orange-700">
                             <input type="checkbox" checked={config.reuseCompute} onChange={(e) => handleChange('reuseCompute', e.target.checked)} className="rounded text-orange-600 focus:ring-orange-500"/>
                             复用计算节点
                          </label>
                      </div>
                      {!config.reuseCompute && (
                        <>
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1"><span>数量: {config.managementCount}</span></div>
                            <input type="range" min="1" max="2" value={config.managementCount} onChange={(e) => handleChange('managementCount', parseInt(e.target.value))} className="w-full h-1 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                        </>
                      )}
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1">
                     <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><Server size={14} /> 计算节点 (CNA)</label>
                     <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border">{config.nodeCount}</span>
                  </div>
                  <input type="range" min="0" max="299" value={config.nodeCount} onChange={(e) => handleChange('nodeCount', parseInt(e.target.value))} className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-brand-500" />
                  {config.nodeCount > 12 && <div className="text-[10px] text-blue-500 mt-1">* 已启用堆叠视图 (>12)</div>}
                </div>
                {config.mode === 'Standard' && (
                   <div>
                   <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><Database size={14} /> 存储节点 (SNA)</label>
                      <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border">{config.storageCount}</span>
                   </div>
                   <input type="range" min="2" max="12" value={config.storageCount} onChange={(e) => handleChange('storageCount', parseInt(e.target.value))} className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-brand-500" />
                 </div>
                )}
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />
          <section>
            <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold">
              <Share2 size={18} />
              <h2>交付选项</h2>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.showWatermark} onChange={(e) => handleChange('showWatermark', e.target.checked)} className="rounded text-brand-500 focus:ring-brand-500" />
                <span className="text-sm text-gray-600">显示水印</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.showBOM} onChange={(e) => handleChange('showBOM', e.target.checked)} className="rounded text-brand-500 focus:ring-brand-500" />
                <span className="text-sm text-gray-600">显示 BOM 统计</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.showLegend} onChange={(e) => handleChange('showLegend', e.target.checked)} className="rounded text-brand-500 focus:ring-brand-500" />
                <span className="text-sm text-gray-600">显示图例</span>
              </label>
              <input type="text" value={config.watermarkText} onChange={(e) => handleChange('watermarkText', e.target.value)} disabled={!config.showWatermark} className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400" />
            </div>
          </section>
        </>) : (
          <section className="space-y-6">
             {/* Icon management same as before... */}
             <div>
                <div className="flex items-center justify-between mb-2">
                   <h3 className="text-sm font-semibold text-gray-700">设备图标库</h3>
                   <select 
                     value={iconLibVendor} 
                     onChange={(e) => setIconLibVendor(e.target.value as VendorID)}
                     className="text-xs border border-gray-300 rounded px-1 py-0.5"
                   >
                     <option value="HUAWEI_CLOUD">华为</option>
                     <option value="ZSTACK">ZStack</option>
                     <option value="XSKY">XSKY</option>
                     <option value="SANGFOR">深信服</option>
                     <option value="ALIYUN">阿里云</option>
                     <option value="AWS">AWS</option>
                     <option value="CISCO">Cisco</option>
                     <option value="CUSTOM">自定义</option>
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   {Object.entries(NODE_TYPE_LABELS).map(([type, label]) => {
                      const url = getIconUrl(iconLibVendor, type as NodeType);
                      return (
                        <div 
                          key={type}
                          draggable={!!url}
                          onDragStart={(e) => onDragStartNode(e, type as NodeType)}
                          className={`flex flex-col items-center justify-center p-3 border rounded-lg bg-gray-50 transition-all relative group
                             ${url ? 'cursor-move hover:border-brand-500 hover:shadow-sm' : 'border-dashed border-red-200'}`}
                        >
                          {url ? (
                             <img src={url} alt={type} className="w-8 h-8 mb-2 object-contain" />
                          ) : (
                             <div className="w-8 h-8 mb-2 flex items-center justify-center text-red-400">
                               <AlertCircle size={20} />
                             </div>
                          )}
                          <span className="text-[10px] text-gray-600 text-center leading-tight">{label.split(' ')[0]}</span>
                          
                          <div className={`absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                             <button onClick={() => triggerUpload(type as NodeType)} className="text-white bg-white/20 p-1.5 rounded-full hover:bg-white/40" title="上传/更换图标">
                                <Upload size={14} />
                             </button>
                          </div>
                        </div>
                      );
                   })}
                </div>
             </div>
             
             <hr className="border-gray-100" />

             <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">线路样式库 (点击选中)</h3>
                <div className="space-y-2">
                   {Object.entries(PLANE_CONFIG).map(([key, config]) => (
                      <div 
                        key={key}
                        onClick={() => onSelectLineStyle(key === activeLineStyle ? null : key as NetworkPlane)}
                        className={`flex items-center gap-3 p-2 border rounded cursor-pointer transition-all ${activeLineStyle === key ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                      >
                         <div className={`w-6 flex items-center justify-center ${activeLineStyle === key ? 'text-brand-600' : 'text-gray-400'}`}>
                           {activeLineStyle === key ? <MousePointer2 size={16}/> : <Cable size={16}/>}
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-center">
                                <span className={`text-xs font-medium block ${activeLineStyle === key ? 'text-brand-700' : 'text-gray-700'}`}>{config.label}</span>
                                <span className="text-[10px] font-mono text-gray-400">{config.speed}</span>
                            </div>
                            <div className="w-full h-0 border-b mt-1" style={{ borderColor: config.color, borderStyle: config.style === 'dashed' ? 'dashed' : 'solid', borderWidth: config.width }}></div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </section>
        )}
      </div>

      <div className="p-5 border-t border-gray-200 bg-gray-50 flex flex-col gap-3">
        {activeTab === 'config' && (
          <button onClick={onGenerate} className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-3 px-4 rounded-lg font-semibold shadow-sm transition-all active:scale-[0.98]">
            <Play size={18} /> 生成拓扑
          </button>
        )}
        <div className="grid grid-cols-3 gap-2">
            <button onClick={onExport} className="col-span-1 flex flex-col items-center justify-center gap-1 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 py-2 rounded-lg text-xs" title="导出 JSON">
              <FileDown size={14} /> 导出
            </button>
            <button onClick={() => importInputRef.current?.click()} className="col-span-1 flex flex-col items-center justify-center gap-1 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 py-2 rounded-lg text-xs" title="导入 JSON">
              <FileUp size={14} /> 导入
            </button>
            <button onClick={onClear} className="col-span-1 flex flex-col items-center justify-center gap-1 bg-white border border-gray-300 text-red-500 hover:bg-red-50 py-2 rounded-lg text-xs" title="清空画布">
              <Trash2 size={14} /> 清空
            </button>
        </div>
        <button className="w-full flex items-center justify-center gap-1 bg-white border border-brand-200 text-brand-600 hover:bg-brand-50 py-2 rounded-lg text-xs font-medium" title="导出 BOM" onClick={() => alert("BOM 导出功能将在 v5.1 版本提供 csv 下载，当前请使用截图。")}>
            <Box size={14} /> 导出 BOM 清单
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;