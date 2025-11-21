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
  description?: string;
  estimatedDuration: number; // in minutes
  actualDuration: number; // in seconds
  status: 'pending' | 'active' | 'paused' | 'completed';
  transcription?: string;
  summary?: string;
};

export type AttendanceRecord = {
  memberId: string;
  status: 'present' | 'absent';
  location?: 'physical' | 'online';
}

export type SurveyCriterion = {
  id: string;
  name: string;
  weight: number; // Percentage (e.g., 20)
};

export type SurveyResult = {
  criterionId: string;
  score: 0 | 1 | 2;
}

export type Meeting = {
  id: string;
  date: string; // ISO string
  status: MeetingStatus;
  plannedStartTime?: string; // ISO string
  actualStartTime?: string; // ISO string
  endTime?: string; // ISO string
  presenterId: string | null;
  secretaryId: string | null;
  agenda: Topic[];
  attendance?: AttendanceRecord[];
  surveyResults?: SurveyResult[];
};

export type MeetingStatus = "SETUP" | "IN_PROGRESS" | "SURVEY" | "COMPLETED";

export type CurrentMeetingState = {
  status: MeetingStatus;
  presenterId: string | null;
  secretaryId: string | null;
  agenda: Topic[];
  meetingDate?: Date;
  meetingTime: string;
  plannedStartTime: Date | null;
  actualStartTime: Date | null;
  lastMeetingSummary: {
    presenter: Member | undefined;
    secretary: Member | undefined;
    duration: number;
  } | null;
};
