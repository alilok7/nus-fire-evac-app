export type UserRole = 'resident' | 'ra' | 'office';

export interface UserProfile {
  uid: string;
  email: string;
  studentId: string;
  role: UserRole;
  hostelId: string;
  roomNumber?: string;
  createdAt: Date;
}

export interface Hostel {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Checkpoint {
  id: string;
  hostelId: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Incident {
  id: string;
  hostelId: string;
  status: 'active' | 'ended';
  startedAt: Date;
  endedAt?: Date;
  startedBy?: string;
  endedBy?: string;
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

export interface HelpRequest {
  id: string;
  incidentId: string;
  userId: string;
  studentId: string;
  roomNumber?: string;
  status: 'open' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

export interface RaAssignment {
  id?: string;
  raStudentId: string;
  hostelId: string;
}