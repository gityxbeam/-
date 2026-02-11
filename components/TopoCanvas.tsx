import React, { useEffect, useRef, useState } from 'react';
import { Graph, Shape } from '@antv/x6';
// @ts-ignore
import { Snapline } from '@antv/x6-plugin-snapline';
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

  const getIcon = (type: NodeType) => {
    const customKey = `${config.vendorId}_${type}`;
    return customIcons[customKey] || INITIAL_ICONS[config.vendorId]?.[type] || INITIAL_ICONS['HUAWEI_CLOUD'][type];
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      background: { color: '#0f172a' },
      grid: { size: 20, visible: true, type: 'mesh', args: [ { color: '#1e293b', thickness: 1 }, { color: '#334155', thickness: 1, factor: 4 } ] },
      // Requirement 8: Box selection enabled by default, panning with Ctrl
      panning: { enabled: true, modifiers: 'ctrl', eventTypes: ['leftMouseDown'] }, 
      mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
      selecting: { 
          enabled: true, 
          rubberband: true, 
          showNodeSelectionBox: true,
          modifiers: null 
      },
      connecting: {
        snap: { radius: 20 },
        allowBlank: false,
        allowLoop: false,
        allowNode: false,
        allowPort: true,
        highlight: true,
        connector: 'rounded',
        connectionPoint: 'anchor',
        anchor: 'center',
        router: { 
            name: 'manhattan', 
            args: { 
                padding: 40, // Increased padding to prevent line overlap
                step: 10,
            } 
        }, 
        createEdge() {
          return new Shape.Edge({
            zIndex: 10, 
            attrs: {
              line: {
                stroke: '#3b82f6',
                strokeWidth: 2,
                targetMarker: { name: 'block', width: 4, height: 4 },
              },
            },
          });
        },
      },
    });

    graph.use(new Snapline({ enabled: true, sharp: true, tolerance: 10, clean: true }));
    graph.on('scale', ({ sx }) => setZoomLevel(Math.round(sx * 100)));
    
    graph.on('blank:click', () => setContextMenu({ visible: false, x: 0, y: 0 }));

    graph.on('cell:contextmenu', ({ e, cell }) => {
       e.preventDefault();
       setContextMenu({ visible: true, x: e.clientX, y: e.clientY, targetId: cell.id, type: cell.isNode() ? 'node' : 'edge' });
    });
    graph.on('blank:contextmenu', ({ e }) => {
       e.preventDefault();
       setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type: 'canvas' });
    });

    graph.on('node:dblclick', ({ cell }) => {
        const currentLabel = cell.getAttrByPath('text/text') || cell.getLabel(); 
        const newLabel = prompt("编辑名称:", currentLabel as string);
        if (newLabel !== null) cell.setAttrByPath('text/text', newLabel);
    });

    graphRef.current = graph;
    return () => { graph.dispose(); };
  }, []);

  useEffect(() => {
    if (!graphRef.current) return;
    const graph = graphRef.current;
    
    graph.clearCells();

    // Requirement 9: Handle empty data for Clear functionality
    if (!data || (data.nodes.length === 0 && data.groups.length === 0)) return;

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
          body: { fill: '#1e293b', stroke: '#475569', strokeWidth: 1, strokeDasharray: '5 5', rx: 8, ry: 8 },
          text: { fontSize: 12, fill: '#94a3b8', refX: 10, refY: 10, textAnchor: 'start', textVerticalAnchor: 'top' }
        }
      });
    });

    data.nodes.forEach(node => {
      const iconUrl = getIcon(node.type);
      
      let badges: any[] = [];
      if (node.isStack) {
          badges.push({ tagName: 'rect', selector: 'stackShadow', attrs: { width: 80, height: 60, x: 5, y: -5, fill: '#334155', rx: 8, ry: 8, zIndex: -1 } });
          badges.push({ tagName: 'rect', selector: 'badge', attrs: { width: 24, height: 16, x: 56, y: -8, fill: '#ef4444', rx: 8, ry: 8 } });
          badges.push({ tagName: 'text', selector: 'badgeText', textContent: `x${node.stackCount}`, attrs: { x: 68, y: 0, fontSize: 10, fill: '#fff', textAnchor: 'middle', textVerticalAnchor: 'middle', pointerEvents: 'none' } });
      }
      if (node.isReuse) {
           badges.push({ tagName: 'rect', selector: 'reuseBadge', attrs: { width: 30, height: 16, x: -10, y: -10, fill: '#f97316', rx: 4, ry: 4 } });
           badges.push({ tagName: 'text', selector: 'reuseText', textContent: 'M+C', attrs: { x: 5, y: -2, fontSize: 10, fill: '#fff', textAnchor: 'middle', textVerticalAnchor: 'middle', pointerEvents: 'none' } });
      }

      // Requirement 2: Visual Bonds (Pills)
      // We calculate the pill position based on port indices. 
      // X6 'top' layout distributes ports evenly: (index + 0.5) * (width / count)
      const nodeWidth = 100; // Wider node
      const topPorts = node.ports?.filter(p => p.group === 'top') || [];
      const bottomPorts = node.ports?.filter(p => p.group === 'bottom') || [];

      if (node.bonds) {
          node.bonds.forEach(bond => {
              // Find indices of bonded ports in the Top group
              const indices = bond.ports.map(pid => topPorts.findIndex(p => p.id === pid)).filter(i => i !== -1);
              if (indices.length > 0) {
                  const minIdx = Math.min(...indices);
                  const maxIdx = Math.max(...indices);
                  const count = topPorts.length;
                  
                  // Calculate geometry relative to node width
                  const unitW = nodeWidth / count;
                  const x1 = (minIdx + 0.5) * unitW;
                  const x2 = (maxIdx + 0.5) * unitW;
                  const w = x2 - x1 + 16; // 16px padding
                  const x = x1 - 8;
                  const y = -8; // Slightly above the node body

                  badges.push({
                      tagName: 'rect',
                      selector: `bond-${bond.id}`,
                      attrs: {
                          width: w, height: 16, x: x, y: y, rx: 8, ry: 8,
                          fill: bond.color, opacity: 0.2, stroke: bond.color, strokeWidth: 1
                      }
                  });
              }
          });
      }

      const x6Ports = {
          groups: {
              top: { 
                  position: 'top', 
                  attrs: { circle: { r: 5, magnet: true, stroke: '#1e293b', strokeWidth: 2, fill: '#0f172a' } },
                  label: { position: { name: 'top', args: { y: -6 } } } 
              },
              bottom: { 
                  position: 'bottom', 
                  attrs: { circle: { r: 5, magnet: true, stroke: '#1e293b', strokeWidth: 2, fill: '#0f172a' } },
                  label: { position: { name: 'bottom', args: { y: 6 } } } 
              },
              left: { position: 'left', attrs: { circle: { r: 4, magnet: true } }, label: { position: 'left' } },
              right: { position: 'right', attrs: { circle: { r: 4, magnet: true } }, label: { position: 'right' } },
          },
          items: node.ports?.map(p => ({
              id: p.id,
              group: p.group,
              attrs: {
                  circle: { stroke: p.color }, 
                  text: { text: p.label, fill: p.color, fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }
              }
          })) || []
      };

      const n = graph.addNode({
        id: node.id,
        x: node.x,
        y: node.y,
        width: nodeWidth, 
        height: 60,
        zIndex: 20,
        shape: 'image', 
        imageUrl: iconUrl,
        label: node.label,
        ports: x6Ports,
        attrs: {
          label: { fontSize: 11, fill: '#94a3b8', refY: 70 },
          image: { cursor: 'move', refX: 25, refY: 5, width: 50, height: 50 }, // Centered
          body: { 
             refWidth: '100%', refHeight: '100%', fill: '#1e293b', 
             stroke: node.isReuse ? '#f97316' : 'transparent', 
             strokeWidth: node.isReuse ? 2 : 0, 
             rx: 8, ry: 8, strokeDasharray: node.isReuse ? '4 2' : undefined 
          }
        },
        markup: [
            ...badges.filter(b => b.selector.startsWith('bond') || b.selector === 'stackShadow'),
            { tagName: 'rect', selector: 'body' }, 
            { tagName: 'image', selector: 'image' },
            { tagName: 'text', selector: 'label' },
            ...badges.filter(b => !b.selector.startsWith('bond') && b.selector !== 'stackShadow')
        ]
      });
      
      if (node.subLabel) n.attr('text/text', `${node.label}\n${node.subLabel}`);
    });

    data.edges.forEach(edge => {
      const plane = PLANE_CONFIG[edge.plane];
      
      // Requirement 3: Better routing
      let routerConfig: any = { name: 'manhattan', args: { padding: 40, step: 10 } };
      let connectorConfig: any = { name: 'rounded' };

      if (edge.plane === 'stack' || edge.plane === 'mlag') {
          routerConfig = { name: 'normal' };
      }

      graph.addEdge({
        source: { cell: edge.source, port: edge.sourcePort },
        target: { cell: edge.target, port: edge.targetPort },
        zIndex: 10,
        router: routerConfig,
        connector: connectorConfig,
        attrs: {
          line: {
            stroke: plane.color,
            strokeWidth: plane.width,
            strokeDasharray: plane.style === 'dashed' ? '5 5' : undefined,
            targetMarker: { name: 'block', width: 4, height: 4 }
          }
        }
      });
    });

    graph.zoomToFit({ padding: 40, maxScale: 1 });

  }, [data, config.vendorId, customIcons]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!graphRef.current || !containerRef.current) return;
    try {
        const json = e.dataTransfer.getData('application/json');
        const item = JSON.parse(json);
        if (item.category === 'node') {
            const p = graphRef.current.clientToLocal({ x: e.clientX, y: e.clientY });
            onDropNode(p.x, p.y, item.type, item.iconUrl);
        }
    } catch (err) { console.error(err); }
  };
  
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleZoomIn = () => graphRef.current?.zoom(0.1);
  const handleZoomOut = () => graphRef.current?.zoom(-0.1);
  
  // Requirement 10: True zoom to fit
  const handleFit = () => graphRef.current?.zoomToFit({ padding: 40, maxScale: 1 });
  const handleCenter = () => graphRef.current?.centerContent();
  const handleFullscreen = () => { if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); };
  
  // This is technically re-layout, but if the user wants just centering, they should use 'Fit'
  const handleAutoLayout = () => handleFit(); 

  const handleContextMenuAction = (action: 'delete' | 'copy' | 'paste' | 'rename') => {
      if (!graphRef.current) return;
      const { targetId } = contextMenu;
      if (action === 'delete' && targetId) graphRef.current.removeCell(targetId);
      if (action === 'copy' && targetId) { const cell = graphRef.current.getCellById(targetId); if (cell) setCopiedCell(cell.toJSON()); }
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
        className="flex-1 relative h-full w-full overflow-hidden group bg-slate-900"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => setContextMenu({ ...contextMenu, visible: false })}
    >
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Zoom Toolbar */}
      <div className="absolute top-6 right-6 flex items-center gap-1 bg-slate-800 shadow-md border border-slate-700 rounded-lg p-1.5 z-20">
          <button onClick={handleFullscreen} className="p-2 hover:bg-slate-700 rounded text-slate-400" title="预览/全屏"><Monitor size={18}/></button>
          <div className="w-px h-5 bg-slate-700 mx-1"></div>
          <button onClick={handleCenter} className="p-2 hover:bg-slate-700 rounded text-slate-400" title="居中显示"><Scan size={18}/></button>
          {/* Requirement 10: Fixed the confusing layout button */}
          <button onClick={handleFit} className="p-2 hover:bg-slate-700 rounded text-slate-400" title="适配画布 (Fit)"><Maximize size={18}/></button>
          <div className="w-px h-5 bg-slate-700 mx-1"></div>
          <button onClick={handleZoomOut} className="p-2 hover:bg-slate-700 rounded text-slate-400" title="缩小"><ZoomOut size={18}/></button>
          <span className="text-xs font-mono w-10 text-center text-slate-500 select-none">{zoomLevel}%</span>
          <button onClick={handleZoomIn} className="p-2 hover:bg-slate-700 rounded text-slate-400" title="放大"><ZoomIn size={18}/></button>
      </div>

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