'use client';

import React, {
  createContext,
  useReducer,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  useContext,
} from 'react';
import type { Member, Meeting, Topic, CurrentMeetingState, MeetingStatus } from '@/lib/types';
import { initialMemberNames } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirebase, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { 
  addDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  setDocumentNonBlocking 
} from '@/firebase/non-blocking-updates';


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
  | { type: 'SET_MEMBERS'; payload: Member[] }
  | { type: 'SET_MEETINGS'; payload: Meeting[] }
  | { type: 'UPDATE_CURRENT_MEETING'; payload: Partial<CurrentMeetingState> }
  | { type: 'SET_CURRENT_MEETING_STATUS'; payload: MeetingStatus }
  | { type: 'ADD_TOPIC'; payload: Topic }
  | { type: 'UPDATE_TOPIC'; payload: Topic }
  | { type: 'REMOVE_TOPIC'; payload: string }
  | { type: 'RESET_CURRENT_MEETING' };

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_MEMBERS':
      return { ...state, members: action.payload };
    case 'SET_MEETINGS':
      return { ...state, meetings: action.payload };
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
        currentMeeting: {
          ...state.currentMeeting,
          agenda: [...state.currentMeeting.agenda, action.payload],
        },
      };
    case 'UPDATE_TOPIC':
      return {
        ...state,
        currentMeeting: {
          ...state.currentMeeting,
          agenda: state.currentMeeting.agenda.map((t) => (t.id === action.payload.id ? action.payload : t)),
        },
      };
    case 'REMOVE_TOPIC':
      return {
        ...state,
        currentMeeting: {
          ...state.currentMeeting,
          agenda: state.currentMeeting.agenda.filter((t) => t.id !== action.payload),
        },
      };
    case 'RESET_CURRENT_MEETING':
      const now = new Date();
      return {
        ...state,
        currentMeeting: {
          ...initialCurrentMeetingState,
          meetingDate: now,
          meetingTime: `${now.getHours().toString().padStart(2, '0')}:${now
            .getHours()
            .toString()
            .padStart(2, '0')}`,
        },
      };
    default:
      return state;
  }
};

