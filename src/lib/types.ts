export type Member = {
  id: string;
  name: string;
  avatarUrl: string;
  presenterCount: number;
  volunteerCount: number;
  topicPresenterCount: number;
};

export type Topic = {
  id: string;
  presenterId: string;
  title: string;
  estimatedDuration: number; // in minutes
  actualDuration: number; // in seconds
  status: 'pending' | 'active' | 'paused' | 'completed';
  transcription?: string;
  summary?: string;
};

export type Meeting = {
  id: string;
  date: string; // ISO string
  plannedStartTime: string; // ISO string
  actualStartTime: string; // ISO string
  endTime: string; // ISO string
  presenterId: string;
  secretaryId: string;
  agenda: Topic[];
};

export type MeetingStatus = "SETUP" | "IN_PROGRESS" | "SUMMARY";
