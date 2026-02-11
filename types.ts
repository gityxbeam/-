export type VendorID = 'HUAWEI_CLOUD' | 'AWS' | 'AZURE' | 'CISCO' | 'ZSTACK' | 'XSKY' | 'ALIYUN' | 'SANGFOR' | 'CUSTOM';

export type NodeType = 'compute' | 'storage' | 'management' | 'switch' | 'firewall' | 'router' | 'vm' | 'internet';

export type NetworkPlane = 'management' | 'business' | 'storage' | 'backup' | 'stack' | 'heartbeat' | 'mlag' | 'uplink' | 'ipmi';

export type TopologyMode = 'HCI' | 'Standard';

export type SwitchRedundancy = 'Single' | 'Redundant';

export type SwitchDeploymentMode = 'Converged' | 'Physically_Separated';

export interface PortConfig {
  id: string;
  group: 'top' | 'bottom' | 'left' | 'right';
  label: string;
  color: string;
}

export interface BondConfig {
  id: string;
  plane: NetworkPlane;
  ports: string[]; // IDs of the ports in this bond
  color: string;
}

export interface NodeConfig {
  id: string;
  type: NodeType;
  label: string;
  subLabel?: string; 
  ip?: string;
  x: number;
  y: number;
  groupId?: string;
  iconUrl?: string;
  isStack?: boolean; 
  stackCount?: number;
  isReuse?: boolean; 
  ports?: PortConfig[];
  bonds?: BondConfig[]; // Visual grouping for ports
}

export interface EdgeConfig {
  source: string;
  target: string;
  plane: NetworkPlane;
  sourcePort: string; 
  targetPort: string; 
  speed: string; 
  isLag?: boolean; 
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
  coreRedundancy: SwitchRedundancy;
  enableManagement: boolean;
  managementRedundancy: SwitchRedundancy;
  enableBusiness: boolean;
  businessRedundancy: SwitchRedundancy;
  enableStorage: boolean;
  storageRedundancy: SwitchRedundancy;
  enableBackup: boolean; 
  backupRedundancy: SwitchRedundancy;
  enableIpmi: boolean;
}

export interface ProjectConfig {
  projectId: string; 
  projectName: string; 
  vendorId: VendorID;
  mode: TopologyMode;
  managementCount: number; 
  reuseCompute: boolean; 
  nodeCount: number; 
  storageCount: number; 
  network: NetworkConfig;
  showWatermark: boolean;
  showLegend: boolean;
  showBOM: boolean;
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
  desc?: string;
}

export interface BOMItem {
  category: string;
  name: string;
  count: number;
  unit: string;
}