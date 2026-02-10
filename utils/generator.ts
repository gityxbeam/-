import { ProjectConfig, GeneratedTopology, NodeConfig, EdgeConfig, NetworkPlane, SwitchRedundancy } from '../types';
import { STYLES } from '../constants';

export const generateTopology = (config: ProjectConfig): GeneratedTopology => {
  const nodes: NodeConfig[] = [];
  const edges: EdgeConfig[] = [];
  const groups: GeneratedTopology['groups'] = [];

  const startX = 100;
  const startY = 60;
  const colGap = 140;
  
  const getPort = (base: string, idx: number) => `${base}-P${idx}`;

  // Helper to create a Switch Group AND a surrounding resource box
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
    
    // Calculate widths for centering
    const switchWidth = 60;
    const switchGap = 120; // Distance between stacked switches
    const groupPadding = 40;
    
    const isRedundant = redundancy === 'Redundant';
    const contentWidth = isRedundant ? (switchWidth * 2 + switchGap) : switchWidth;
    const groupWidth = contentWidth + (groupPadding * 2);
    
    // Group Position
    const groupX = startX + xOffset;
    
    const groupId = `grp-sw-${role.toLowerCase()}`;
    groups.push({
        id: groupId,
        label: groupTitle,
        x: groupX,
        y: yPos - 50,
        width: groupWidth,
        height: 140
    });

    // Determine starting X for switches inside the group to center them
    const innerStartX = groupX + groupPadding;

    // Switch A
    const id1 = `sw-${role.toLowerCase()}-01`;
    swIds.push(id1);
    nodes.push({
      id: id1,
      type: 'switch',
      label: `${labelPrefix}-SW-A`,
      ip: `${ipBase}.1`,
      x: innerStartX,
      y: yPos,
      groupId: groupId
    });

    // Switch B (if redundant)
    if (isRedundant) {
      const id2 = `sw-${role.toLowerCase()}-02`;
      swIds.push(id2);
      nodes.push({
        id: id2,
        type: 'switch',
        label: `${labelPrefix}-SW-B`,
        ip: `${ipBase}.2`,
        x: innerStartX + switchWidth + switchGap, 
        y: yPos,
        groupId: groupId
      });

      // Stack Link
      edges.push({
        source: id1,
        target: id2,
        plane: 'stack',
        sourcePort: 'Stack-L',
        targetPort: 'Stack-R',
        speed: '100GE'
      });
    }

    return swIds;
  };

  // --- 1. Generate Switches ---
  
  interface SwitchMap {
    management: string[];
    business: string[];
    storage: string[];
    backup: string[];
    ipmi: string[];
  }
  
  const switches: SwitchMap = { management: [], business: [], storage: [], backup: [], ipmi: [] };
  let currentY = startY;

  if (config.network.deploymentMode === 'Converged') {
    const coreSwitches = createSwitchGroup(
      'Core', 'Core', 
      config.network.coreRedundancy, 
      currentY, 
      colGap * 2.5, 
      '192.168.1',
      '核心交换区'
    );
    switches.management = coreSwitches;
    switches.business = coreSwitches;
    switches.storage = coreSwitches;
    switches.backup = coreSwitches;
    
    currentY += 200; 
  } else {
    // Physically Separated - Granular Checks
    let switchX = 0;

    if (config.network.enableManagement) {
        switches.management = createSwitchGroup(
          'Mgmt', 'Mgmt', 
          config.network.managementRedundancy, 
          currentY, 
          switchX, 
          '192.168.0',
          '管理交换区'
        );
        switchX += (config.network.managementRedundancy === 'Redundant' ? 320 : 180);
    }

    if (config.network.enableBusiness) {
        switches.business = createSwitchGroup(
          'Business', 'Bus', 
          config.network.businessRedundancy, 
          currentY, 
          switchX, 
          '192.168.1',
          '业务交换区'
        );
        switchX += (config.network.businessRedundancy === 'Redundant' ? 320 : 180);
    }

    if (config.network.enableStorage) {
        switches.storage = createSwitchGroup(
          'Storage', 'Stor', 
          config.network.storageRedundancy, 
          currentY, 
          switchX, 
          '192.168.2',
          '存储交换区'
        );
        switchX += (config.network.storageRedundancy === 'Redundant' ? 320 : 180);
    }

    if (config.network.enableBackup) {
        switches.backup = createSwitchGroup(
          'Backup', 'Backup', 
          config.network.backupRedundancy, 
          currentY, 
          switchX, 
          '192.168.3',
          '备份交换区'
        );
        switchX += (config.network.backupRedundancy === 'Redundant' ? 320 : 180);
    }

    currentY += 250;
  }

  // IPMI Switch (Floating Left usually)
  if (config.network.enableIpmi) {
      switches.ipmi = createSwitchGroup(
          'IPMI', 'IPMI',
          'Single',
          startY, 
          -220, 
          '192.168.9',
          '带外管理区'
      );
  }

  // --- 2. Generate Nodes & Wiring ---

  const createLayer = (
    count: number, 
    type: 'compute' | 'storage', 
    prefix: string, 
    baseY: number, 
    groupLabel: string,
    startIp: number
  ) => {
    const layerNodes: NodeConfig[] = [];
    const nodesInRow = Math.min(count, STYLES.rowCapacity);
    const rows = Math.ceil(count / STYLES.rowCapacity);
    
    const groupWidth = config.network.deploymentMode === 'Physically_Separated' 
       ? (colGap * 8) // Wider to accommodate more cables
       : (nodesInRow * colGap) + STYLES.groupPadding;

    groups.push({
      id: `grp-${prefix}`,
      label: groupLabel,
      x: startX - 40, 
      y: baseY - 60,
      width: groupWidth,
      height: (rows * 160) + STYLES.groupPadding,
    });

    for (let i = 0; i < count; i++) {
      const rowIndex = Math.floor(i / STYLES.rowCapacity);
      const colIndex = i % STYLES.rowCapacity;
      
      const centerOffset = config.network.deploymentMode === 'Physically_Separated' ? colGap * 1.5 : 0;
      const nodeX = startX + (colIndex * colGap) + centerOffset;
      const nodeY = baseY + (rowIndex * 160); 

      const nodeId = `${prefix}-${(i + 1).toString().padStart(2, '0')}`;
      const nodeLabel = `${type === 'compute' ? 'CNA' : 'SNA'}-${(i + 1).toString().padStart(2, '0')}`;
      
      const node: NodeConfig = {
        id: nodeId,
        type: type,
        label: nodeLabel,
        ip: `192.168.10.${startIp + i}`,
        x: nodeX,
        y: nodeY,
        groupId: `grp-${prefix}`
      };
      nodes.push(node);

      // --- WIRING ---
      const connectToPlane = (plane: NetworkPlane, switchIds: string[], portPrefix: string, speed: string) => {
        if (!switchIds || switchIds.length === 0) return;
        
        edges.push({
          source: nodeId,
          target: switchIds[0],
          plane: plane,
          sourcePort: `${portPrefix}0`,
          targetPort: getPort(portPrefix, i),
          speed
        });
        
        if (switchIds.length > 1) {
            edges.push({
            source: nodeId,
            target: switchIds[1],
            plane: plane,
            sourcePort: `${portPrefix}1`,
            targetPort: getPort(portPrefix, i),
            speed
          });
        }
      };

      // 1. Management
      if (config.network.enableManagement || config.network.deploymentMode === 'Converged') {
          connectToPlane('management', switches.management, 'Mgmt', '1GE');
      }
      // 2. Business
      if (config.network.enableBusiness || config.network.deploymentMode === 'Converged') {
          connectToPlane('business', switches.business, 'Eth', '10GE');
      }
      // 3. Storage
      if ((type === 'storage' || config.mode === 'HCI') && (config.network.enableStorage || config.network.deploymentMode === 'Converged')) {
         connectToPlane('storage', switches.storage, 'Stor', '25GE');
      }
      // 4. Backup
      if (config.network.enableBackup || config.network.deploymentMode === 'Converged') {
         connectToPlane('backup', switches.backup, 'Bk', '10GE');
      }
      // 5. IPMI
      if (config.network.enableIpmi) {
         connectToPlane('ipmi', switches.ipmi, 'BMC', '100M');
      }
    }
  };

  createLayer(config.nodeCount, 'compute', 'comp', currentY, config.mode === 'HCI' ? '超融合计算池 (HCI)' : '计算资源池 (Compute)', 10);

  if (config.mode === 'Standard' && config.storageCount > 0) {
     const computeRows = Math.ceil(config.nodeCount / STYLES.rowCapacity);
     const storageY = currentY + (computeRows * 160) + 120;
     createLayer(config.storageCount, 'storage', 'store', storageY, '专用存储资源池 (Storage)', 50);
  }

  return { nodes, edges, groups };
};