"use client";

import React, { createContext, useReducer, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import type { Member, Meeting, Topic, CurrentMeetingState, MeetingStatus } from '@/lib/types';
import { initialMemberNames } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const getInitialTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

const initialCurrentMeetingState: CurrentMeetingState = {
  status: 'SETUP',
  presenterId: null,
  secretaryId: null,
  agenda: [],
  meetingDate: undefined,
  meetingTime: getInitialTime(),
  plannedStartTime: null,
  actualStartTime: null,
  lastMeetingSummary: null,
};


type AppState = {
  members: Member[];
  meetings: Meeting[];
  currentMeeting: CurrentMeetingState;
};

type Action =
  | { type: 'INITIALIZE_STATE'; payload: AppState }
  | { type: 'ADD_MEMBER'; payload: Member }
  | { type: 'UPDATE_MEMBER'; payload: Member }
  | { type: 'DELETE_MEMBER'; payload: string }
  | { type: 'ADD_MEETING'; payload: Meeting }
  | { type: 'UPDATE_CURRENT_MEETING'; payload: Partial<CurrentMeetingState> }
  | { type: 'SET_CURRENT_MEETING_STATUS'; payload: MeetingStatus }
  | { type: 'ADD_TOPIC'; payload: Topic }
  | { type: 'UPDATE_TOPIC'; payload: Topic }
  | { type: 'REMOVE_TOPIC'; payload: string }
  | { type: 'RESET_CURRENT_MEETING' };

const generateInitialMembers = (): Member[] => {
  return initialMemberNames.map((name, index) => ({
    id: String(index + 1),
    name,
    avatarUrl: PlaceHolderImages[index % PlaceHolderImages.length].imageUrl,
    presenterCount: 0,
    volunteerCount: 0,
    topicPresenterCount: 0,
  }));
};

const getInitialState = (): AppState => ({
  members: [],
  meetings: [],
  currentMeeting: {
    ...initialCurrentMeetingState,
    meetingDate: new Date(),
    meetingTime: getInitialTime(),
  },
});

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'INITIALIZE_STATE':
      return {
          ...action.payload,
          members: action.payload.members.length > 0 ? action.payload.members : generateInitialMembers(),
          currentMeeting: state.currentMeeting, // Keep transient meeting state
      };
    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.payload] };
    case 'UPDATE_MEMBER':
      return {
        ...state,
        members: state.members.map(m => m.id === action.payload.id ? action.payload : m),
      };
    case 'DELETE_MEMBER':
      return {
        ...state,
        members: state.members.filter(m => m.id !== action.payload),
      };
    case 'ADD_MEETING':
      return { ...state, meetings: [...state.meetings, action.payload] };
    case 'UPDATE_CURRENT_MEETING':
        return {
            ...state,
            currentMeeting: { ...state.currentMeeting, ...action.payload },
        };
    case 'SET_CURRENT_MEETING_STATUS':
        return {
            ...state,
            currentMeeting: { ...state.currentMeeting, status: action.payload },
        };
    case 'ADD_TOPIC':
        return {
            ...state,
            currentMeeting: { ...state.currentMeeting, agenda: [...state.currentMeeting.agenda, action.payload] },
        };
    case 'UPDATE_TOPIC':
        return {
            ...state,
            currentMeeting: {
                ...state.currentMeeting,
                agenda: state.currentMeeting.agenda.map(t => t.id === action.payload.id ? action.payload : t),
            },
        };
    case 'REMOVE_TOPIC':
        return {
            ...state,
            currentMeeting: { ...state.currentMeeting, agenda: state.currentMeeting.agenda.filter(t => t.id !== action.payload) },
        };
    case 'RESET_CURRENT_MEETING':
        const now = new Date();
        return {
            ...state,
            currentMeeting: {
                ...initialCurrentMeetingState,
                meetingDate: now,
                meetingTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
            },
        };
    default:
      return state;
  }
};

type AppContextType = AppState & {
  addMember: (member: Omit<Member, 'id' | 'avatarUrl'>) => void;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => void;
  addMeeting: (meeting: Meeting) => void;
  updateCurrentMeeting: (payload: Partial<CurrentMeetingState>) => void;
  setCurrentMeetingStatus: (status: MeetingStatus) => void;
  addTopic: (topic: Topic) => void;
  updateTopic: (topic: Topic) => void;
  removeTopic: (id: string) => void;
  resetCurrentMeeting: () => void;
  startMeeting: () => void;
  endMeeting: () => void;
  isInitialized: boolean;
};

export const AppContext = createContext<AppContextType>({
  ...getInitialState(),
  addMember: () => {},
  updateMember: () => {},
  deleteMember: () => {},
  addMeeting: () => {},
  updateCurrentMeeting: () => {},
  setCurrentMeetingStatus: () => {},
  addTopic: () => {},
  updateTopic: () => {},
  removeTopic: () => {},
  resetCurrentMeeting: () => {},
  startMeeting: () => {},
  endMeeting: () => {},
  isInitialized: false,
});

