import { NetworkPlane, VendorID, NodeType } from './types';

export const COLORS = {
  management: '#22c55e', // green-500
  business: '#3b82f6',   // blue-500
  storage: '#f97316',    // orange-500
  backup: '#06b6d4',     // cyan-500
  stack: '#8b5cf6',      // violet-500
  heartbeat: '#ef4444',  // red-500
  ipmi: '#64748b',       // slate-500
  mlag: '#94a3b8',       // slate-400
  uplink: '#1e293b',     // slate-800
  grid: '#e2e8f0',
};

export const STYLES = {
  nodeWidth: 60,
  nodeHeight: 60,
  switchWidth: 60,
  switchHeight: 40,
  groupPadding: 40,
  rowCapacity: 8,
  stackThreshold: 12, // Collapse to stack view if > 12
};

export interface PlaneDefinition {
  color: string;
  style: 'solid' | 'dashed';
  label: string;
  width: number;
  speed: string;
  ports: string[]; // e.g. ['Eth0', 'Eth1']
}

export const PLANE_CONFIG: Record<NetworkPlane, PlaneDefinition> = {
  management: { 
    color: COLORS.management, style: 'solid', label: '管理网络 (Mgmt)', width: 1, speed: 'GE', 
    ports: ['Eth0', 'Eth1'] 
  },
  business: { 
    color: COLORS.business, style: 'solid', label: '业务网络 (Business)', width: 2, speed: '10GE',
    ports: ['Eth2', 'Eth3'] 
  },
  storage: { 
    color: COLORS.storage, style: 'solid', label: '存储网络 (Storage)', width: 2, speed: '25GE',
    ports: ['Eth4', 'Eth5']
  },
  backup: { 
    color: COLORS.backup, style: 'solid', label: '备份网络 (Backup)', width: 2, speed: '10GE',
    ports: ['Eth6', 'Eth7']
  },
  stack: { 
    color: COLORS.stack, style: 'solid', label: '堆叠 (Stack)', width: 3, speed: '40GE',
    ports: ['Stack-L', 'Stack-R']
  },
  heartbeat: { 
    color: COLORS.heartbeat, style: 'dashed', label: '心跳 (Heartbeat)', width: 1, speed: '1G',
    ports: ['HB-1', 'HB-2']
  },
  mlag: { 
    color: COLORS.mlag, style: 'dashed', label: 'M-LAG Peer', width: 1, speed: '100GE',
    ports: ['Peer-1', 'Peer-2']
  },
  uplink: { 
    color: COLORS.uplink, style: 'solid', label: '上行链路 (Uplink)', width: 2, speed: '100GE',
    ports: ['Up-1', 'Up-2']
  },
  ipmi: { 
    color: COLORS.ipmi, style: 'dashed', label: '带外管理 (IPMI)', width: 1, speed: '100M',
    ports: ['BMC']
  },
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  compute: '计算节点 (CNA)',
  storage: '存储节点 (SNA)',
  management: '管理节点 (MNA)',
  switch: '交换机 (Switch)',
  firewall: '防火墙 (Firewall)',
  router: '路由器 (Router)',
  vm: '云主机 (VM)',
  internet: 'Internet/核心网'
};

// Initial icon set
const SERVER_ICON = 'https://cdn-icons-png.flaticon.com/512/2933/2933245.png';
const STORAGE_ICON = 'https://cdn-icons-png.flaticon.com/512/2906/2906274.png';
const SWITCH_ICON = 'https://cdn-icons-png.flaticon.com/512/9672/9672152.png';
const ROUTER_ICON = 'https://cdn-icons-png.flaticon.com/512/2315/2315206.png';
const FW_ICON = 'https://cdn-icons-png.flaticon.com/512/2885/2885417.png';

export const INITIAL_ICONS: Record<VendorID, Record<NodeType, string>> = {
  HUAWEI_CLOUD: {
    compute: SERVER_ICON, storage: STORAGE_ICON, management: SERVER_ICON, switch: SWITCH_ICON,
    firewall: FW_ICON, router: ROUTER_ICON, vm: SERVER_ICON, internet: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png'
  },
  ZSTACK: {
    compute: SERVER_ICON, storage: STORAGE_ICON, management: SERVER_ICON, switch: SWITCH_ICON,
    firewall: FW_ICON, router: ROUTER_ICON, vm: SERVER_ICON, internet: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png'
  },
  XSKY: {
    compute: SERVER_ICON, storage: STORAGE_ICON, management: SERVER_ICON, switch: SWITCH_ICON,
    firewall: FW_ICON, router: ROUTER_ICON, vm: SERVER_ICON, internet: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png'
  },
  SANGFOR: {
    compute: SERVER_ICON, storage: STORAGE_ICON, management: SERVER_ICON, switch: SWITCH_ICON,
    firewall: FW_ICON, router: ROUTER_ICON, vm: SERVER_ICON, internet: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png'
  },
  ALIYUN: {
    compute: SERVER_ICON, storage: STORAGE_ICON, management: SERVER_ICON, switch: SWITCH_ICON,
    firewall: FW_ICON, router: ROUTER_ICON, vm: SERVER_ICON, internet: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png'
  },
  AWS: {
    compute: SERVER_ICON, storage: STORAGE_ICON, management: SERVER_ICON, switch: SWITCH_ICON,
    firewall: FW_ICON, router: ROUTER_ICON, vm: SERVER_ICON, internet: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png'
  },
  AZURE: {
    compute: SERVER_ICON, storage: STORAGE_ICON, management: SERVER_ICON, switch: SWITCH_ICON,
    firewall: FW_ICON, router: ROUTER_ICON, vm: SERVER_ICON, internet: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png'
  },
  CISCO: {
    compute: SERVER_ICON, storage: STORAGE_ICON, management: SERVER_ICON, switch: SWITCH_ICON,
    firewall: FW_ICON, router: ROUTER_ICON, vm: SERVER_ICON, internet: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png'
  },
  CUSTOM: {
    compute: '', storage: '', management: '', switch: '', firewall: '', router: '', vm: '', internet: ''
  }
};