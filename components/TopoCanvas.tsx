import React, { useEffect, useRef, useState } from 'react';
import { Graph, Shape } from '@antv/x6';
// @ts-ignore
import { DagreLayout } from '@antv/layout'; 
import { GeneratedTopology, ProjectConfig, NodeType, NetworkPlane, ContextMenuState } from '../types';
import { PLANE_CONFIG, INITIAL_ICONS } from '../constants';
import { ZoomIn, ZoomOut, Maximize, MousePointer2, Layout, Trash2, Copy, Clipboard, Monitor, Scan, Cable } from 'lucide-react';

interface TopoCanvasProps {
  data: GeneratedTopology | null;
  config: ProjectConfig;
  customIcons: Record<string, string>;
  activeLineStyle: NetworkPlane | null;
  onDropNode: (x: number, y: number, type: NodeType, iconUrl: string) => void;
  onSelectLineStyle: (plane: NetworkPlane | null) => void;
}

const TopoCanvas: React.FC<TopoCanvasProps> = ({ data, config, customIcons, activeLineStyle, onDropNode, onSelectLineStyle }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
  const [copiedCell, setCopiedCell] = useState<any>(null);
  
  // Wiring State
  const wiringSourceRef = useRef<string | null>(null);

  const getIcon = (type: NodeType) => {
    const customKey = `${config.vendorId}_${type}`;
    return customIcons[customKey] || INITIAL_ICONS[config.vendorId]?.[type] || INITIAL_ICONS['HUAWEI_CLOUD'][type];
  };

  // 1. Initialize Graph
  useEffect(() => {
    if (!containerRef.current) return;

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      background: { color: '#f8fafc' },
      grid: { size: 20, visible: true, type: 'mesh', args: [ { color: '#e2e8f0', thickness: 1 }, { color: '#cbd5e1', thickness: 1, factor: 4 } ] },
      // Enable panning on blank areas by default
      panning: { enabled: true, eventTypes: ['leftMouseDown'] },
      mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
      selecting: { enabled: true, showNodeSelectionBox: true, rubberband: true },
      connecting: {
        snap: true,
        allowBlank: false,
        allowLoop: false,
        highlight: true,
        connector: 'rounded',
        connectionPoint: 'boundary',
        // Reduce offset to fix white gaps
        router: { name: 'er', args: { offset: 12, direction: 'V' } }, 
        createEdge() {
          return new Shape.Edge({
            zIndex: 10, 
            attrs: {
              line: {
                stroke: '#3b82f6',
                strokeWidth: 2,
                targetMarker: { name: 'block', width: 8, height: 8 },
              },
            },
          });
        },
      },
    });

    graph.on('scale', ({ sx }) => setZoomLevel(Math.round(sx * 100)));
    
    // Wiring Interaction: Click Node A -> Click Node B
    graph.on('node:click', ({ cell }) => {
       if (wiringSourceRef.current) {
          // Finish connection
          const sourceId = wiringSourceRef.current;
          const targetId = cell.id;
          
          if (sourceId === targetId) return; // Ignore self

          // Create edge
          const plane = activeLineStyle || 'business'; // Default if somehow null
          const planeConfig = PLANE_CONFIG[plane];
          
          graph.addEdge({
              source: sourceId,
              target: targetId,
              zIndex: 10,
              router: { name: 'er', args: { offset: 12, direction: 'V' } },
              attrs: {
                  line: {
                      stroke: planeConfig.color,
                      strokeWidth: planeConfig.width,
                      strokeDasharray: planeConfig.style === 'dashed' ? '5 5' : undefined,
                      targetMarker: { name: 'block', width: 6, height: 6 }
                  }
              }
          });

          // Reset wiring state
          wiringSourceRef.current = null;
          // Clean highlights
          const sourceCell = graph.getCellById(sourceId);
          if (sourceCell) sourceCell.setAttrs({ body: { stroke: null, strokeWidth: null } }); 
          
       } else if (activeLineStyle) {
          // Start connection
          wiringSourceRef.current = cell.id;
          // Visual feedback
          cell.setAttrs({ body: { stroke: '#3b82f6', strokeWidth: 3 } }); // Assuming shape has body, for image nodes it might need padding or different feedback
       }
    });

    // Reset wiring if clicked on blank
    graph.on('blank:click', () => {
        if (wiringSourceRef.current) {
             const sourceCell = graph.getCellById(wiringSourceRef.current);
             // Since image nodes don't strictly have a 'body' attr in standard X6 image shape, this highlight might fail silently or need custom shape. 
             // We'll ignore the highlight removal for simplicity or if using standard shapes.
             wiringSourceRef.current = null;
        }
        setContextMenu({ visible: false, x: 0, y: 0 });
    });


    // Context Menu Logic
    graph.on('cell:contextmenu', ({ e, cell }) => {
       e.preventDefault();
       setContextMenu({ visible: true, x: e.clientX, y: e.clientY, targetId: cell.id, type: cell.isNode() ? 'node' : 'edge' });
    });
    graph.on('blank:contextmenu', ({ e }) => {
       e.preventDefault();
       setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type: 'canvas' });
    });

    // Double Click to Edit Label
    graph.on('node:dblclick', ({ cell }) => {
        const currentLabel = cell.getAttrByPath('text/text') || cell.getLabel(); 
        const newLabel = prompt("编辑名称:", currentLabel as string);
        if (newLabel !== null) {
             cell.setAttrByPath('text/text', newLabel);
        }
    });

    graphRef.current = graph;
    return () => { graph.dispose(); };
  }, [activeLineStyle]); // Re-bind if activeLineStyle changes to capture current state in closure? No, using Ref for wiring state.

  // Sync wiring ref with prop for safety (though logic uses the prop in event loop)
  // Actually, the event closure captures the scope. 
  // We need to use a Ref to track activeLineStyle inside the event listener if we don't re-bind.
  const activeLineStyleRef = useRef(activeLineStyle);
  useEffect(() => { activeLineStyleRef.current = activeLineStyle; }, [activeLineStyle]);
  
  // Re-implement the click handler to use the Ref, otherwise it uses stale state
  useEffect(() => {
      if(!graphRef.current) return;
      graphRef.current.off('node:click');
      graphRef.current.on('node:click', ({ cell }) => {
        const style = activeLineStyleRef.current;
        if (wiringSourceRef.current) {
           const sourceId = wiringSourceRef.current;
           const targetId = cell.id;
           if (sourceId !== targetId && style) {
             const planeConfig = PLANE_CONFIG[style];
             graphRef.current?.addEdge({
                 source: sourceId,
                 target: targetId,
                 zIndex: 10,
                 router: { name: 'er', args: { offset: 12, direction: 'V' } },
                 attrs: {
                     line: {
                         stroke: planeConfig.color,
                         strokeWidth: planeConfig.width,
                         strokeDasharray: planeConfig.style === 'dashed' ? '5 5' : undefined,
                         targetMarker: { name: 'block', width: 6, height: 6 }
                     }
                 }
             });
           }
           wiringSourceRef.current = null;
        } else if (style) {
           wiringSourceRef.current = cell.id;
        }
     });
  }, [activeLineStyle]); // Re-bind on style change

  // 2. Render Data
  useEffect(() => {
    if (!graphRef.current) return;
    const graph = graphRef.current;
    
    graph.clearCells();

    if (!data || (data.nodes.length === 0 && data.groups.length === 0)) return;

    // Groups (Z-Index 0)
    data.groups.forEach(group => {
      graph.addNode({
        id: group.id,
        x: group.x,
        y: group.y,
        width: group.width,
        height: group.height,
        zIndex: 0,
        shape: 'rect', 
        label: group.label,
        attrs: {
          body: { fill: '#f1f5f9', stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5', rx: 8, ry: 8 },
          text: { 
             fontSize: 12, 
             fill: '#64748b', 
             refX: 10, 
             refY: 10, 
             textAnchor: 'start',
             textVerticalAnchor: 'top'
          }
        }
      });
    });

    // Nodes (Z-Index 20)
    data.nodes.forEach(node => {
      const iconUrl = getIcon(node.type);
      graph.addNode({
        id: node.id,
        x: node.x,
        y: node.y,
        width: 60,
        height: 60,
        zIndex: 20,
        shape: 'image',
        imageUrl: iconUrl,
        label: node.label,
        attrs: {
          label: { fontSize: 11, fill: '#334155', refY: 70 },
          image: { title: `IP: ${node.ip || 'N/A'}`, cursor: 'move' } 
        }
      });
    });

    // Edges (Z-Index 10)
    data.edges.forEach(edge => {
      const plane = PLANE_CONFIG[edge.plane];
      const isStack = edge.plane === 'stack';
      const routerConfig = isStack 
         ? { name: 'normal' } 
         : { name: 'er', args: { offset: 12, direction: 'V', minVisibleLength: 20 } };

      graph.addEdge({
        source: edge.source,
        target: edge.target,
        zIndex: 10,
        router: routerConfig,
        attrs: {
          line: {
            stroke: plane.color,
            strokeWidth: plane.width,
            strokeDasharray: plane.style === 'dashed' ? '5 5' : undefined,
            targetMarker: { name: 'block', width: 6, height: 6 }
          }
        },
        labels: [
          {
            attrs: { text: { text: edge.speed || '', fontSize: 9, fill: plane.color, stroke: '#fff', strokeWidth: 2 } },
            position: 0.5
          }
        ]
      });
    });

    graph.zoomToFit({ padding: 40, maxScale: 1 });

  }, [data, config.vendorId, customIcons]);

  // 3. Drop Handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!graphRef.current || !containerRef.current) return;

    try {
        const json = e.dataTransfer.getData('application/json');
        const item = JSON.parse(json);
        
        if (item.category === 'node') {
            const p = graphRef.current.clientToLocal({ x: e.clientX, y: e.clientY });
            onDropNode(p.x, p.y, item.type, item.iconUrl);
        } else if (item.category === 'line') {
             // Drag line logic usually just sets active style in App
             // handled by dragging from control panel
        }
    } catch (err) {
        console.error("Invalid drop data", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  // Actions
  const handleZoomIn = () => graphRef.current?.zoom(0.1);
  const handleZoomOut = () => graphRef.current?.zoom(-0.1);
  const handleFit = () => graphRef.current?.zoomToFit({ padding: 40, maxScale: 1 });
  const handleCenter = () => graphRef.current?.centerContent();
  const handleFullscreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen();
      } else {
          document.exitFullscreen();
      }
  };
  
  const handleAutoLayout = () => {
      if(!graphRef.current) return;
      const model = graphRef.current.toJSON();
      const dagreLayout = new DagreLayout({
        type: 'dagre',
        rankdir: 'TB',
        align: 'DL',
        nodesep: 60,
        ranksep: 80,
      });
      const newModel = dagreLayout.layout(model);
      graphRef.current.fromJSON(newModel);
      // Wait a tick for rendering then zoom
      setTimeout(() => {
        graphRef.current?.zoomToFit({ padding: 40 });
        graphRef.current?.centerContent();
      }, 50);
  };

  const handleContextMenuAction = (action: 'delete' | 'copy' | 'paste' | 'rename' | 'connect') => {
      if (!graphRef.current) return;
      const { targetId } = contextMenu;

      if (action === 'delete' && targetId) graphRef.current.removeCell(targetId);
      if (action === 'copy' && targetId) {
          const cell = graphRef.current.getCellById(targetId);
          if (cell) setCopiedCell(cell.toJSON());
      }
      if (action === 'paste' && copiedCell) {
           const p = graphRef.current.clientToLocal({ x: contextMenu.x, y: contextMenu.y });
           const newCell = { ...copiedCell, id: `paste-${Date.now()}`, position: { x: p.x, y: p.y }, z: 20 };
           if (newCell.shape === 'edge') return; 
           graphRef.current.addNode(newCell);
      }
      if (action === 'rename' && targetId) {
           const cell = graphRef.current.getCellById(targetId);
           if(cell) {
               const current = cell.getAttrByPath('text/text') || cell.getLabel();
               const val = prompt("重命名:", current as string);
               if(val) cell.setAttrByPath('text/text', val);
           }
      }
      setContextMenu({ ...contextMenu, visible: false });
  };

  return (
    <div 
        className="flex-1 relative h-full w-full overflow-hidden group bg-slate-50"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => setContextMenu({ ...contextMenu, visible: false })}
    >
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Zoom Toolbar - Top Right */}
      <div className="absolute top-6 right-6 flex items-center gap-1 bg-white shadow-md border border-gray-200 rounded-lg p-1.5 z-20">
          <button onClick={handleFullscreen} className="p-2 hover:bg-gray-100 rounded text-gray-600" title="预览/全屏"><Monitor size={18}/></button>
          <div className="w-px h-5 bg-gray-200 mx-1"></div>
          <button onClick={handleCenter} className="p-2 hover:bg-gray-100 rounded text-gray-600" title="居中显示"><Scan size={18}/></button>
          <button onClick={handleFit} className="p-2 hover:bg-gray-100 rounded text-gray-600" title="适配屏幕"><Maximize size={18}/></button>
          <button onClick={handleAutoLayout} className="p-2 hover:bg-gray-100 rounded text-gray-600" title="一键自动排版"><Layout size={18}/></button>
          <div className="w-px h-5 bg-gray-200 mx-1"></div>
          <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded text-gray-600" title="缩小"><ZoomOut size={18}/></button>
          <span className="text-xs font-mono w-10 text-center text-gray-700 select-none">{zoomLevel}%</span>
          <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded text-gray-600" title="放大"><ZoomIn size={18}/></button>
      </div>

      {/* Active Line Style Indicator - Click to cancel */}
      {activeLineStyle && (
         <div 
           className="absolute top-20 right-6 bg-brand-50 border border-brand-200 text-brand-700 px-4 py-2 rounded-lg text-sm shadow-sm flex flex-col items-center gap-1 z-20 animate-fade-in cursor-pointer hover:bg-brand-100"
           onClick={() => onSelectLineStyle(null)}
         >
             <div className="flex items-center gap-2">
                 <Cable size={16} />
                 <span className="font-bold">连线模式中</span>
             </div>
             <div className="text-xs opacity-75">{PLANE_CONFIG[activeLineStyle].label}</div>
             <div className="text-[10px] text-brand-500 mt-1">依次点击两个节点连接 | 点击此处退出</div>
         </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
          <div 
            className="fixed bg-white shadow-xl border border-gray-200 rounded-lg py-1 z-50 w-32"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
              {contextMenu.type !== 'canvas' && (
                  <>
                    <button onClick={() => handleContextMenuAction('rename')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2 text-gray-700">
                        <MousePointer2 size={12} /> 重命名
                    </button>
                    <button onClick={() => handleContextMenuAction('copy')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2 text-gray-700">
                        <Copy size={12} /> 复制
                    </button>
                    <button onClick={() => handleContextMenuAction('delete')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2 text-red-600">
                        <Trash2 size={12} /> 删除
                    </button>
                  </>
              )}
              {contextMenu.type === 'canvas' && (
                  <button onClick={() => handleContextMenuAction('paste')} disabled={!copiedCell} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2 text-gray-700">
                      <Clipboard size={12} /> 粘贴
                  </button>
              )}
          </div>
      )}
    </div>
  );
};

export default TopoCanvas;