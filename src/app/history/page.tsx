"use client";
import React, { useMemo } from 'react';
import { useAppContext } from '@/app/context/AppContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User, Mic, AlertCircle, Sparkles, Trash2 } from 'lucide-react';
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

export default function HistoryPage() {
  const { meetings, members, isInitialized, clearHistory } = useAppContext();

  const sortedMeetings = useMemo(() => {
    if (!meetings) return [];
    return [...meetings].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [meetings]);

  if (!isInitialized) {
    return <div className="flex justify-center items-center h-full"><p>Cargando historial...</p></div>;
  }
  
  const getPunctuality = (meeting: typeof meetings[0]) => {
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
      return { text: `Retraso de ${Math.round(diffMinutes)} min`, color: "text-red-600", iconColor: "text-red-500" };
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedMeetings.map(meeting => {
              const presenter = members.find(m => m.id === meeting.presenterId);
              const secretary = members.find(m => m.id === meeting.secretaryId);
              const totalDuration = meeting.agenda.reduce((acc, topic) => acc + topic.actualDuration, 0);
              const punctuality = getPunctuality(meeting);

              return (
                <Card key={meeting.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-headline">{format(parseISO(meeting.date), "d 'de' MMMM, yyyy", { locale: es })}</CardTitle>
                            <CardDescription className="flex flex-col items-start gap-1 pt-1 text-xs">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" /> 
                                  <span>
                                    {meeting.actualStartTime ? format(parseISO(meeting.actualStartTime), 'HH:mm') : ''}h - {meeting.endTime ? format(parseISO(meeting.endTime), 'HH:mm')+'h' : ''}
                                    ({formatTime(totalDuration)})
                                  </span>
                                </div>
                            </CardDescription>
                        </div>
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
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
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
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
                    <div>
                        <h4 className="font-semibold mb-2">Temas y Resúmenes</h4>
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
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
