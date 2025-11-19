"use client";

import React, { createContext, useReducer, useEffect, useState, ReactNode, useMemo } from 'react';
import type { Member, Meeting, Topic } from '@/lib/types';
import { initialMemberNames } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type AppState = {
  members: Member[];
  meetings: Meeting[];
};

type Action =
  | { type: 'INITIALIZE_STATE'; payload: AppState }
  | { type: 'ADD_MEMBER'; payload: Member }
  | { type: 'UPDATE_MEMBER'; payload: Member }
  | { type: 'DELETE_MEMBER'; payload: string }
  | { type: 'ADD_MEETING'; payload: Meeting };

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

const initialState: AppState = {
  members: [],
  meetings: [],
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'INITIALIZE_STATE':
      return action.payload.members.length > 0 ? action.payload : { ...action.payload, members: generateInitialMembers() };
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
    default:
      return state;
  }
};

type AppContextType = AppState & {
  addMember: (member: Omit<Member, 'id' | 'avatarUrl'>) => void;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => void;
  addMeeting: (meeting: Meeting) => void;
  isInitialized: boolean;
};

export const AppContext = createContext<AppContextType>({
  ...initialState,
  addMember: () => {},
  updateMember: () => {},
  deleteMember: () => {},
  addMeeting: () => {},
  isInitialized: false,
});

const LOCAL_STORAGE_KEY = 'reunionStatsState';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedState) {
        // Ensure new fields are present
        const parsedState = JSON.parse(storedState);
        const migratedMembers = parsedState.members.map((member: Member) => ({
          ...member,
          topicPresenterCount: member.topicPresenterCount || 0,
        }));
        dispatch({ type: 'INITIALIZE_STATE', payload: { ...parsedState, members: migratedMembers } });
      } else {
        // If no stored state, generate initial members
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
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error("Failed to save state to localStorage", error);
      }
    }
  }, [state, isInitialized]);

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
    isInitialized,
  }), [state, isInitialized]);
  
  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