const LOCAL_STORAGE_KEY = 'reunionStatsState';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, getInitialState());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        const migratedMembers = parsedState.members.map((member: Member) => ({
          ...member,
          topicPresenterCount: member.topicPresenterCount || 0,
        }));
        dispatch({ type: 'INITIALIZE_STATE', payload: { ...parsedState, members: migratedMembers } });
      } else {
        dispatch({ type: 'INITIALIZE_STATE', payload: { members: generateInitialMembers(), meetings: [] } });
      }
    } catch (error) {
      console.error("Failed to load state from localStorage, using initial state.", error);
      dispatch({ type: 'INITIALIZE_STATE', payload: { members: generateInitialMembers(), meetings: [] } });
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      // Don't persist currentMeeting state
      const { currentMeeting, ...stateToPersist } = state;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToPersist));
      } catch (error) {
        console.error("Failed to save state to localStorage", error);
      }
    }
  }, [state, isInitialized]);

  const startMeeting = useCallback(() => {
    const { presenterId, secretaryId, agenda, meetingDate, meetingTime } = state.currentMeeting;
    if (presenterId && secretaryId && agenda.length > 0 && meetingDate) {
      const [hours, minutes] = meetingTime.split(':').map(Number);
      const plannedDate = new Date(meetingDate);
      plannedDate.setHours(hours, minutes, 0, 0);

      dispatch({ type: 'UPDATE_CURRENT_MEETING', payload: {
          plannedStartTime: plannedDate,
          actualStartTime: new Date(),
          status: 'IN_PROGRESS',
      }});
    }
  }, [state.currentMeeting]);

  const endMeeting = useCallback(() => {
      const { presenterId, secretaryId, agenda, plannedStartTime, actualStartTime } = state.currentMeeting;
      if (!presenterId || !secretaryId || !plannedStartTime || !actualStartTime) return;

      const presenter = state.members.find(m => m.id === presenterId);
      const secretary = state.members.find(m => m.id === secretaryId);

      const newMeeting: Meeting = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        plannedStartTime: plannedStartTime.toISOString(),
        actualStartTime: actualStartTime.toISOString(),
        endTime: new Date().toISOString(),
        presenterId,
        secretaryId,
        agenda,
      };

      dispatch({ type: 'ADD_MEETING', payload: newMeeting });

      if (presenter) {
        dispatch({ type: 'UPDATE_MEMBER', payload: { ...presenter, presenterCount: presenter.presenterCount + 1 } });
      }
      if (secretary) {
        dispatch({ type: 'UPDATE_MEMBER', payload: { ...secretary, volunteerCount: secretary.volunteerCount + 1 } });
      }
      
      const topicCounts = agenda.reduce((acc, topic) => {
        acc[topic.presenterId] = (acc[topic.presenterId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      state.members.forEach(member => {
        if (topicCounts[member.id]) {
            const updatedMember = { ...member, topicPresenterCount: member.topicPresenterCount + topicCounts[member.id] };
            dispatch({ type: 'UPDATE_MEMBER', payload: updatedMember });
        }
      });
      
      const totalDuration = agenda.reduce((sum, topic) => sum + topic.actualDuration, 0);

      dispatch({ type: 'UPDATE_CURRENT_MEETING', payload: { 
          status: 'SUMMARY',
          lastMeetingSummary: { presenter, secretary, duration: totalDuration }
      }});

  }, [state.currentMeeting, state.members]);


  const contextValue = useMemo(() => ({
    ...state,
    addMember: (memberData: Omit<Member, 'id' | 'avatarUrl'>) => {
        const newId = String(Date.now());
        const newAvatarIndex = state.members.length % PlaceHolderImages.length;
        const newMember: Member = {
            ...memberData,
            id: newId,
            avatarUrl: PlaceHolderImages[newAvatarIndex].imageUrl,
        };
        dispatch({ type: 'ADD_MEMBER', payload: newMember });
    },
    updateMember: (member: Member) => dispatch({ type: 'UPDATE_MEMBER', payload: member }),
    deleteMember: (id: string) => dispatch({ type: 'DELETE_MEMBER', payload: id }),
    addMeeting: (meeting: Meeting) => dispatch({ type: 'ADD_MEETING', payload: meeting }),
    updateCurrentMeeting: (payload: Partial<CurrentMeetingState>) => dispatch({ type: 'UPDATE_CURRENT_MEETING', payload }),
    setCurrentMeetingStatus: (status: MeetingStatus) => dispatch({ type: 'SET_CURRENT_MEETING_STATUS', payload: status }),
    addTopic: (topic: Topic) => dispatch({ type: 'ADD_TOPIC', payload: topic }),
    updateTopic: (topic: Topic) => dispatch({ type: 'UPDATE_TOPIC', payload: topic }),
    removeTopic: (id: string) => dispatch({ type: 'REMOVE_TOPIC', payload: id }),
    resetCurrentMeeting: () => dispatch({ type: 'RESET_CURRENT_MEETING' }),
    startMeeting,
    endMeeting,
    isInitialized,
  }), [state, isInitialized, startMeeting, endMeeting]);
  
  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
