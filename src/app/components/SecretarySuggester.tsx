"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Sparkles, UserCheck } from 'lucide-react';
import { suggestNextSecretary } from '@/ai/flows/suggest-next-secretary';
import type { Member } from '@/lib/types';

interface SecretarySuggesterProps {
  members: Member[];
  presenterId: string | null;
  onSelectSecretary: (id: string) => void;
}

export function SecretarySuggester({ members, presenterId, onSelectSecretary }: SecretarySuggesterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{ suggestedSecretary: string; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    if (!presenterId) return;
    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    const eligibleMembers = members.filter(m => m.id !== presenterId);

    const input = {
      members: eligibleMembers.map(m => ({
        name: m.name,
        presenterCount: m.presenterCount,
        volunteerCount: m.volunteerCount,
      })),
    };

    try {
      const result = await suggestNextSecretary(input);
      setSuggestion(result);
    } catch (e) {
      console.error(e);
      setError('Hubo un error al obtener la sugerencia. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
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
        <Sparkles className="mr-2 h-4 w-4" /> Sugerir secretario con IA
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles /> Sugerencia de Secretario</DialogTitle>
            <DialogDescription>
              La IA sugiere al próximo secretario basándose en un algoritmo de equidad para equilibrar la participación.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center">
            {isLoading && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Analizando participación...</p>
              </div>
            )}
            {error && <p className="text-destructive">{error}</p>}
            {suggestion && (
              <div className="space-y-4">
                <p className="text-lg">El secretario sugerido es:</p>
                <p className="text-3xl font-bold text-primary">{suggestion.suggestedSecretary}</p>
                <p className="text-muted-foreground italic">"{suggestion.reason}"</p>
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
