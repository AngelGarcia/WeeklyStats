"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Sparkles, UserCheck, Shuffle, User, Presentation } from 'lucide-react';
import type { Member, AttendanceRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RoleSuggesterProps {
  role: 'presenter' | 'secretary';
  members: Member[];
  attendance: AttendanceRecord[] | undefined;
  onSelect: (id: string) => void;
  excludeId?: string | null;
  disabled?: boolean;
}

export function RoleSuggester({ role, members, attendance, onSelect, excludeId, disabled }: RoleSuggesterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);

  // For animation
  const [rouletteName, setRouletteName] = useState<string | null>(null);
  const rouletteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const title = role === 'presenter' ? 'Sorteo de Presentador' : 'Sorteo de Secretario';
  const buttonText = role === 'presenter' ? 'Sortear Presentador' : 'Sortear Secretario';
  const Icon = role === 'presenter' ? Presentation : User;
  
  const stopRoulette = () => {
    if (rouletteIntervalRef.current) {
        clearInterval(rouletteIntervalRef.current);
        rouletteIntervalRef.current = null;
    }
  };

  const handleSuggest = () => {
    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    const presentMemberIds = new Set(attendance?.filter(a => a.status === 'present').map(a => a.memberId));
    
    let eligibleMembers = members.filter(m => presentMemberIds.has(m.id));

    if (excludeId) {
        eligibleMembers = eligibleMembers.filter(m => m.id !== excludeId);
    }
    
    if (eligibleMembers.length === 0) {
      setError('No hay miembros elegibles presentes para este rol.');
      setIsLoading(false);
      return;
    }

    // --- Roulette Animation ---
    let rouletteIndex = 0;
    rouletteIntervalRef.current = setInterval(() => {
        setRouletteName(eligibleMembers[rouletteIndex % eligibleMembers.length].name);
        rouletteIndex++;
    }, 75);


    setTimeout(() => {
      stopRoulette();

      const membersWithScore = eligibleMembers.map(m => ({
        ...m,
        score: (m.presenterCount || 0) + (m.volunteerCount || 0)
      }));

      const minScore = Math.min(...membersWithScore.map(m => m.score));
      const maxScore = Math.max(...membersWithScore.map(m => m.score));

      const weightedPool: Member[] = [];
      membersWithScore.forEach(member => {
        // Higher score = lower weight. A max score of 0 is treated as 1 to avoid division by zero.
        const weight = (maxScore - member.score + 1);
        const entries = Math.ceil(Math.max(1, weight));
        for (let i = 0; i < entries; i++) {
          weightedPool.push(member);
        }
      });
      
      const randomIndex = Math.floor(Math.random() * weightedPool.length);
      const suggestedMember = weightedPool[randomIndex];
      
      setSuggestion(suggestedMember);
      setRouletteName(null);
      setIsLoading(false);
    }, 2000); // Animation duration
  };

  useEffect(() => {
    // Cleanup interval on unmount
    return () => stopRoulette();
  }, []);


  const handleAcceptSuggestion = () => {
    if (suggestion) {
      onSelect(suggestion.id);
      setIsOpen(false);
    }
  };
  
  const handleOpen = () => {
    setIsOpen(true);
    handleSuggest();
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen} disabled={disabled} className="w-auto px-2.5">
        <Shuffle className="h-4 w-4" />
        <span className="sr-only">{buttonText}</span>
      </Button>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          stopRoulette();
        }
        setIsOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shuffle /> {title}</DialogTitle>
            <DialogDescription>
              Sorteo ponderado para sugerir al próximo rol, dando más oportunidades a quienes menos han participado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center h-40 flex flex-col justify-center items-center">
            {isLoading || rouletteName ? (
              <div className="flex flex-col items-center gap-4">
                 <p className="text-3xl font-bold text-primary h-10">{rouletteName}</p>
                 <p className="text-muted-foreground">Realizando sorteo...</p>
              </div>
            ) : error ? (
                <p className="text-destructive">{error}</p>
            ) : suggestion ? (
              <div className="space-y-4">
                <p className="text-lg">El rol sugerido es para:</p>
                <p className="text-3xl font-bold text-primary">{suggestion.name}</p>
                 <p className="text-muted-foreground italic text-sm">
                    Puntuación de participación: { (suggestion.presenterCount || 0) + (suggestion.volunteerCount || 0) }
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleAcceptSuggestion} disabled={!suggestion}>
              <UserCheck className="mr-2" /> Aceptar Sugerencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
