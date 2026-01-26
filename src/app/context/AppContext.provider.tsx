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
import type { Member, Meeting, Topic, MeetingStatus, AttendanceRecord, SurveyCriterion, SurveyResult } from '@/lib/types';
import { useFirebase, useUser, useMemoFirebase } from '@/firebase/provider';
import { collection, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { parseISO } from 'date-fns';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type AppState = {
  members: Member[];
  meetings: Meeting[]; // Completed meetings
  currentMeeting: Meeting | null;
  surveyCriteria: SurveyCriterion[];
  saveStatus: SaveStatus;
};

type AppContextType = AppState & {
  addMember: (member: Omit<Member, 'id' | 'presenterCount' | 'volunteerCount' | 'topicPresenterCount'>) => void;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => void;
  addTopic: (topic: Omit<Topic, 'id' | 'actualDuration' | 'status'>) => void;
  updateTopic: (id: string, partialTopic: Partial<Topic>) => void;
  removeTopic: (id: string) => void;
  resetCurrentMeeting: () => Promise<void>;
  startMeeting: () => void;
  endMeeting: () => void;
  completeSurvey: (surveyResults: SurveyResult[]) => void;
  clearHistory: () => Promise<void>;
  deleteMeeting: (id: string) => void;
  isInitialized: boolean;
  updateCurrentMeeting: (payload: Partial<Meeting>) => void;
  lastMeetingSummary: Meeting | null;
  isLoading: boolean;
  updateCriteria: (criteria: SurveyCriterion[]) => Promise<void>;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

const initialCriteria: Omit<SurveyCriterion, 'id'>[] = [
    { name: "Venir preparado", weight: 20 },
    { name: "Sustitutos preparados", weight: 10 },
    { name: "Tiempo y puntualidad", weight: 20 },
    { name: "Abandono de la reunión", weight: 15 },
    { name: "Sin móviles u ordenadores", weight: 15 },
    { name: "Silencio = acuerdo", weight: 5 },
    { name: "Acciones / Parking Lot / Follow-up", weight: 10 },
    { name: "Sala ordenada al salir", weight: 5 },
];


export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  // --- Data fetching ---
  const membersCollection = useMemoFirebase(() => 
    firestore && !isUserLoading ? collection(firestore, 'members') : null, 
  [firestore, isUserLoading]);
  const { data: membersFromDb, isLoading: membersLoading } = useCollection<Member>(membersCollection);

  const meetingsQuery = useMemoFirebase(() => 
    firestore && !isUserLoading
      ? query(collection(firestore, 'meetings'), orderBy('date', 'desc'))
      : null, 
  [firestore, isUserLoading]);
  const { data: allMeetings, isLoading: meetingsLoading } = useCollection<Meeting>(meetingsQuery);

  const criteriaCollection = useMemoFirebase(() => 
    firestore && !isUserLoading ? collection(firestore, 'surveyCriteria') : null, 
  [firestore, isUserLoading]);
  const { data: criteriaFromDb, isLoading: criteriaLoading } = useCollection<SurveyCriterion>(criteriaCollection);


  // --- State ---
  const [members, setMembers] = useState<Member[]>([]);
  const [completedMeetings, setCompletedMeetings] = useState<Meeting[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [surveyCriteria, setSurveyCriteria] = useState<SurveyCriterion[]>([]);
  const [lastMeetingSummary, setLastMeetingSummary] = useState<Meeting | null>(null);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  const isLoading = isUserLoading || membersLoading || meetingsLoading || criteriaLoading || isCreatingMeeting;
  const isInitialized = !isLoading;

  const lastCompletedMeeting = useMemo(() => {
    if (!allMeetings) return null;
    return allMeetings.find(m => m.status === 'COMPLETED') || null;
  }, [allMeetings]);

  const suggestedPresenterId = useMemo(() => lastCompletedMeeting?.secretaryId, [lastCompletedMeeting]);

  // --- Effects to sync data from DB to state ---
  useEffect(() => {
    if (membersFromDb) {
      setMembers(membersFromDb);
    }
  }, [membersFromDb]);
  
  useEffect(() => {
    if (criteriaFromDb) {
        if (criteriaFromDb.length > 0) {
            setSurveyCriteria(criteriaFromDb.sort((a, b) => a.name.localeCompare(b.name)));
        } else if (firestore && criteriaCollection && !criteriaLoading && criteriaFromDb.length === 0) {
            // If criteria is empty in DB, populate with initial data
            const batch = writeBatch(firestore);
            initialCriteria.forEach(criterion => {
                const docRef = doc(criteriaCollection);
                batch.set(docRef, criterion);
            });
            batch.commit().catch(e => console.error("Failed to set initial criteria", e));
        }
    }
  }, [criteriaFromDb, criteriaLoading, firestore, criteriaCollection]);


  useEffect(() => {
    if (allMeetings && user) {
      const activeMeeting = allMeetings.find(m => m.status === 'SETUP' || m.status === 'IN_PROGRESS' || m.status === 'SURVEY');
      const completed = allMeetings.filter(m => m.status === 'COMPLETED');
      
      if (activeMeeting) {
        // Ensure attendance is initialized for any new members
        const currentMemberIds = new Set(activeMeeting.attendance?.map(a => a.memberId) || []);
        if (members.length > 0 && currentMemberIds.size !== members.length) {
            const newAttendance: AttendanceRecord[] = members.map(member => {
                const existingRecord = activeMeeting.attendance?.find(a => a.memberId === member.id);
                return existingRecord || { memberId: member.id, status: 'present', location: 'physical' };
            });
             const updatedMeeting = {...activeMeeting, attendance: newAttendance};
            setCurrentMeeting(updatedMeeting);
        } else {
            setCurrentMeeting(activeMeeting);
        }
      } else {
        setCurrentMeeting(null);
      }
      
      setCompletedMeetings(completed);

      if(!activeMeeting && !isCreatingMeeting && isInitialized && members.length > 0) {
        createNewMeeting();
      }

    } else if (isInitialized && !isCreatingMeeting && members.length > 0 && user) {
       createNewMeeting();
    }
  }, [allMeetings, isInitialized, isCreatingMeeting, members, user]);

  const createNewMeeting = useCallback(async () => {
    if (!firestore || isCreatingMeeting) return;
    setIsCreatingMeeting(true);
    setSaveStatus('saving');

    const initialAttendance: AttendanceRecord[] = members.map(member => ({
        memberId: member.id,
        status: 'present',
        location: 'physical'
    }));

    const meetingPresenterId = suggestedPresenterId || null;
    const defaultAgenda: Topic[] = [];
    if (meetingPresenterId) {
        defaultAgenda.push({
            id: crypto.randomUUID(),
            title: "Revisión de acciones reunión anterior",
            description: "Repasar las tareas y acciones pendientes de la última reunión.",
            estimatedDuration: 5,
            presenterId: meetingPresenterId,
            actualDuration: 0,
            status: 'pending',
        });
    }

    const newMeeting: Omit<Meeting, 'id'> = {
        date: new Date().toISOString(),
        status: 'SETUP',
        presenterId: meetingPresenterId,
        secretaryId: null,
        agenda: defaultAgenda,
        attendance: initialAttendance,
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
}, [firestore, isCreatingMeeting, members, suggestedPresenterId]);


  // --- Member mutations ---
  const addMember = useCallback((memberData: Omit<Member, 'id' | 'presenterCount' | 'volunteerCount' | 'topicPresenterCount' | 'avatarUrl'>) => {
    if (!firestore || !membersCollection) return;
    const newMember: Omit<Member, 'id'> = {
      ...memberData,
      avatarUrl: '',
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

        // If presenter is being set (and wasn't before), and the default topic isn't there, add it.
        if (payload.presenterId && !currentMeeting.presenterId && !updated.agenda.some(t => t.title === 'Revisión de acciones reunión anterior')) {
            const defaultTopic: Topic = {
                id: crypto.randomUUID(),
                title: 'Revisión de acciones reunión anterior',
                description: 'Repasar las tareas y acciones pendientes de la última reunión.',
                estimatedDuration: 5,
                presenterId: payload.presenterId,
                actualDuration: 0,
                status: 'pending',
            };
            // Add it to the beginning of the agenda
            updated.agenda = [defaultTopic, ...updated.agenda];
        }
        
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

  const updateTopic = useCallback((id: string, partialTopic: Partial<Topic>) => {
    if (!currentMeeting) return;
    // Don't create a new object for the whole agenda if not needed.
    // This was causing the "re-opening" issue.
    const topicIndex = currentMeeting.agenda.findIndex(t => t.id === id);
    if (topicIndex === -1) return;

    const newAgenda = [...currentMeeting.agenda];
    newAgenda[topicIndex] = { ...newAgenda[topicIndex], ...partialTopic };
    
    updateCurrentMeeting({ agenda: newAgenda });
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
  
  const endMeeting = useCallback(() => {
    if (currentMeeting) {
      updateCurrentMeeting({ status: 'SURVEY' });
    }
  }, [currentMeeting, updateCurrentMeeting]);


  const completeSurvey = useCallback(async (surveyResults: SurveyResult[]) => {
    if (!firestore || !currentMeeting) return;
    const { presenterId, secretaryId, agenda } = currentMeeting;
    
    // Finalize meeting data
    const finalMeeting = {
      ...currentMeeting,
      status: 'COMPLETED' as MeetingStatus,
      endTime: new Date().toISOString(),
      surveyResults,
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
    if (!firestore || !completedMeetings || !members) return;
    setSaveStatus('saving');
    try {
      const batch = writeBatch(firestore);

      // Delete all completed meetings
      completedMeetings
        .filter(m => m.status === 'COMPLETED')
        .forEach(meeting => {
          const meetingRef = doc(firestore, 'meetings', meeting.id);
          batch.delete(meetingRef);
        });
      
      // Reset stats for all members
      members.forEach(member => {
        const memberRef = doc(firestore, 'members', member.id);
        batch.update(memberRef, {
          presenterCount: 0,
          volunteerCount: 0,
          topicPresenterCount: 0
        });
      });
      
      await batch.commit();
      setSaveStatus('saved');
    } catch (e) {
      console.error("Failed to clear history", e);
      setSaveStatus('error');
    }
  }, [firestore, completedMeetings, members]);

  const deleteMeeting = useCallback((id: string) => {
    if (!firestore) return Promise.reject(new Error("Firestore not initialized"));
    setSaveStatus('saving');
    const meetingRef = doc(firestore, 'meetings', id);
    return deleteDocumentNonBlocking(meetingRef)
      .then(() => {
        setSaveStatus('saved');
      })
      .catch((e) => {
        setSaveStatus('error');
        // The non-blocking update will emit the permission error,
        // so we don't need to re-throw, but we should update local status.
      });
  }, [firestore]);

  const updateCriteria = useCallback(async (criteria: SurveyCriterion[]) => {
    if (!firestore) throw new Error("Firestore not initialized");

    const batch = writeBatch(firestore);
    const existingIds = new Set(criteriaFromDb?.map(c => c.id));
    
    criteria.forEach(criterion => {
      let docRef;
      if (criterion.id && existingIds.has(criterion.id)) {
        docRef = doc(firestore, 'surveyCriteria', criterion.id);
        const { id, ...data } = criterion;
        batch.update(docRef, data);
        existingIds.delete(id);
      } else {
        docRef = doc(collection(firestore, 'surveyCriteria'));
        const { id, ...data } = criterion;
        batch.set(docRef, data);
      }
    });

    existingIds.forEach(idToDelete => {
      const docRef = doc(firestore, 'surveyCriteria', idToDelete);
      batch.delete(docRef);
    });
    
    setSaveStatus('saving');
    try {
      await batch.commit();
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
      console.error("Failed to update criteria", e);
      throw e;
    }
  }, [firestore, criteriaFromDb]);


  const contextValue = useMemo(
    () => ({
      members,
      meetings: completedMeetings,
      currentMeeting,
      surveyCriteria,
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
      completeSurvey,
      clearHistory,
      deleteMeeting,
      isInitialized,
      isLoading,
      updateCurrentMeeting,
      saveStatus,
      updateCriteria,
    }),
    [
        members, 
        completedMeetings, 
        currentMeeting,
        surveyCriteria,
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
        completeSurvey,
        clearHistory, 
        deleteMeeting,
        isInitialized,
        isLoading, 
        updateCurrentMeeting,
        saveStatus,
        updateCriteria
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
