import { ProjectConfig, GeneratedTopology, NodeConfig, EdgeConfig, NetworkPlane, SwitchRedundancy, PortConfig, NodeType, BondConfig } from '../types';
import { STYLES, PLANE_CONFIG, NODE_TYPE_LABELS } from '../constants';

export const generateTopology = (config: ProjectConfig): GeneratedTopology => {
  const nodes: NodeConfig[] = [];
  const edges: EdgeConfig[] = [];
  const groups: GeneratedTopology['groups'] = [];

  const startX = 100;
  const startY = 80;
  const colGap = 260; // Increased horizontal gap to prevent overlap
  
  // Helper: Port naming
  const getSwPortLabel = (speed: string, slot: number, portIdx: number) => `${speed}${slot}/0/${portIdx + 1}`;

  // Helper: Add Port
  const addPortToNode = (node: NodeConfig, id: string, group: 'top' | 'bottom' | 'left' | 'right', label: string, color: string) => {
      if (!node.ports) node.ports = [];
      if (!node.ports.find(p => p.id === id)) {
          node.ports.push({ id, group, label, color });
      }
  };

  // Helper: Register Bond (Visual Pill)
  const addBondToNode = (node: NodeConfig, plane: NetworkPlane, portIds: string[], color: string) => {
      if (!node.bonds) node.bonds = [];
      // Only add if not already present
      if (!node.bonds.find(b => b.id === `bond-${node.id}-${plane}`)) {
          node.bonds.push({
              id: `bond-${node.id}-${plane}`,
              plane,
              ports: portIds,
              color
          });
      }
  };

  // --- 0. Removed Core Router Generation (Requirement 1) ---

  // Helper: Create Switch Group
  const createSwitchGroup = (
    labelPrefix: string,
    role: 'Core' | 'Mgmt' | 'Bus' | 'Stor' | 'Backup' | 'IPMI',
    redundancy: SwitchRedundancy,
    yPos: number,
    xOffset: number,
    ipBase: string,
    groupTitle: string
  ): string[] => {
    const swIds: string[] = [];
    
    // Increased switch width for better port spacing (Requirement 2)
    const switchWidth = 160; 
    const switchGap = 180; 
    const groupPadding = 40;
    
    const isRedundant = redundancy === 'Redundant';
    const contentWidth = isRedundant ? (switchWidth * 2 + switchGap) : switchWidth;
    const groupWidth = contentWidth + (groupPadding * 2);
    const groupX = startX + xOffset;
    
    const groupId = `grp-sw-${role.toLowerCase()}`;
    groups.push({
        id: groupId,
        label: groupTitle,
        x: groupX,
        y: yPos - 60,
        width: groupWidth,
        height: 180
    });

    const innerStartX = groupX + groupPadding;
    const id1 = `sw-${role.toLowerCase()}-01`;
    swIds.push(id1);
    
    const id2 = isRedundant ? `sw-${role.toLowerCase()}-02` : '';
    if (isRedundant) swIds.push(id2);

    const sw1: NodeConfig = {
      id: id1, type: 'switch', label: `${labelPrefix}-SW-01`, ip: `${ipBase}.1`,
      x: innerStartX, y: yPos, groupId: groupId, ports: [], bonds: []
    };

    const sw2: NodeConfig = isRedundant ? {
      id: id2, type: 'switch', label: `${labelPrefix}-SW-02`, ip: `${ipBase}.2`,
      x: innerStartX + switchWidth + switchGap, y: yPos, groupId: groupId, ports: [], bonds: []
    } : { id: 'temp', type: 'switch', label: '', x:0, y:0 }; 

    // Inter-Switch Links
    if (isRedundant) {
      const linkType = (role === 'Bus' || role === 'Stor') ? 'mlag' : 'stack';
      const pCfg = PLANE_CONFIG[linkType];
      const pA = `${id1}-stack`;
      const pB = `${id2}-stack`;
      
      addPortToNode(sw1, pA, 'right', 'Peer', pCfg.color);
      addPortToNode(sw2, pB, 'left', 'Peer', pCfg.color);

      edges.push({
        source: id1, target: id2, plane: linkType,
        sourcePort: pA, targetPort: pB, speed: pCfg.speed
      });
    }

    nodes.push(sw1);
    if (isRedundant) nodes.push(sw2);

    return swIds;
  };

  // --- 1. Generate Switches ---
  const swMap: Record<string, string[]> = { management: [], business: [], storage: [], backup: [], ipmi: [] };
  let currentY = startY;

  if (config.network.enableIpmi) {
    swMap.ipmi = createSwitchGroup('IPMI', 'IPMI', 'Single', startY, -300, '192.168.9', '带外管理区');
  }

  if (config.network.deploymentMode === 'Converged') {
    const coreSw = createSwitchGroup('Core', 'Core', config.network.coreRedundancy, currentY, colGap * 2, '192.168.1', '核心交换区');
    swMap.management = coreSw; swMap.business = coreSw; swMap.storage = coreSw; swMap.backup = coreSw;
    currentY += 280; 
  } else {
    let sx = 0;
    // Increased offsets for cleaner layout
    if (config.network.enableManagement) { swMap.management = createSwitchGroup('Mgmt', 'Mgmt', config.network.managementRedundancy, currentY, sx, '192.0', '管理区'); sx += (config.network.managementRedundancy==='Redundant'?520:260); }
    if (config.network.enableBusiness) { swMap.business = createSwitchGroup('Bus', 'Bus', config.network.businessRedundancy, currentY, sx, '192.1', '业务区'); sx += (config.network.businessRedundancy==='Redundant'?520:260); }
    if (config.network.enableStorage) { swMap.storage = createSwitchGroup('Stor', 'Stor', config.network.storageRedundancy, currentY, sx, '192.2', '存储区'); sx += (config.network.storageRedundancy==='Redundant'?520:260); }
    if (config.network.enableBackup) { swMap.backup = createSwitchGroup('Bk', 'Backup', config.network.backupRedundancy, currentY, sx, '192.3', '备份区'); sx += (config.network.backupRedundancy==='Redundant'?520:260); }
    currentY += 340;
  }

  // --- 2. Generate Nodes ---
  const generateNodesForLayer = (count: number, type: NodeType, prefix: string, labelBase: string, startYPos: number) => {
    const useStack = count > STYLES.stackThreshold;
    const actualCount = useStack ? 1 : count;
    const rowCap = STYLES.rowCapacity;
    const rows = Math.ceil(actualCount / rowCap);
    
    // Wider groups for spacing
    const grpWidth = config.network.deploymentMode === 'Physically_Separated' 
        ? (colGap * Math.max(3, Math.min(actualCount, rowCap)) * 1.25) 
        : (Math.min(actualCount, rowCap) * colGap) + 160;
    
    groups.push({ 
        id: `grp-${prefix}`, label: labelBase, 
        x: startX - 40, y: startYPos - 60, 
        width: grpWidth, height: (rows * 220) + 40 
    });

    for (let i = 0; i < actualCount; i++) {
      const r = Math.floor(i / rowCap);
      const c = i % rowCap;
      const nodeX = startX + (c * colGap) + (config.network.deploymentMode === 'Physically_Separated' ? colGap * 0.2 : 0);
      const nodeY = startYPos + (r * 220); 

      const nodeId = `${prefix}-${(i + 1).toString().padStart(2, '0')}`;
      
      const node: NodeConfig = {
          id: nodeId, type,
          label: useStack ? `${NODE_TYPE_LABELS[type].split(' ')[0]}集群` : `${type==='compute'?'CNA':type==='storage'?'SNA':'MNA'}-${(i+1).toString().padStart(2,'0')}`,
          subLabel: useStack ? `x${count}` : '',
          x: nodeX, y: nodeY, groupId: `grp-${prefix}`,
          isStack: useStack, stackCount: count,
          ports: [], bonds: []
      };

      const wire = (plane: NetworkPlane, sws: string[]) => {
          if (!sws || sws.length === 0) return;
          const pCfg = PLANE_CONFIG[plane];
          const isLag = plane === 'business' || plane === 'storage';
          const needsDual = isLag || (plane === 'management' && sws.length > 1);

          const sP1Id = `${nodeId}-${plane}-1`;
          const sP2Id = `${nodeId}-${plane}-2`;
          
          addPortToNode(node, sP1Id, 'top', pCfg.ports[0], pCfg.color);
          if (needsDual) {
              addPortToNode(node, sP2Id, 'top', pCfg.ports[1], pCfg.color);
              // Create Bond (Visual Pill) if LAG
              if (isLag) {
                  addBondToNode(node, plane, [sP1Id, sP2Id], pCfg.color);
              }
          }

          const sw1 = nodes.find(n => n.id === sws[0]);
          const sw2 = sws.length > 1 ? nodes.find(n => n.id === sws[1]) : null;

          if (sw1) {
              const swPId = `${sw1.id}-down-${nodeId}-${plane}-1`;
              addPortToNode(sw1, swPId, 'bottom', getSwPortLabel(pCfg.speed, 0, i), pCfg.color);
              edges.push({
                  source: nodeId, target: sw1.id, plane,
                  sourcePort: sP1Id, targetPort: swPId,
                  speed: pCfg.speed, isLag
              });
              // Note: We are not bonding switch ports visually here for simplicity, 
              // but you could add addBondToNode(sw1...) if switch ports are paired.
          }

          if (sw2) {
              const swPId = `${sw2.id}-down-${nodeId}-${plane}-1`;
              addPortToNode(sw2, swPId, 'bottom', getSwPortLabel(pCfg.speed, 0, i), pCfg.color);
              edges.push({
                  source: nodeId, target: sw2.id, plane,
                  sourcePort: sP2Id || sP1Id, targetPort: swPId,
                  speed: pCfg.speed, isLag
              });
          } else if (isLag && sw1) {
              const swP2Id = `${sw1.id}-down-${nodeId}-${plane}-2`;
              addPortToNode(sw1, swP2Id, 'bottom', getSwPortLabel(pCfg.speed, 0, i+24), pCfg.color);
              edges.push({
                  source: nodeId, target: sw1.id, plane,
                  sourcePort: sP2Id, targetPort: swP2Id,
                  speed: pCfg.speed, isLag
              });
          }
      };

      if (type==='management' || config.network.enableManagement || config.network.deploymentMode==='Converged') wire('management', swMap.management);
      if (type!=='storage' && (config.network.enableBusiness || config.network.deploymentMode==='Converged')) wire('business', swMap.business);
      if ((config.network.enableStorage || config.network.deploymentMode==='Converged')) wire('storage', swMap.storage);
      if (config.network.enableBackup) wire('backup', swMap.backup);
      if (config.network.enableIpmi) wire('ipmi', swMap.ipmi);

      nodes.push(node);
    }
    return currentY + (rows * 220) + 80;
  };

  if(config.mode === 'Standard' && !config.reuseCompute && config.managementCount > 0) {
      currentY = generateNodesForLayer(config.managementCount, 'management', 'mn', '管理资源池', currentY);
  }
  
  currentY = generateNodesForLayer(config.nodeCount, 'compute', 'cn', config.mode==='HCI'?'超融合资源池':'计算资源池', currentY);
  
  if (config.mode === 'Standard' && config.reuseCompute) {
      const limit = Math.min(config.managementCount, config.nodeCount);
      for(let k=0; k<limit; k++) {
          const t = nodes.find(n => n.id === `cn-${(k+1).toString().padStart(2,'0')}`);
          if(t) { t.isReuse = true; t.subLabel = '[M+C]'; }
      }
  }

  if(config.mode === 'Standard' && config.storageCount > 0) {
      currentY = generateNodesForLayer(config.storageCount, 'storage', 'sn', '专用存储资源池', currentY);
  }

  return { nodes, edges, groups };
};