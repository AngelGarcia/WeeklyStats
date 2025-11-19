"use client";
import React, { useContext, useMemo } from 'react';
import { AppContext } from '@/app/context/AppContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User, Mic } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function HistoryPage() {
  const { meetings, members, isInitialized } = useContext(AppContext);

  const sortedMeetings = useMemo(() => {
    return [...meetings].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [meetings]);

  if (!isInitialized) {
    return <div className="flex justify-center items-center h-full"><p>Cargando historial...</p></div>;
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-headline font-bold">Historial de Reuniones</h1>
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

              return (
                <Card key={meeting.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="font-headline">{format(parseISO(meeting.date), 'd \'de\' MMMM, yyyy', { locale: es })}</CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-1">
                        <Clock className="w-4 h-4" /> Duración total: {formatTime(totalDuration)}
                    </CardDescription>
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
                                <p className="text-sm font-medium">{presenter?.name}</p>
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
                                <p className="text-sm font-medium">{secretary?.name}</p>
                                <p className="text-xs text-muted-foreground">Secretario</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Temas Tratados</h4>
                        <ScrollArea className="h-32">
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {meeting.agenda.map(topic => (
                                <li key={topic.id}>{topic.title} ({formatTime(topic.actualDuration)})</li>
                            ))}
                        </ul>
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