type AppContextType = AppState & {
  addMember: (member: Omit<Member, 'id' | 'avatarUrl' | 'presenterCount' | 'volunteerCount' | 'topicPresenterCount'>) => void;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => void;
  addTopic: (topic: Omit<Topic, 'id' | 'actualDuration' | 'status'>) => void;
  updateTopic: (topic: Topic) => void;
  removeTopic: (id: string) => void;
  resetCurrentMeeting: () => void;
  startMeeting: () => void;
  endMeeting: () => void;
  isInitialized: boolean;
  updateCurrentMeeting: (payload: Partial<CurrentMeetingState>) => void;
  setCurrentMeetingStatus: (status: MeetingStatus) => void;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { firestore, auth } = useFirebase();
  const { user, isUserLoading } = useUser();

  const membersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'members') : null, [firestore]);
  const meetingsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'meetings') : null, [firestore]);

  const { data: membersFromDb, isLoading: membersLoading } = useCollection<Member>(membersCollection);
  const { data: meetingsFromDb, isLoading: meetingsLoading } = useCollection<Meeting>(meetingsCollection);

  const getInitialState = (): AppState => ({
    members: membersFromDb || [],
    meetings: meetingsFromDb || [],
    currentMeeting: {
      ...initialCurrentMeetingState,
      meetingDate: new Date(),
      meetingTime: getInitialTime(),
    },
  });

  const [state, dispatch] = useReducer(appReducer, getInitialState());
  const isInitialized = !isUserLoading && !membersLoading && !meetingsLoading;

  useEffect(() => {
    if (membersFromDb) {
      dispatch({ type: 'SET_MEMBERS', payload: membersFromDb });
    }
  }, [membersFromDb]);

  useEffect(() => {
    if (meetingsFromDb) {
      dispatch({ type: 'SET_MEETINGS', payload: meetingsFromDb });
    }
  }, [meetingsFromDb]);

  const addMember = useCallback((memberData: Omit<Member, 'id' | 'avatarUrl' | 'presenterCount' | 'volunteerCount' | 'topicPresenterCount'>) => {
    if (!firestore || !membersCollection) return;
    const currentMembers = membersFromDb || [];
    const newAvatarIndex = currentMembers.length % PlaceHolderImages.length;
    const newMember: Omit<Member, 'id'> = {
      ...memberData,
      avatarUrl: PlaceHolderImages[newAvatarIndex].imageUrl,
      presenterCount: 0,
      volunteerCount: 0,
      topicPresenterCount: 0,
    };
    addDocumentNonBlocking(membersCollection, newMember);
  }, [firestore, membersCollection, membersFromDb]);

  const updateMember = useCallback((member: Member) => {
    if (!firestore) return;
    const { id, ...memberData } = member;
    const memberRef = doc(firestore, 'members', id);
    setDocumentNonBlocking(memberRef, memberData, { merge: true });
  }, [firestore]);

  const deleteMember = useCallback((id: string) => {
    if (!firestore) return;
    const memberRef = doc(firestore, 'members', id);
    deleteDocumentNonBlocking(memberRef);
  }, [firestore]);

  const addTopic = useCallback((topicData: Omit<Topic, 'id' | 'actualDuration' | 'status'>) => {
    const newTopic: Topic = {
      id: crypto.randomUUID(),
      ...topicData,
      actualDuration: 0,
      status: 'pending',
    };
    dispatch({ type: 'ADD_TOPIC', payload: newTopic });
  }, []);

  const updateTopic = useCallback((topic: Topic) => {
    dispatch({ type: 'UPDATE_TOPIC', payload: topic });
  }, []);

  const removeTopic = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOPIC', payload: id });
  }, []);

  const updateCurrentMeeting = (payload: Partial<CurrentMeetingState>) => {
    dispatch({ type: 'UPDATE_CURRENT_MEETING', payload });
  };

  const setCurrentMeetingStatus = (status: MeetingStatus) => {
    dispatch({ type: 'SET_CURRENT_MEETING_STATUS', payload: status });
  };
  
  const resetCurrentMeeting = () => {
    dispatch({ type: 'RESET_CURRENT_MEETING' });
  };

  const startMeeting = useCallback(() => {
    const { presenterId, secretaryId, agenda, meetingDate, meetingTime } = state.currentMeeting;
    if (presenterId && secretaryId && agenda.length > 0 && meetingDate) {
      const [hours, minutes] = meetingTime.split(':').map(Number);
      const plannedDate = new Date(meetingDate);
      plannedDate.setHours(hours, minutes, 0, 0);

      dispatch({
        type: 'UPDATE_CURRENT_MEETING',
        payload: {
          plannedStartTime: plannedDate,
          actualStartTime: new Date(),
          status: 'IN_PROGRESS',
        },
      });
    }
  }, [state.currentMeeting]);

  const endMeeting = useCallback(async () => {
    if (!firestore || !meetingsCollection) return;
    const { presenterId, secretaryId, agenda, plannedStartTime, actualStartTime } = state.currentMeeting;
    if (!presenterId || !secretaryId || !plannedStartTime || !actualStartTime) return;

    const presenter = state.members.find((m) => m.id === presenterId);
    const secretary = state.members.find((m) => m.id === secretaryId);

    const newMeeting: Omit<Meeting, 'id'> = {
      date: new Date().toISOString(),
      plannedStartTime: plannedStartTime.toISOString(),
      actualStartTime: actualStartTime.toISOString(),
      endTime: new Date().toISOString(),
      presenterId,
      secretaryId,
      agenda,
    };

    addDocumentNonBlocking(meetingsCollection, newMeeting);

    if (presenter) {
        updateMember({ ...presenter, presenterCount: presenter.presenterCount + 1 });
    }
    if (secretary) {
        updateMember({ ...secretary, volunteerCount: secretary.volunteerCount + 1 });
    }

    const topicCounts = agenda.reduce((acc, topic) => {
        acc[topic.presenterId] = (acc[topic.presenterId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    state.members.forEach(member => {
        if (topicCounts[member.id]) {
            const updatedMember = { ...member, topicPresenterCount: (member.topicPresenterCount || 0) + topicCounts[member.id] };
            updateMember(updatedMember);
        }
    });

    const totalDuration = agenda.reduce((sum, topic) => sum + topic.actualDuration, 0);

    dispatch({
      type: 'UPDATE_CURRENT_MEETING',
      payload: {
        status: 'SUMMARY',
        lastMeetingSummary: { presenter, secretary, duration: totalDuration },
      },
    });
  }, [state.currentMeeting, state.members, firestore, meetingsCollection, updateMember]);

  const contextValue = useMemo(
    () => ({
      ...state,
      addMember,
      updateMember,
      deleteMember,
      addTopic,
      updateTopic,
      removeTopic,
      resetCurrentMeeting,
      startMeeting,
      endMeeting,
      isInitialized,
      updateCurrentMeeting,
      setCurrentMeetingStatus,
    }),
    [state, addMember, updateMember, deleteMember, addTopic, updateTopic, removeTopic, resetCurrentMeeting, startMeeting, endMeeting, isInitialized]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
      throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
