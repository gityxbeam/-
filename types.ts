export type VendorID = 'HUAWEI_CLOUD' | 'AWS' | 'AZURE' | 'CISCO' | 'CUSTOM';

export type NodeType = 'compute' | 'storage' | 'switch' | 'firewall' | 'router' | 'vm';

export type NetworkPlane = 'management' | 'business' | 'storage' | 'backup' | 'stack' | 'heartbeat' | 'ipmi';

export type TopologyMode = 'HCI' | 'Standard';

export type SwitchRedundancy = 'Single' | 'Redundant';

export type SwitchDeploymentMode = 'Converged' | 'Physically_Separated';

export interface NodeConfig {
  id: string;
  type: NodeType;
  label: string;
  ip?: string;
  x: number;
  y: number;
  groupId?: string;
  iconUrl?: string; 
}

export interface EdgeConfig {
  source: string;
  target: string;
  plane: NetworkPlane;
  sourcePort: string;
  targetPort: string;
  speed: string; 
}

export interface CustomIcon {
  id: string;
  name: string;
  url: string;
  type: NodeType;
  vendorId: VendorID;
}

export interface NetworkConfig {
  deploymentMode: SwitchDeploymentMode;
  
  // Converged Mode:
  coreRedundancy: SwitchRedundancy;

  // Physically Separated Mode Toggles & Redundancy:
  enableManagement: boolean;
  managementRedundancy: SwitchRedundancy;
  
  enableBusiness: boolean;
  businessRedundancy: SwitchRedundancy;
  
  enableStorage: boolean;
  storageRedundancy: SwitchRedundancy;

  enableBackup: boolean; // New
  backupRedundancy: SwitchRedundancy;

  enableIpmi: boolean;
}

export interface ProjectConfig {
  projectId: string; 
  projectName: string; 
  vendorId: VendorID;
  mode: TopologyMode;
  network: NetworkConfig;
  nodeCount: number;
  storageCount: number;
  showWatermark: boolean;
  showLegend: boolean;
  watermarkText: string;
}

export interface GeneratedTopology {
  nodes: NodeConfig[];
  edges: EdgeConfig[];
  groups: { id: string; label: string; x: number; y: number; width: number; height: number }[];
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId?: string; 
  type?: 'node' | 'edge' | 'canvas';
}

export interface LegendItem {
  key: NetworkPlane;
  label: string;
  color: string;
  style: 'solid' | 'dashed';
  width: number;
}