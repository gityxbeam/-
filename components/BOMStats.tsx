import React, { useState } from 'react';
import { GeneratedTopology, ProjectConfig, BOMItem } from '../types';
import { Calculator, GripHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { PLANE_CONFIG } from '../constants';

interface BOMStatsProps {
  data: GeneratedTopology | null;
  config: ProjectConfig;
  visible: boolean;
}

const BOMStats: React.FC<BOMStatsProps> = ({ data, config, visible }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: window.innerHeight - 400 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = React.useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  React.useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isDragging) {
        setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      }
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  // Early return must be AFTER all hooks
  if (!visible || !data) return null;

  // Calculate Stats
  const items: BOMItem[] = [];

  // 1. Devices
  const switches = data.nodes.filter(n => n.type === 'switch').length;
  items.push({ category: '网络设备', name: '以太网交换机', count: switches, unit: '台' });

  // Handle Logic for Stack/Nodes count
  let serverCount = 0;
  data.nodes.forEach(n => {
     if (['compute', 'storage', 'management'].includes(n.type)) {
         if (n.isStack && n.stackCount) serverCount += n.stackCount;
         else serverCount += 1;
     }
  });
  items.push({ category: 'IT基础设施', name: 'x86服务器', count: serverCount, unit: '台' });

  // 2. Cables & Modules
  // Heuristic: Each edge = 1 Cable + 2 Modules (one at each end)
  // Stack links = DAC usually. Long distance = Optical.
  // Simplified logic for this demo:
  let opticalModules = 0;
  let rj45Cables = 0;
  let dacCables = 0;
  let fiberCables = 0;

  data.edges.forEach(e => {
      const plane = e.plane;
      // IPMI / Mgmt (1GE) usually RJ45
      if (plane === 'ipmi' || (plane === 'management' && config.network.deploymentMode === 'Physically_Separated')) {
          rj45Cables += 1;
      } else if (plane === 'stack' || plane === 'mlag') {
          dacCables += 1; // Short distance
          opticalModules += 2;
      } else {
          // Business/Storage 10/25GE
          fiberCables += 1;
          opticalModules += 2;
      }
  });

  if (opticalModules > 0) items.push({ category: '配件', name: '光模块 (SFP+/25G/QSFP)', count: opticalModules, unit: '个' });
  if (fiberCables > 0) items.push({ category: '线缆', name: '光纤跳线 (LC-LC)', count: fiberCables, unit: '根' });
  if (rj45Cables > 0) items.push({ category: '线缆', name: 'CAT6 网线', count: rj45Cables, unit: '根' });
  if (dacCables > 0) items.push({ category: '线缆', name: 'DAC 高速线缆', count: dacCables, unit: '根' });


  return (
    <div 
      className="absolute z-30 bg-white shadow-xl border border-gray-200 rounded-lg w-64 overflow-hidden flex flex-col transition-shadow"
      style={{ left: pos.x, top: pos.y }}
    >
        <div 
           className="bg-brand-50 px-3 py-2 border-b border-brand-100 flex items-center justify-between cursor-move select-none"
           onMouseDown={handleMouseDown}
        >
            <div className="flex items-center gap-2 text-brand-700 font-bold text-xs uppercase">
                <Calculator size={14} />
                <span>BOM 物料清单</span>
            </div>
            <div className="flex items-center gap-1">
                 <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-brand-400 hover:text-brand-600">
                    {isCollapsed ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                 </button>
                 <GripHorizontal size={14} className="text-brand-300" />
            </div>
        </div>

        {!isCollapsed && (
            <div className="bg-white max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-3 py-2">物品名称</th>
                            <th className="px-3 py-2 text-right">数量</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-700">
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-[10px] text-gray-400">{item.category}</div>
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-gray-800">
                                    {item.count} <span className="text-[10px] font-normal text-gray-400">{item.unit}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-100">
                        <tr>
                           <td colSpan={2} className="px-3 py-1.5 text-[10px] text-gray-400 text-center">
                               * 估算数据，仅供参考
                           </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        )}
    </div>
  );
};

export default BOMStats;