'use client';

import React, {
  createContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  useContext,
} from 'react';
import type { Member, Meeting, Topic, MeetingStatus } from '@/lib/types';
import { useFirebase, useUser, useMemoFirebase } from '@/firebase/provider';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { parseISO } from 'date-fns';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type AppState = {
  members: Member[];
  meetings: Meeting[]; // Completed meetings
  currentMeeting: Meeting | null;
  saveStatus: SaveStatus;
};

type AppContextType = AppState & {
  addMember: (member: Omit<Member, 'id' | 'presenterCount' | 'volunteerCount' | 'topicPresenterCount'>) => void;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => void;
  addTopic: (topic: Omit<Topic, 'id' | 'actualDuration' | 'status'>) => void;
  updateTopic: (topic: Topic) => void;
  removeTopic: (id: string) => void;
  resetCurrentMeeting: () => Promise<void>;
  startMeeting: () => void;
  endMeeting: () => void;
  clearHistory: () => Promise<void>;
  isInitialized: boolean;
  updateCurrentMeeting: (payload: Partial<Meeting>) => void;
  lastMeetingSummary: Meeting | null;
  isLoading: boolean;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { firestore } = useFirebase();
  const { isUserLoading } = useUser();

  // --- Data fetching ---
  const membersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'members') : null, [firestore]);
  const { data: membersFromDb, isLoading: membersLoading } = useCollection<Member>(membersCollection);

  const meetingsQuery = useMemoFirebase(() => firestore 
    ? query(collection(firestore, 'meetings'), orderBy('date', 'desc'))
    : null, 
  [firestore]);
  const { data: allMeetings, isLoading: meetingsLoading } = useCollection<Meeting>(meetingsQuery);

  // --- State ---
  const [members, setMembers] = useState<Member[]>([]);
  const [completedMeetings, setCompletedMeetings] = useState<Meeting[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [lastMeetingSummary, setLastMeetingSummary] = useState<Meeting | null>(null);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  const isLoading = isUserLoading || membersLoading || meetingsLoading || isCreatingMeeting;
  const isInitialized = !isLoading;

  // --- Effects to sync data from DB to state ---
  useEffect(() => {
    if (membersFromDb) {
      setMembers(membersFromDb);
    }
  }, [membersFromDb]);

  useEffect(() => {
    if (allMeetings) {
      const setupMeeting = allMeetings.find(m => m.status === 'SETUP');
      const completed = allMeetings.filter(m => m.status === 'COMPLETED' || m.status === 'IN_PROGRESS'); // show in progress in history too
      
      setCurrentMeeting(setupMeeting || null);
      setCompletedMeetings(completed);

      if(!setupMeeting && !isCreatingMeeting && isInitialized) {
        createNewMeeting();
      }

    } else if (isInitialized && !isCreatingMeeting) {
       createNewMeeting();
    }
  }, [allMeetings, isInitialized, isCreatingMeeting]);

  const createNewMeeting = useCallback(async () => {
    if (!firestore || isCreatingMeeting) return;
    setIsCreatingMeeting(true);
    setSaveStatus('saving');
    const newMeeting: Omit<Meeting, 'id'> = {
        date: new Date().toISOString(),
        status: 'SETUP',
        presenterId: null,
        secretaryId: null,
        agenda: [],
    };
    try {
        const meetingsCollectionRef = collection(firestore, 'meetings');
        await addDocumentNonBlocking(meetingsCollectionRef, newMeeting);
        setSaveStatus('saved');
    } catch(e) {
        console.error("Failed to create a new meeting", e);
        setSaveStatus('error');
    } finally {
       setIsCreatingMeeting(false);
    }
}, [firestore, isCreatingMeeting]);


  // --- Member mutations ---
  const addMember = useCallback((memberData: Omit<Member, 'id' | 'presenterCount' | 'volunteerCount' | 'topicPresenterCount'>) => {
    if (!firestore || !membersCollection) return;
    const newMember: Omit<Member, 'id'> = {
      ...memberData,
      presenterCount: 0,
      volunteerCount: 0,
      topicPresenterCount: 0,
    };
    addDocumentNonBlocking(membersCollection, newMember);
  }, [firestore, membersCollection]);

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


  // --- Current meeting mutations ---
  const updateCurrentMeetingState = useCallback((updatedMeeting: Meeting) => {
    if (!firestore) return;
    setSaveStatus('saving');
    const meetingRef = doc(firestore, 'meetings', updatedMeeting.id);
    const {id, ...meetingData} = updatedMeeting;
    setDocumentNonBlocking(meetingRef, meetingData, { merge: true })
      .then(() => setSaveStatus('saved'))
      .catch(() => setSaveStatus('error'));
  }, [firestore]);

  const updateCurrentMeeting = (payload: Partial<Meeting>) => {
    if (currentMeeting) {
        const updated = { ...currentMeeting, ...payload };
        setCurrentMeeting(updated); // Optimistic update
        updateCurrentMeetingState(updated);
    }
  };

  const addTopic = useCallback((topicData: Omit<Topic, 'id' | 'actualDuration' | 'status'>) => {
    if (!currentMeeting) return;
    const newTopic: Topic = {
      id: crypto.randomUUID(),
      ...topicData,
      actualDuration: 0,
      status: 'pending',
    };
    const updatedAgenda = [...currentMeeting.agenda, newTopic];
    updateCurrentMeeting({ agenda: updatedAgenda });
  }, [currentMeeting, updateCurrentMeeting]);

  const updateTopic = useCallback((topic: Topic) => {
    if (!currentMeeting) return;
    const updatedAgenda = currentMeeting.agenda.map((t) => (t.id === topic.id ? topic : t));
    updateCurrentMeeting({ agenda: updatedAgenda });
  }, [currentMeeting, updateCurrentMeeting]);

  const removeTopic = useCallback((id: string) => {
    if (!currentMeeting) return;
    const updatedAgenda = currentMeeting.agenda.filter((t) => t.id !== id);
    updateCurrentMeeting({ agenda: updatedAgenda });
  }, [currentMeeting, updateCurrentMeeting]);
  
  const resetCurrentMeeting = async () => {
    setLastMeetingSummary(null);
    setSaveStatus('idle');
    await createNewMeeting();
  };

  const startMeeting = useCallback(() => {
    if (currentMeeting) {
      const meetingDate = parseISO(currentMeeting.date);

      updateCurrentMeeting({
        plannedStartTime: meetingDate.toISOString(),
        actualStartTime: new Date().toISOString(),
        status: 'IN_PROGRESS',
      });
    }
  }, [currentMeeting, updateCurrentMeeting]);

  const endMeeting = useCallback(async () => {
    if (!firestore || !currentMeeting) return;
    const { presenterId, secretaryId, agenda } = currentMeeting;
    
    // Finalize meeting data
    const finalMeeting = {
      ...currentMeeting,
      status: 'COMPLETED' as MeetingStatus,
      endTime: new Date().toISOString(),
    };
    updateCurrentMeetingState(finalMeeting);
    setLastMeetingSummary(finalMeeting);
    setCurrentMeeting(null); // Clear current meeting so a new one can be created
    
    // Update member stats
    const presenter = members.find((m) => m.id === presenterId);
    const secretary = members.find((m) => m.id === secretaryId);

    if (presenter) {
        updateMember({ ...presenter, presenterCount: (presenter.presenterCount || 0) + 1 });
    }
    if (secretary) {
        updateMember({ ...secretary, volunteerCount: (secretary.volunteerCount || 0) + 1 });
    }

    const topicCounts = agenda.reduce((acc, topic) => {
        if (topic.presenterId) {
            acc[topic.presenterId] = (acc[topic.presenterId] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    members.forEach(member => {
        if (topicCounts[member.id]) {
            const updatedMember = { ...member, topicPresenterCount: (member.topicPresenterCount || 0) + topicCounts[member.id] };
            updateMember(updatedMember);
        }
    });

  }, [currentMeeting, members, firestore, updateCurrentMeetingState, updateMember]);
  
  const clearHistory = useCallback(async () => {
    if (!firestore || !completedMeetings) return;
    setSaveStatus('saving');
    try {
      const deletePromises = completedMeetings
        .filter(m => m.status === 'COMPLETED')
        .map(meeting => {
          const meetingRef = doc(firestore, 'meetings', meeting.id);
          return deleteDocumentNonBlocking(meetingRef);
        });
      await Promise.all(deletePromises);
      setSaveStatus('saved');
    } catch (e) {
      console.error("Failed to clear history", e);
      setSaveStatus('error');
    }
  }, [firestore, completedMeetings]);


  const contextValue = useMemo(
    () => ({
      members,
      meetings: completedMeetings,
      currentMeeting,
      lastMeetingSummary,
      addMember,
      updateMember,
      deleteMember,
      addTopic,
      updateTopic,
      removeTopic,
      resetCurrentMeeting,
      startMeeting,
      endMeeting,
      clearHistory,
      isInitialized,
      isLoading,
      updateCurrentMeeting,
      saveStatus,
    }),
    [
        members, 
        completedMeetings, 
        currentMeeting, 
        lastMeetingSummary,
        addMember, 
        updateMember, 
        deleteMember, 
        addTopic, 
        updateTopic, 
        removeTopic, 
        resetCurrentMeeting, 
        startMeeting, 
        endMeeting,
        clearHistory, 
        isInitialized,
        isLoading, 
        updateCurrentMeeting,
        saveStatus
    ]
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
