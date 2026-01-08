export type UserRole = 'client' | 'admin';

export type ProjectStatus = 'discovery' | 'in-progress' | 'testing' | 'ready' | 'completed';

export type MilestoneStatus = 'completed' | 'active' | 'pending';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  completedAt?: string;
}

export interface Deliverable {
  id: string;
  name: string;
  type: 'workflow' | 'documentation' | 'guide' | 'video';
  url: string;
  locked: boolean;
}

export interface Feedback {
  id: string;
  message: string;
  author: string;
  createdAt: string;
  isInternal?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  estimatedDelivery: string;
  clientId: string;
  clientName: string;
  milestones: Milestone[];
  deliverables: Deliverable[];
  feedback: Feedback[];
  createdAt: string;
  updatedAt: string;
  revisionCount: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  projectId?: string;
}
