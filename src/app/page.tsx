"use client";

import React, { useState, useMemo, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AppContext } from '@/app/context/AppContext';
import type { Member, Topic, MeetingStatus } from '@/lib/types';
import { AgendaItem } from '@/app/components/AgendaItem';
import { SecretarySuggester } from '@/app/components/SecretarySuggester';
import { PlusCircle, Users, ClipboardList, BarChart, History, Play, Check, Trash2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function MeetingDashboardPage() {
  const context = useContext(AppContext);

  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus>('SETUP');
  const [presenterId, setPresenterId] = useState<string | null>(null);
  const [secretaryId, setSecretaryId] = useState<string | null>(null);
  const [agenda, setAgenda] = useState<Topic[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDuration, setNewTopicDuration] = useState(5);
  const [lastMeetingSummary, setLastMeetingSummary] = useState<{ presenter: Member | undefined, secretary: Member | undefined, duration: number } | null>(null);

  const { members, meetings, addMeeting, updateMember, isInitialized } = context;

  const lastMeeting = useMemo(() => meetings.length > 0 ? meetings[meetings.length - 1] : null, [meetings]);

  const suggestedPresenterId = useMemo(() => lastMeeting?.secretaryId, [lastMeeting]);

  if (!isInitialized) {
    return <div className="flex justify-center items-center h-full"><p>Cargando datos de la aplicación...</p></div>;
  }

  const handleStartMeeting = () => {
    if (presenterId && secretaryId) {
      setMeetingStatus('IN_PROGRESS');
    }
  };

  const handleAddTopic = () => {
    if (newTopicTitle.trim() !== '') {
      const newTopic: Topic = {
        id: crypto.randomUUID(),
        title: newTopicTitle,
        estimatedDuration: newTopicDuration,
        actualDuration: 0,
        status: 'pending',
      };
      setAgenda([...agenda, newTopic]);
      setNewTopicTitle('');
    }
  };
  
  const handleRemoveTopic = (id: string) => {
    setAgenda(agenda.filter(topic => topic.id !== id));
  };

  const handleUpdateTopic = (updatedTopic: Topic) => {
    setAgenda(agenda.map(topic => topic.id === updatedTopic.id ? updatedTopic : topic));
  };

  const handleEndMeeting = () => {
    if (!presenterId || !secretaryId) return;

    const presenter = members.find(m => m.id === presenterId);
    const secretary = members.find(m => m.id === secretaryId);

    const totalDuration = agenda.reduce((sum, topic) => sum + topic.actualDuration, 0);

    const newMeeting = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      presenterId,
      secretaryId,
      agenda,
    };

    addMeeting(newMeeting);

    if (presenter) {
      updateMember({ ...presenter, presenterCount: presenter.presenterCount + 1 });
    }
    if (secretary) {
      updateMember({ ...secretary, volunteerCount: secretary.volunteerCount + 1 });
    }

    setLastMeetingSummary({ presenter, secretary, duration: totalDuration });
    setMeetingStatus('SUMMARY');
  };

  const handlePlanNext = () => {
    setAgenda([]);
    setPresenterId(null);
    setSecretaryId(null);
    setLastMeetingSummary(null);
    setMeetingStatus('SETUP');
  };
  
  const presenter = members.find(m => m.id === presenterId);
  const secretary = members.find(m => m.id === secretaryId);
  
  const availableMembers = members.filter(m => m.id !== presenterId);

  const renderSetup = () => (
    <Card className="max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2"><Users /> Configurar Reunión</CardTitle>
        <CardDescription>Selecciona el presentador y secretario para la nueva reunión.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="presenter">Presentador</Label>
            <Select onValueChange={setPresenterId} defaultValue={suggestedPresenterId || undefined}>
              <SelectTrigger id="presenter"><SelectValue placeholder="Seleccionar presentador..." /></SelectTrigger>
              <SelectContent>
                {members.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} {member.id === suggestedPresenterId && '(Sugerido)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">El presentador de esta semana suele ser el secretario de la anterior.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secretary">Secretario</Label>
             <Select onValueChange={setSecretaryId} value={secretaryId || undefined} disabled={!presenterId}>
                <SelectTrigger id="secretary">
                  <SelectValue placeholder={!presenterId ? "Primero elige presentador" : "Seleccionar secretario..."} />
                </SelectTrigger>
                <SelectContent>
                    {availableMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                            {member.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Elige un voluntario o usa la IA para una selección justa.</p>
          </div>
        </div>
        <SecretarySuggester
          members={members}
          presenterId={presenterId}
          onSelectSecretary={setSecretaryId}
        />
      </CardContent>
      <CardFooter>
        <Button onClick={handleStartMeeting} disabled={!presenterId || !secretaryId} className="w-full md:w-auto ml-auto">
          <Play className="mr-2" /> Iniciar Reunión
        </Button>
      </CardFooter>
    </Card>
  );

  const renderInProgress = () => (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl">Reunión en Progreso</CardTitle>
            <CardDescription>Hoy: {format(new Date(), 'PPP')}</CardDescription>
          </div>
          <div className="text-right">
             <p><span className="font-semibold">Presentador:</span> {presenter?.name}</p>
             <p><span className="font-semibold">Secretario:</span> {secretary?.name}</p>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><ClipboardList /> Agenda de la Reunión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-grow">
              <Label htmlFor="topic-title">Nuevo Tema</Label>
              <Input id="topic-title" placeholder="Título del tema..." value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="topic-duration">Duración (min)</Label>
              <Input id="topic-duration" type="number" value={newTopicDuration} onChange={e => setNewTopicDuration(Number(e.target.value))} className="w-24" />
            </div>
            <Button onClick={handleAddTopic}><PlusCircle className="mr-2" /> Añadir</Button>
          </div>
          <Separator />
          <div className="space-y-2">
            {agenda.length === 0 && <p className="text-muted-foreground text-center py-4">Aún no hay temas en la agenda.</p>}
            {agenda.map(topic => (
              <AgendaItem key={topic.id} topic={topic} onUpdate={handleUpdateTopic} onRemove={handleRemoveTopic} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="destructive" onClick={handleEndMeeting} disabled={agenda.length === 0}>
          <Check className="mr-2" /> Finalizar Reunión
        </Button>
      </div>
    </div>
  );
  
  const renderSummary = () => (
    <Card className="max-w-3xl mx-auto shadow-lg text-center">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center justify-center gap-2"><BarChart /> Resumen de la Reunión</CardTitle>
        <CardDescription>Reunión finalizada el {format(new Date(), 'PPP, p')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>¡Gran trabajo, equipo!</p>
        <div className="grid grid-cols-2 gap-4 text-left">
            <p><span className="font-semibold">Presentador:</span> {lastMeetingSummary?.presenter?.name}</p>
            <p><span className="font-semibold">Secretario:</span> {lastMeetingSummary?.secretary?.name}</p>
        </div>
        <p>Duración total: <span className="font-bold">{Math.floor((lastMeetingSummary?.duration || 0) / 60)} minutos</span></p>
        <Separator />
        <p className="text-muted-foreground">La reunión ha sido guardada en el historial.</p>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button onClick={handlePlanNext} className="w-full">
            Planificar Siguiente Reunión <ArrowRight className="ml-2" />
        </Button>
        <Button variant="outline" asChild className="w-full">
            <a href="/history">Ver Historial de Reuniones <History className="ml-2" /></a>
        </Button>
      </CardFooter>
    </Card>
  );

  switch (meetingStatus) {
    case 'SETUP': return renderSetup();
    case 'IN_PROGRESS': return renderInProgress();
    case 'SUMMARY': return renderSummary();
    default: return null;
  }
}
