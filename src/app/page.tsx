"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAppContext } from '@/app/context/AppContext';
import type { Topic, Member } from '@/lib/types';
import { AgendaItem } from '@/app/components/AgendaItem';
import { SecretarySuggester } from '@/app/components/SecretarySuggester';
import { PlusCircle, Users, ClipboardList, BarChart, History, Play, Check, Trash2, ArrowRight, Calendar as CalendarIcon, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';


export default function MeetingDashboardPage() {
  const {
    members,
    meetings,
    currentMeeting,
    updateCurrentMeeting,
    addTopic,
    removeTopic,
    updateTopic,
    resetCurrentMeeting,
    startMeeting,
    endMeeting,
    isInitialized,
    lastMeetingSummary,
    isLoading,
    saveStatus
  } = useAppContext();

  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDuration, setNewTopicDuration] = useState(5);
  const [newTopicPresenterId, setNewTopicPresenterId] = useState<string | undefined>();
  
  const lastCompletedMeeting = useMemo(() => {
    const completed = meetings
      .filter(m => m.status === 'COMPLETED')
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    return completed.length > 0 ? completed[0] : null;
  }, [meetings]);

  const suggestedPresenterId = useMemo(() => lastCompletedMeeting?.secretaryId, [lastCompletedMeeting]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  const availableMembers = useMemo(() => {
    return sortedMembers.filter(m => m.id !== currentMeeting?.presenterId);
  }, [sortedMembers, currentMeeting?.presenterId]);

  if (!isInitialized || isLoading || !currentMeeting) {
    return <div className="flex justify-center items-center h-full"><p>Cargando datos de la reunión...</p></div>;
  }
  
  const {
    status: meetingStatus,
    presenterId,
    secretaryId,
    agenda,
    date,
    plannedStartTime,
    actualStartTime,
  } = currentMeeting;

  const meetingDate = date ? parseISO(date) : new Date();
  const meetingTime = date ? format(parseISO(date), 'HH:mm') : '00:00';

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTopicTitle.trim() !== '' && newTopicPresenterId) {
      const newTopic: Omit<Topic, 'id' | 'actualDuration' | 'status'> = {
        title: newTopicTitle,
        estimatedDuration: newTopicDuration,
        presenterId: newTopicPresenterId,
      };
      addTopic(newTopic);
      setNewTopicTitle('');
      setNewTopicPresenterId(undefined);
    }
  };

  const handlePlanNext = () => {
    resetCurrentMeeting();
  };

  const handleDateChange = (newDate: Date | undefined) => {
    if (!newDate) return;
    const oldDate = parseISO(date);
    newDate.setHours(oldDate.getHours());
    newDate.setMinutes(oldDate.getMinutes());
    updateCurrentMeeting({ date: newDate.toISOString() });
  }

  const handleTimeChange = (newTime: string) => {
    const oldDate = parseISO(date);
    const [hours, minutes] = newTime.split(':').map(Number);
    oldDate.setHours(hours, minutes);
    updateCurrentMeeting({ date: oldDate.toISOString() });
  }
  
  const presenter = members.find(m => m.id === presenterId);
  const secretary = members.find(m => m.id === secretaryId);
  
  const SaveStatusIndicator = () => {
    switch (saveStatus) {
      case 'saving':
        return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin w-4 h-4" />Guardando...</div>;
      case 'saved':
        return <div className="flex items-center gap-2 text-sm text-green-600"><Check className="w-4 h-4" />Guardado</div>;
      case 'error':
        return <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="w-4 h-4" />Error al guardar</div>;
      default:
        return null;
    }
  };

  const renderSetup = () => (
    <Card className="max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2"><Users /> Configurar Reunión</CardTitle>
        <CardDescription>Define los detalles y la agenda para la nueva reunión.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Fecha y Hora</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !meetingDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {meetingDate ? format(meetingDate, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={meetingDate}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-[120px]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="presenter">Presentador</Label>
            <Select onValueChange={(id) => updateCurrentMeeting({ presenterId: id })} defaultValue={suggestedPresenterId || undefined} value={presenterId || undefined}>
              <SelectTrigger id="presenter"><SelectValue placeholder="Seleccionar presentador..." /></SelectTrigger>
              <SelectContent>
                {sortedMembers.map(member => (
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
             <Select onValueChange={(id) => updateCurrentMeeting({ secretaryId: id })} value={secretaryId || undefined} disabled={!presenterId}>
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
          onSelectSecretary={(id) => updateCurrentMeeting({ secretaryId: id })}
        />
        <Separator />
        <div>
          <Label className="text-lg font-medium">Agenda</Label>
           <form onSubmit={handleAddTopic} className="flex flex-col sm:flex-row items-end gap-2 mt-2">
            <div className="flex-grow w-full">
              <Label htmlFor="topic-title" className="sr-only">Nuevo Tema</Label>
              <Input id="topic-title" placeholder="Título del tema..." value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} />
            </div>
             <div className='w-full sm:w-auto'>
                <Label htmlFor="topic-presenter" className="sr-only">Presentador del tema</Label>
                 <Select value={newTopicPresenterId} onValueChange={setNewTopicPresenterId}>
                    <SelectTrigger id="topic-presenter">
                        <SelectValue placeholder="Encargado..." />
                    </SelectTrigger>
                    <SelectContent>
                        {sortedMembers.map(member => (
                            <SelectItem key={member.id} value={member.id}>
                                {member.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>
            <div className="w-full sm:w-24">
              <Label htmlFor="topic-duration" className="sr-only">Duración (min)</Label>
              <Input id="topic-duration" type="number" value={newTopicDuration} onChange={e => setNewTopicDuration(Number(e.target.value))} />
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={!newTopicTitle || !newTopicPresenterId}><PlusCircle className="mr-2" /> Añadir</Button>
          </form>
          <div className="space-y-2 mt-4">
            {agenda.length === 0 && <p className="text-muted-foreground text-center py-4">Aún no hay temas en la agenda.</p>}
            {agenda.map(topic => {
              const topicPresenter = members.find(m => m.id === topic.presenterId);
              return (
              <div key={topic.id} className="flex items-center gap-2 p-2 rounded-md border">
                  <div className="flex items-center gap-2 flex-1">
                    {topicPresenter ? (
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={topicPresenter.avatarUrl} alt={topicPresenter.name} />
                            <AvatarFallback>{topicPresenter.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    ) : <UserIcon className="w-6 h-6 text-muted-foreground" />}
                    <span className="flex-1">{topic.title}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">({topic.estimatedDuration} min)</span>
                   <Button size="icon" variant="ghost" onClick={() => removeTopic(topic.id)} className="text-muted-foreground hover:text-destructive">
                       <Trash2 className="h-4 w-4" />
                   </Button>
              </div>
            )})}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between items-center">
        <SaveStatusIndicator />
        <Button onClick={startMeeting} disabled={!presenterId || !secretaryId || agenda.length === 0} className="w-full md:w-auto">
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
            <CardDescription>
                {plannedStartTime && (
                    <span>
                        Inicio planificado: {format(parseISO(plannedStartTime), 'HH:mm')}h. 
                        Inicio real: {actualStartTime && format(parseISO(actualStartTime), 'HH:mm')}h.
                    </span>
                )}
            </CardDescription>
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
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            {agenda.length === 0 && <p className="text-muted-foreground text-center py-4">Aún no hay temas en la agenda.</p>}
            {agenda.map(topic => (
              <AgendaItem key={topic.id} topic={topic} onUpdate={updateTopic} onRemove={removeTopic} members={members} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="default" onClick={endMeeting} disabled={agenda.some(t => t.status !== 'completed')}>
          <Check className="mr-2" /> Finalizar Reunión
        </Button>
      </div>
    </div>
  );
  
  const renderSummary = () => {
    if (!lastMeetingSummary) return null;
    const summaryPresenter = members.find(m => m.id === lastMeetingSummary.presenterId);
    const summarySecretary = members.find(m => m.id === lastMeetingSummary.secretaryId);
    const totalDuration = lastMeetingSummary.agenda.reduce((sum, topic) => sum + topic.actualDuration, 0);

    return (
        <Card className="max-w-3xl mx-auto shadow-lg text-center">
        <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center justify-center gap-2"><BarChart /> Resumen de la Reunión</CardTitle>
            <CardDescription>Reunión finalizada el {lastMeetingSummary.endTime ? format(parseISO(lastMeetingSummary.endTime), 'PPP, p', {locale: es}) : ''}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <p>¡Gran trabajo, equipo!</p>
            <div className="grid grid-cols-2 gap-4 text-left">
                <p><span className="font-semibold">Presentador:</span> {summaryPresenter?.name}</p>
                <p><span className="font-semibold">Secretario:</span> {summarySecretary?.name}</p>
            </div>
            <p>Duración total: <span className="font-bold">{Math.floor(totalDuration / 60)} minutos</span></p>
            <Separator />
            <p className="text-muted-foreground">La reunión ha sido guardada en el historial.</p>
        </CardContent>
        <CardFooter className="flex-col gap-4">
            <Button onClick={handlePlanNext} className="w-full">
                Planificar Siguiente Reunión <ArrowRight className="ml-2" />
            </Button>
            <Button variant="outline" asChild className="w-full">
                <Link href="/history">Ver Historial de Reuniones <History className="ml-2" /></Link>
            </Button>
        </CardFooter>
        </Card>
    );
  }

  const meetingView = () => {
    if(lastMeetingSummary) return renderSummary();
    switch (meetingStatus) {
        case 'SETUP': return renderSetup();
        case 'IN_PROGRESS': return renderInProgress();
        case 'COMPLETED': return renderSummary();
        default: return <p>Cargando reunión...</p>;
      }
  }

  return (
    <main className="p-4 md:p-6 lg:p-8">
      {meetingView()}
    </main>
  );
}
