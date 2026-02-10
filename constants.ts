import { NetworkPlane, VendorID, NodeType } from './types';

export const COLORS = {
  management: '#22c55e', // green-500
  business: '#3b82f6',   // blue-500
  storage: '#f97316',    // orange-500
  backup: '#06b6d4',     // cyan-500
  stack: '#8b5cf6',      // violet-500
  heartbeat: '#ef4444',  // red-500
  ipmi: '#64748b',       // slate-500
  grid: '#e2e8f0',
};

export const STYLES = {
  nodeWidth: 60,
  nodeHeight: 60,
  switchWidth: 60,
  switchHeight: 40,
  groupPadding: 40,
  rowCapacity: 8,
};

export const PLANE_CONFIG: Record<NetworkPlane, { color: string; style: 'solid' | 'dashed'; label: string; width: number }> = {
  management: { color: COLORS.management, style: 'solid', label: '管理平面 (Mgmt)', width: 1 },
  business: { color: COLORS.business, style: 'solid', label: '业务平面 (Business)', width: 2 },
  storage: { color: COLORS.storage, style: 'solid', label: '存储平面 (Storage)', width: 2 },
  backup: { color: COLORS.backup, style: 'solid', label: '备份平面 (Backup)', width: 2 },
  stack: { color: COLORS.stack, style: 'solid', label: '堆叠线 (Stack)', width: 3 },
  heartbeat: { color: COLORS.heartbeat, style: 'dashed', label: '心跳线 (Keepalive)', width: 1 },
  ipmi: { color: COLORS.ipmi, style: 'dashed', label: '带外管理 (IPMI)', width: 1 },
};

// Define the required fixed node types
export const REQUIRED_NODE_TYPES: NodeType[] = ['compute', 'storage', 'switch', 'firewall', 'router', 'vm'];

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  compute: '计算节点 (CNA)',
  storage: '存储节点 (SNA)',
  switch: '交换机 (Switch)',
  firewall: '防火墙 (Firewall)',
  router: '路由器 (Router)',
  vm: '云主机 (VM)'
};

// Initial icon set
export const INITIAL_ICONS: Record<VendorID, Record<NodeType, string>> = {
  HUAWEI_CLOUD: {
    compute: 'https://cdn-icons-png.flaticon.com/512/2933/2933245.png',
    storage: 'https://cdn-icons-png.flaticon.com/512/2906/2906274.png',
    switch: 'https://cdn-icons-png.flaticon.com/512/9672/9672152.png',
    firewall: 'https://cdn-icons-png.flaticon.com/512/2885/2885417.png',
    router: 'https://cdn-icons-png.flaticon.com/512/2315/2315206.png',
    vm: 'https://cdn-icons-png.flaticon.com/512/12391/12391036.png'
  },
  AWS: {
    compute: 'https://cdn-icons-png.flaticon.com/512/2933/2933245.png',
    storage: 'https://cdn-icons-png.flaticon.com/512/2906/2906274.png',
    switch: 'https://cdn-icons-png.flaticon.com/512/9672/9672152.png',
    firewall: 'https://cdn-icons-png.flaticon.com/512/2885/2885417.png',
    router: 'https://cdn-icons-png.flaticon.com/512/2315/2315206.png',
    vm: 'https://cdn-icons-png.flaticon.com/512/12391/12391036.png'
  },
  AZURE: {
    compute: 'https://cdn-icons-png.flaticon.com/512/2933/2933245.png',
    storage: 'https://cdn-icons-png.flaticon.com/512/2906/2906274.png',
    switch: 'https://cdn-icons-png.flaticon.com/512/9672/9672152.png',
    firewall: 'https://cdn-icons-png.flaticon.com/512/2885/2885417.png',
    router: 'https://cdn-icons-png.flaticon.com/512/2315/2315206.png',
    vm: 'https://cdn-icons-png.flaticon.com/512/12391/12391036.png'
  },
  CISCO: {
    compute: 'https://cdn-icons-png.flaticon.com/512/2933/2933245.png',
    storage: 'https://cdn-icons-png.flaticon.com/512/2906/2906274.png',
    switch: 'https://cdn-icons-png.flaticon.com/512/9672/9672152.png',
    firewall: 'https://cdn-icons-png.flaticon.com/512/2885/2885417.png',
    router: 'https://cdn-icons-png.flaticon.com/512/2315/2315206.png',
    vm: 'https://cdn-icons-png.flaticon.com/512/12391/12391036.png'
  },
  CUSTOM: {
    compute: '',
    storage: '',
    switch: '',
    firewall: '',
    router: '',
    vm: ''
  }
};