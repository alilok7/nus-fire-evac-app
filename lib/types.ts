export type UserRole = 'resident' | 'ra' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  studentId: string;
  role: UserRole;
  hostelId: string;
  blockId: string;
  floorId: string;
  roomNumber?: string;
  createdAt: Date;
}

export interface Hostel {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Block {
  id: string;
  hostelId: string;
  name: string;
  createdAt: Date;
}

export interface Floor {
  id: string;
  hostelId: string;
  blockId: string;
  name: string;
  createdAt: Date;
}

export interface Checkpoint {
  id: string;
  hostelId: string;
  blockId: string;
  floorId: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // default 100
  createdAt: Date;
  updatedAt: Date;
}

export interface Incident {
  id: string;
  hostelId: string;
  blockId: string;
  floorId: string;
  status: 'active' | 'ended';
  startedAt: Date;
  endedAt?: Date;
  startedBy: string; // RA uid
  endedBy?: string; // RA uid
}

export interface AttendanceRecord {
  id: string;
  incidentId: string;
  userId: string;
  studentId: string;
  accountedAt: Date;
  accountedBy?: string; // RA uid if manual
  method: 'gps' | 'manual';
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number; // in meters
  manualReason?: string;
}

export interface AuditLog {
  id: string;
  incidentId: string;
  raUid: string;
  raStudentId: string;
  action: 'start_incident' | 'end_incident' | 'manual_checkin';
  targetUserId?: string;
  targetStudentId?: string;
  reason?: string;
  timestamp: Date;
}

export type GPSConfidence = 'high' | 'medium' | 'low';

export interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface ResidentStatus {
  user: UserProfile;
  status: 'accounted_gps' | 'accounted_manual' | 'missing';
  record?: AttendanceRecord;
  gpsConfidence?: GPSConfidence;
}
