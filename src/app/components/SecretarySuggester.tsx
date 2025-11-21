"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Sparkles, UserCheck, Shuffle } from 'lucide-react';
import type { Member, AttendanceRecord } from '@/lib/types';

interface SecretarySuggesterProps {
  members: Member[];
  presenterId: string | null;
  attendance: AttendanceRecord[] | undefined;
  onSelectSecretary: (id: string) => void;
}

export function SecretarySuggester({ members, presenterId, attendance, onSelectSecretary }: SecretarySuggesterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{ suggestedSecretary: string; reason: string; } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = () => {
    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    // Simulate a brief loading period for better UX
    setTimeout(() => {
      if (!presenterId || !attendance) {
        setError('No se pueden obtener los datos de la reunión para sugerir un secretario.');
        setIsLoading(false);
        return;
      }
      
      const presentMemberIds = new Set(attendance.filter(a => a.status === 'present').map(a => a.memberId));

      const eligibleMembers = members.filter(m => 
        m.id !== presenterId && presentMemberIds.has(m.id)
      );
      
      if (eligibleMembers.length === 0) {
        setError('No hay miembros elegibles presentes para ser secretario.');
        setIsLoading(false);
        return;
      }

      // Calculate participation score
      const membersWithScore = eligibleMembers.map(m => ({
        ...m,
        score: (m.presenterCount || 0) + (m.volunteerCount || 0)
      }));

      // Find the minimum score
      const minScore = Math.min(...membersWithScore.map(m => m.score));

      // Create a weighted pool of candidates. Members with the lowest score get more "entries".
      const weightedPool: Member[] = [];
      membersWithScore.forEach(member => {
        const weight = (minScore / (member.score || 1)) * 10; // Give more weight to lower scores
        const entries = Math.ceil(Math.max(1, weight)); // Everyone gets at least one entry
        for (let i = 0; i < entries; i++) {
          weightedPool.push(member);
        }
      });
      
      // Select a random member from the weighted pool
      const randomIndex = Math.floor(Math.random() * weightedPool.length);
      const suggestedMember = weightedPool[randomIndex];
      
      const reason = `Sorteo ponderado. Se priorizan los miembros con menor participación. La puntuación de ${suggestedMember.name} es ${suggestedMember.score}.`;

      setSuggestion({
        suggestedSecretary: suggestedMember.name,
        reason: reason,
      });

      setIsLoading(false);
    }, 500); // 500ms delay
  };

  const handleAcceptSuggestion = () => {
    if (suggestion) {
      const suggestedMember = members.find(m => m.name === suggestion.suggestedSecretary);
      if (suggestedMember) {
        onSelectSecretary(suggestedMember.id);
      }
      setIsOpen(false);
    }
  };
  
  const handleOpen = () => {
    setIsOpen(true);
    handleSuggest();
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen} disabled={!presenterId} className="w-full">
        <Shuffle className="mr-2 h-4 w-4" /> Sortear secretario
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shuffle /> Sorteo de Secretario</DialogTitle>
            <DialogDescription>
              Sorteo ponderado para sugerir al próximo secretario, dando más oportunidades a quienes menos han participado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center">
            {isLoading && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Realizando sorteo...</p>
              </div>
            )}
            {error && <p className="text-destructive">{error}</p>}
            {suggestion && (
              <div className="space-y-4">
                <p className="text-lg">El secretario sugerido es:</p>
                <p className="text-3xl font-bold text-primary">{suggestion.suggestedSecretary}</p>
                <p className="text-muted-foreground italic text-sm">"{suggestion.reason}"</p>
              </div>
            )}
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
