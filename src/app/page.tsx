"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAppContext } from '@/app/context/AppContext';
import type { Topic, Member, AttendanceRecord, SurveyResult } from '@/lib/types';
import { AgendaItem } from '@/app/components/AgendaItem';
import { RoleSuggester } from '@/app/components/RoleSuggester';
import { PlusCircle, Users, ClipboardList, BarChart, History, Play, Check, Trash2, ArrowRight, Calendar as CalendarIcon, User as UserIcon, Loader2, AlertCircle, Laptop, Building, Star, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


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
    completeSurvey,
    isInitialized,
    lastMeetingSummary,
    isLoading,
    saveStatus,
    surveyCriteria
  } = useAppContext();

  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [newTopicDuration, setNewTopicDuration] = useState(5);
  const [newTopicPresenterId, setNewTopicPresenterId] = useState<string | undefined>();
  const [surveyScores, setSurveyScores] = useState<Record<string, 0 | 1 | 2>>({});

  const lastCompletedMeeting = useMemo(() => {
    if (!meetings) return null;
    const completed = meetings
      .filter(m => m.status === 'COMPLETED')
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    return completed.length > 0 ? completed[0] : null;
  }, [meetings]);

  const suggestedPresenterId = useMemo(() => lastCompletedMeeting?.secretaryId, [lastCompletedMeeting]);

  useEffect(() => {
    if (currentMeeting?.status === 'SETUP' && !currentMeeting.presenterId && suggestedPresenterId) {
      updateCurrentMeeting({ presenterId: suggestedPresenterId });
    }
  }, [currentMeeting?.status, currentMeeting?.presenterId, suggestedPresenterId, updateCurrentMeeting]);


  const sortedMembers = useMemo(() => {
    if (!members) return [];
    return [...members].sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  const availableMembersForSecretary = useMemo(() => {
    if (!currentMeeting?.presenterId || !sortedMembers) return [];
    return sortedMembers.filter(m => m.id !== currentMeeting.presenterId);
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
    attendance
  } = currentMeeting;

  const meetingDate = date ? parseISO(date) : new Date();
  const meetingTime = date ? format(parseISO(date), 'HH:mm') : '00:00';

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTopicTitle.trim() !== '' && newTopicPresenterId) {
      const newTopic: Omit<Topic, 'id' | 'actualDuration' | 'status'> = {
        title: newTopicTitle,
        description: newTopicDescription,
        estimatedDuration: newTopicDuration,
        presenterId: newTopicPresenterId,
      };
      addTopic(newTopic);
      setNewTopicTitle('');
      setNewTopicDescription('');
      setNewTopicPresenterId(undefined);
      setNewTopicDuration(5);
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

  const handleAttendanceChange = (memberId: string, status: 'present' | 'absent', location?: 'physical' | 'online') => {
    const newAttendance = currentMeeting.attendance?.map(record => {
        if (record.memberId === memberId) {
            const newRecord: Partial<AttendanceRecord> & {memberId: string} = { memberId: record.memberId, status };
            if (status === 'present') {
              newRecord.location = location || 'physical';
            }
            return newRecord as AttendanceRecord;
        }
        return record;
    }) || [];
    updateCurrentMeeting({ attendance: newAttendance });
  };

  const handleSurveySubmit = () => {
    const surveyResults: SurveyResult[] = Object.entries(surveyScores).map(([criterionId, score]) => ({
      criterionId,
      score
    }));
    completeSurvey(surveyResults);
  };
  
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
    <Card className="max-w-6xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2"><Users /> Configurar Reunión</CardTitle>
        <CardDescription>Define los detalles, la agenda y la asistencia para la nueva reunión.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-3 space-y-6">
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

          <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="presenter">Presentador</Label>
                <div className="flex gap-2">
                  <Select onValueChange={(id) => updateCurrentMeeting({ presenterId: id, secretaryId: null })} value={presenterId || ''}>
                    <SelectTrigger id="presenter"><SelectValue placeholder="Seleccionar presentador..." /></SelectTrigger>
                    <SelectContent>
                      {sortedMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} {member.id === suggestedPresenterId && '(Sugerido)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <RoleSuggester
                    role="presenter"
                    members={members}
                    attendance={attendance}
                    onSelect={(id) => updateCurrentMeeting({ presenterId: id, secretaryId: null })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">El presentador de esta semana suele ser el secretario de la anterior.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secretary">Secretario</Label>
                <div className="flex gap-2">
                  <Select onValueChange={(id) => updateCurrentMeeting({ secretaryId: id })} value={secretaryId || ''} disabled={!presenterId}>
                      <SelectTrigger id="secretary">
                        <SelectValue placeholder={!presenterId ? "Primero elige presentador" : "Seleccionar secretario..."} />
                      </SelectTrigger>
                      <SelectContent>
                          {availableMembersForSecretary.map(member => (
                              <SelectItem key={member.id} value={member.id}>
                                  {member.name}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <RoleSuggester
                      role="secretary"
                      members={members}
                      attendance={attendance}
                      excludeId={presenterId}
                      onSelect={(id) => updateCurrentMeeting({ secretaryId: id })}
                      disabled={!presenterId}
                    />
                </div>
                <p className="text-xs text-muted-foreground">Elige un voluntario o usa el sorteo para una selección justa.</p>
              </div>
          </div>
          
          <Separator />
          
          {/* Agenda Section */}
          <div>
            <Label className="text-lg font-medium">Agenda</Label>
            <form onSubmit={handleAddTopic} className="space-y-3 mt-2 border p-4 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="topic-title">Título del Tema</Label>
                <Input id="topic-title" placeholder="Ej: Revisión de métricas de ventas" value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="topic-description">Resumen / Descripción (Opcional)</Label>
                <Textarea id="topic-description" placeholder="Añade un breve resumen sobre el tema..." value={newTopicDescription} onChange={e => setNewTopicDescription(e.target.value)} rows={2} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className='space-y-1'>
                    <Label htmlFor="topic-presenter">Encargado</Label>
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
                <div className="space-y-1">
                  <Label htmlFor="topic-duration">Duración (min)</Label>
                  <Input id="topic-duration" type="number" value={newTopicDuration} onChange={e => setNewTopicDuration(Number(e.target.value))} />
                </div>
              </div>
              <Button type="submit" className="w-full sm:w-auto" disabled={!newTopicTitle || !newTopicPresenterId}><PlusCircle className="mr-2" /> Añadir Tema</Button>
            </form>
            <div className="space-y-2 mt-4">
              {agenda.length === 0 && <p className="text-muted-foreground text-center py-4">Aún no hay temas en la agenda.</p>}
              {agenda.map(topic => {
                const topicPresenter = members.find(m => m.id === topic.presenterId);
                return (
                <div key={topic.id} className="flex items-start gap-2 p-3 rounded-md border">
                    <div className="flex-shrink-0 pt-1">
                      {topicPresenter ? (
                          <Avatar className="h-6 w-6">
                              <AvatarImage src={topicPresenter.avatarUrl} alt={topicPresenter.name} />
                              <AvatarFallback>{topicPresenter.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                      ) : <UserIcon className="w-6 h-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold">{topic.title}</p>
                      {topic.description && <p className="text-sm text-muted-foreground">{topic.description}</p>}
                      <p className="text-xs text-muted-foreground">{topicPresenter?.name} - {topic.estimatedDuration} min</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeTopic(topic.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              )})}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-3">
            <Label className="text-lg font-medium">Asistencia</Label>
            <div className="space-y-3 mt-2">
                {sortedMembers.map(member => {
                    const memberAttendance = attendance?.find(a => a.memberId === member.id);
                    const isAbsent = memberAttendance?.status === 'absent';
                    const isOnline = !isAbsent && memberAttendance?.location === 'online';

                    return (
                        <div 
                            key={member.id} 
                            className={cn(
                                "flex flex-col sm:flex-row items-center justify-between gap-x-4 gap-y-2 p-3 border rounded-md transition-colors",
                                isAbsent && "bg-muted/50"
                            )}
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <Avatar className={cn("transition-opacity", isAbsent && "opacity-50")}>
                                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className={cn("font-medium", isAbsent && "text-muted-foreground")}>{member.name}</span>
                            </div>
                            <div className="flex items-center gap-x-4 gap-y-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`absent-${member.id}`}
                                        checked={isAbsent}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                handleAttendanceChange(member.id, 'absent');
                                            } else {
                                                handleAttendanceChange(member.id, 'present', 'physical');
                                            }
                                        }}
                                    />
                                    <Label htmlFor={`absent-${member.id}`} className="font-normal cursor-pointer text-muted-foreground">Ausente</Label>
                                </div>

                                <div className={cn("flex items-center gap-3", isAbsent && "invisible")}>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Building className="h-5 w-5" />
                                        <span className="text-sm font-normal">Físico</span>
                                    </div>
                                    <Switch
                                        id={`location-${member.id}`}
                                        checked={isOnline}
                                        onCheckedChange={(checked) => {
                                            handleAttendanceChange(member.id, 'present', checked ? 'online' : 'physical');
                                        }}
                                        disabled={isAbsent}
                                        aria-label="Cambiar entre asistencia física y online"
                                    />
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Laptop className="h-5 w-5" />
                                        <span className="text-sm font-normal">Online</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

      </CardContent>
      <CardFooter className="justify-between items-center pt-6">
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
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="add-topic">
              <AccordionTrigger>
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <PlusCircle className="h-4 w-4" />
                    Añadir tema sobre la marcha
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <form onSubmit={handleAddTopic} className="space-y-3 border p-4 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <Label htmlFor="topic-title-inprogress">Título del Tema</Label>
                    <Input id="topic-title-inprogress" placeholder="Ej: Nuevo Proyecto X" value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="topic-description-inprogress">Resumen / Descripción (Opcional)</Label>
                    <Textarea id="topic-description-inprogress" placeholder="Añade un breve resumen sobre el tema..." value={newTopicDescription} onChange={e => setNewTopicDescription(e.target.value)} rows={2} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className='space-y-1'>
                        <Label htmlFor="topic-presenter-inprogress">Encargado</Label>
                        <Select value={newTopicPresenterId} onValueChange={setNewTopicPresenterId}>
                            <SelectTrigger id="topic-presenter-inprogress">
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
                    <div className="space-y-1">
                      <Label htmlFor="topic-duration-inprogress">Duración (min)</Label>
                      <Input id="topic-duration-inprogress" type="number" value={newTopicDuration} onChange={e => setNewTopicDuration(Number(e.target.value))} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full sm:w-auto" disabled={!newTopicTitle || !newTopicPresenterId}><PlusCircle className="mr-2" /> Añadir Tema</Button>
                </form>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="default" onClick={endMeeting} disabled={agenda.some(t => t.status !== 'completed')}>
          <Check className="mr-2" /> Finalizar Reunión
        </Button>
      </div>
    </div>
  );
  
  const renderSurvey = () => (
    <Card className="max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2"><Star /> Cuestionario de Eficiencia</CardTitle>
        <CardDescription>Puntúa la reunión del 0 (mal) al 2 (excelente) en los siguientes criterios.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {surveyCriteria.map(criterion => (
          <div key={criterion.id} className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor={`slider-${criterion.id}`}>{criterion.name}</Label>
              <span className="font-bold w-12 text-center text-lg">{surveyScores[criterion.id] ?? 0}</span>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                id={`slider-${criterion.id}`}
                min={0}
                max={2}
                step={1}
                value={[surveyScores[criterion.id] ?? 0]}
                onValueChange={([value]) => setSurveyScores(prev => ({ ...prev, [criterion.id]: value as 0 | 1 | 2 }))}
              />
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleSurveySubmit}>
          Finalizar y Ver Resumen <ArrowRight className="ml-2" />
        </Button>
      </CardFooter>
    </Card>
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
        case 'SURVEY': return renderSurvey();
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
