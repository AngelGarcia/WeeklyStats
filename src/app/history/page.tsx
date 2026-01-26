"use client";
import React, { useMemo } from 'react';
import { useAppContext } from '@/app/context/AppContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User, Mic, AlertCircle, Sparkles, Trash2, Users, Home, Building, Star, TrendingUp, TrendingDown, Pencil } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AttendanceRecord, Meeting, SurveyResult } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';


export default function HistoryPage() {
  const { meetings, members, isInitialized, clearHistory, deleteMeeting, reopenMeeting, currentMeeting, surveyCriteria } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();

  const sortedMeetings = useMemo(() => {
    if (!meetings) return [];
    return [...meetings].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [meetings]);

  if (!isInitialized) {
    return <div className="flex justify-center items-center h-full"><p>Cargando historial...</p></div>;
  }
  
  const getPunctuality = (meeting: Meeting) => {
      if (!meeting.plannedStartTime || !meeting.actualStartTime) {
          return { text: "N/A", color: "text-muted-foreground", iconColor: "text-muted-foreground" };
      }
      const planned = parseISO(meeting.plannedStartTime);
      const actual = parseISO(meeting.actualStartTime);
      const diffMinutes = (actual.getTime() - planned.getTime()) / (1000 * 60);

      if (diffMinutes < -1) {
          return { text: `Adelanto de ${Math.abs(Math.round(diffMinutes))} min`, color: "text-blue-600", iconColor: "text-blue-500" };
      }
      if (diffMinutes <= 1) { // A small grace period for "on time"
          return { text: "Puntual", color: "text-green-600", iconColor: "text-green-500" };
      }
      if (diffMinutes <= 5) {
          return { text: `Retraso de ${Math.round(diffMinutes)} min`, color: "text-yellow-600", iconColor: "text-yellow-500" };
      }
      return { text: `Retraso de ${Math.round(diffMinutes)} min`, color: "text-red-600", iconColor: "text-red-600" };
  };
  
    const getAttendanceDetails = (attendance: AttendanceRecord[] | undefined) => {
        if (!attendance || attendance.length === 0) {
            return { presentCount: 0, totalCount: 0, percentage: 0, physicalCount: 0, onlineCount: 0 };
        }

        const presentMembers = attendance.filter(a => a.status === 'present');
        const presentCount = presentMembers.length;
        const totalCount = attendance.length;
        const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
        const physicalCount = presentMembers.filter(a => a.location === 'physical').length;
        const onlineCount = presentMembers.filter(a => a.location === 'online').length;

        return { presentCount, totalCount, percentage, physicalCount, onlineCount };
    };

  const calculateEfficiencyScore = (surveyResults: SurveyResult[] | undefined) => {
    if (!surveyResults || !surveyCriteria || surveyCriteria.length === 0) return 0;
    
    let totalScore = 0;
    let totalWeight = 0;

    surveyResults.forEach(result => {
      const criterion = surveyCriteria.find(c => c.id === result.criterionId);
      if (criterion) {
        // Normalize score from 0-2 to 0-100 scale, then apply weight
        totalScore += (result.score / 2) * criterion.weight;
        totalWeight += criterion.weight;
      }
    });

    if (totalWeight === 0) return 0;

    // Adjust score to be out of 100
    const finalScore = (totalScore / totalWeight) * 100;
    return Math.round(finalScore);
  };
  
  const isMeetingInProgress = currentMeeting && (currentMeeting.status === 'IN_PROGRESS' || currentMeeting.status === 'SURVEY');

  const handleEditClick = async (meetingId: string) => {
    if (isMeetingInProgress) {
        toast({
            variant: "destructive",
            title: "Acción no permitida",
            description: "No puedes editar una reunión del historial mientras otra está en progreso.",
        });
        return;
    }
    try {
        await reopenMeeting(meetingId);
        toast({
            title: "Modo Edición",
            description: "La reunión ha sido cargada para su edición.",
        });
        router.push('/');
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo abrir la reunión para editar. Por favor, inténtalo de nuevo.",
        });
    }
  };


  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-headline font-bold">Historial de Reuniones</h1>
            {sortedMeetings.length > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Limpiar Historial
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminarán permanentemente todas las reuniones completadas del historial.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={clearHistory}>Sí, eliminar todo</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
        {sortedMeetings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No hay reuniones en el historial. ¡Completa tu primera reunión para verla aquí!
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {sortedMeetings.map(meeting => {
              const presenter = members.find(m => m.id === meeting.presenterId);
              const secretary = members.find(m => m.id === meeting.secretaryId);
              
              let totalDuration;
              if (meeting.endTime && meeting.actualStartTime) {
                  const end = parseISO(meeting.endTime);
                  const start = parseISO(meeting.actualStartTime);
                  totalDuration = Math.round((end.getTime() - start.getTime()) / 1000);
              } else {
                  totalDuration = meeting.agenda.reduce((acc, topic) => acc + topic.actualDuration, 0);
              }
              
              const punctuality = getPunctuality(meeting);
              const efficiencyScore = calculateEfficiencyScore(meeting.surveyResults);
              const attendanceDetails = getAttendanceDetails(meeting.attendance);

              return (
                <AccordionItem value={meeting.id} key={meeting.id} asChild>
                    <Card className="relative overflow-hidden">
                        <div className="absolute top-2 right-2 flex items-center" onClick={(e) => e.stopPropagation()}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="inline-flex"> {/* div wrapper for disabled button tooltip */}
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); handleEditClick(meeting.id); }} disabled={isMeetingInProgress}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TooltipTrigger>
                                    {isMeetingInProgress && (
                                        <TooltipContent>
                                            <p>Finaliza la reunión activa para poder editar.</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar esta reunión?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Se eliminará permanentemente la reunión del <strong>{format(parseISO(meeting.date), "d 'de' MMMM", { locale: es })}</strong>.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMeeting(meeting.id)}>Sí, eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        <AccordionTrigger className="w-full p-6 text-left hover:no-underline">
                             <div className="flex items-start w-full pr-8">
                                <div className="flex-1">
                                    <CardTitle className="font-headline">{format(parseISO(meeting.date), "d 'de' MMMM, yyyy", { locale: es })}</CardTitle>
                                    <CardDescription className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1 pt-1 text-xs">
                                        <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> 
                                        <span>
                                            {meeting.actualStartTime ? format(parseISO(meeting.actualStartTime), 'HH:mm') : ''}h - {meeting.endTime ? format(parseISO(meeting.endTime), 'HH:mm')+'h' : ''}
                                            ({formatTime(totalDuration)})
                                        </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            <span>
                                                {attendanceDetails.presentCount}/{attendanceDetails.totalCount} Asist. ({attendanceDetails.percentage}%)
                                            </span>
                                        </div>
                                        {efficiencyScore > 0 && (
                                            <div className="flex items-center gap-2 font-semibold">
                                                <Star className="w-4 h-4 text-yellow-500" /> 
                                                <span>Efic. {efficiencyScore}%</span>
                                            </div>
                                        )}
                                    </CardDescription>
                                </div>
                                <div className="pl-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className={`flex items-center gap-1 text-xs font-semibold ${punctuality.color}`}>
                                                    <AlertCircle className={`w-4 h-4 ${punctuality.iconColor}`} />
                                                    <span>{punctuality.text}</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                            {meeting.plannedStartTime && meeting.actualStartTime && (
                                                <>
                                                <p>Planificado: {format(parseISO(meeting.plannedStartTime), 'HH:mm')}h</p>
                                                <p>Real: {format(parseISO(meeting.actualStartTime), 'HH:mm')}h</p>
                                                </>
                                            )}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="pt-0 space-y-4">
                                <div className="flex items-center gap-4">
                                    <User className="w-5 h-5 text-muted-foreground" />
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={presenter?.avatarUrl} />
                                            <AvatarFallback>{presenter?.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">{presenter?.name || 'N/A'}</p>
                                            <p className="text-xs text-muted-foreground">Presentador</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Mic className="w-5 h-5 text-muted-foreground" />
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={secretary?.avatarUrl} />
                                            <AvatarFallback>{secretary?.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">{secretary?.name || 'N/A'}</p>
                                            <p className="text-xs text-muted-foreground">Secretario</p>
                                        </div>
                                    </div>
                                </div>
                                {efficiencyScore > 0 && (
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-sm font-semibold"><Star className="w-4 h-4"/> Puntuación de Eficiencia</Label>
                                        <div className="flex items-center gap-2">
                                            <Progress value={efficiencyScore} />
                                            <span className="font-bold text-lg">{efficiencyScore}%</span>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <Accordion type="single" collapsible className="w-full -mx-1">
                                        <AccordionItem value="asistencia">
                                            <AccordionTrigger className="text-sm font-semibold px-1">
                                                Detalle de Asistencia
                                            </AccordionTrigger>
                                            <AccordionContent className="text-xs text-muted-foreground space-y-2">
                                                <ScrollArea className="h-32">
                                                    <div className="space-y-2 pr-4">
                                                    {(meeting.attendance || []).map(record => {
                                                        const member = members.find(m => m.id === record.memberId);
                                                        if (!member) return null;
                                                        return (
                                                            <div key={record.memberId} className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="h-6 w-6">
                                                                        <AvatarImage src={member.avatarUrl} />
                                                                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                                                    </Avatar>
                                                                    <span>{member.name}</span>
                                                                </div>
                                                                {record.status === 'present' ? (
                                                                    <Badge variant="secondary" className="flex items-center gap-1">
                                                                        {record.location === 'physical' ? <Building className="h-3 w-3"/> : <Home className="h-3 w-3"/>}
                                                                        {record.location === 'physical' ? 'Oficina' : 'Casa'}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline">Ausente</Badge>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    </div>
                                                </ScrollArea>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="temas">
                                            <AccordionTrigger className="text-sm font-semibold px-1">Temas y Resúmenes</AccordionTrigger>
                                            <AccordionContent>
                                                <ScrollArea className="h-40">
                                                <Accordion type="single" collapsible className="w-full">
                                                        {meeting.agenda.map(topic => (
                                                            <AccordionItem value={topic.id} key={topic.id}>
                                                                <AccordionTrigger className="text-sm py-2">
                                                                <div className="flex justify-between w-full pr-2">
                                                                    <span className="truncate flex-1 text-left">{topic.title}</span>
                                                                    <span className="text-muted-foreground ml-2">
                                                                    {formatTime(topic.actualDuration)} / {topic.estimatedDuration} min
                                                                    </span>
                                                                </div>
                                                                </AccordionTrigger>
                                                                <AccordionContent className="text-xs text-muted-foreground space-y-2 pl-4">
                                                                {topic.summary ? (
                                                                        <div className="p-2 bg-muted/50 rounded-md">
                                                                            <p className="font-semibold flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" /> Resumen IA</p>
                                                                            <p className="whitespace-pre-wrap">{topic.summary}</p>
                                                                        </div>
                                                                ) : (
                                                                    <p>No se generó un resumen para este tema.</p>
                                                                )}
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        ))}
                                                    </Accordion>
                                                </ScrollArea>
                                            </AccordionContent>
                                        </AccordionItem>
                                        {meeting.surveyResults && meeting.surveyResults.length > 0 && (
                                            <AccordionItem value="efficiency">
                                                <AccordionTrigger className="text-sm font-semibold px-1">Detalle de Eficiencia</AccordionTrigger>
                                                <AccordionContent className="text-xs text-muted-foreground space-y-2">
                                                    <ScrollArea className="h-32">
                                                        <div className="space-y-3 pr-4">
                                                        {meeting.surveyResults.map(result => {
                                                            const criterion = surveyCriteria.find(c => c.id === result.criterionId);
                                                            if (!criterion) return null;
                                                            const scoreColor = result.score === 2 ? 'text-green-500' : result.score === 1 ? 'text-yellow-500' : 'text-red-500';
                                                            const ScoreIcon = result.score === 2 ? TrendingUp : result.score === 1 ? User : TrendingDown;
                                                            return (
                                                                <div key={result.criterionId} className="flex items-center justify-between">
                                                                    <span>{criterion.name}</span>
                                                                    <div className={`flex items-center gap-1 font-bold ${scoreColor}`}>
                                                                        <ScoreIcon className="w-4 h-4" />
                                                                        <span>{result.score}/2</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        </div>
                                                    </ScrollArea>
                                                </AccordionContent>
                                            </AccordionItem>
                                        )}
                                    </Accordion>
                                </div>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </main>
  );
}
