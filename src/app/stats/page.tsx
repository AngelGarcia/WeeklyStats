
"use client"

import React, { useMemo } from 'react';
import { useAppContext } from '@/app/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ChartConfig } from '@/components/ui/chart';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Presentation, UserCheck, BookOpen, User } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


const attendanceChartConfig = {
  physical: {
    label: "Físico",
    color: "hsl(var(--chart-1))",
  },
  online: {
    label: "Online",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const efficiencyChartConfig = {
  efficiency: {
    label: "Eficiencia (%)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;


export default function StatsPage() {
  const { meetings, members, surveyCriteria, isInitialized } = useAppContext();

  const calculateEfficiencyScore = (surveyResults: any[] | undefined) => {
    if (!surveyResults || !surveyCriteria || surveyCriteria.length === 0) return 0;
    
    let totalScore = 0;
    let totalWeight = 0;

    surveyResults.forEach(result => {
      const criterion = surveyCriteria.find(c => c.id === result.criterionId);
      if (criterion) {
        totalScore += (result.score / 2) * criterion.weight;
        totalWeight += criterion.weight;
      }
    });

    if (totalWeight === 0) return 0;
    const finalScore = (totalScore / totalWeight) * 100;
    return Math.round(finalScore);
  };

  const meetingsChartData = useMemo(() => {
    if (!meetings) return [];
    return meetings
      .filter(m => m.status === 'COMPLETED')
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .map(meeting => {
        const attendance = meeting.attendance || [];
        const presentMembers = attendance.filter(a => a.status === 'present');
        const physical = presentMembers.filter(a => a.location === 'physical').length;
        const online = presentMembers.filter(a => a.location === 'online').length;
        const efficiency = calculateEfficiencyScore(meeting.surveyResults);
        
        return {
          date: format(parseISO(meeting.date), "d MMM", { locale: es }),
          physical,
          online,
          efficiency,
        };
      });
  }, [meetings, surveyCriteria]);

  const memberStatsData = useMemo(() => {
    if (!members || !meetings) {
        return {
            stats: [],
            maxValues: {
                totalAttendance: 0,
                presenterCount: 0,
                volunteerCount: 0,
                topicPresenterCount: 0,
            }
        };
    }
    
    const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name));

    const maxValues = {
        totalAttendance: 0,
        presenterCount: 0,
        volunteerCount: 0,
        topicPresenterCount: 0,
    };

    const stats = sortedMembers.map(member => {
        const attendanceStats = { physical: 0, online: 0 };

        meetings.forEach(meeting => {
            const record = meeting.attendance?.find(a => a.memberId === member.id && a.status === 'present');
            if (record) {
                if (record.location === 'physical') {
                    attendanceStats.physical += 1;
                } else if (record.location === 'online') {
                    attendanceStats.online += 1;
                }
            }
        });

        const memberData = {
            id: member.id,
            name: member.name,
            avatarUrl: member.avatarUrl,
            physicalAttendance: attendanceStats.physical,
            onlineAttendance: attendanceStats.online,
            totalAttendance: attendanceStats.physical + attendanceStats.online,
            presenterCount: member.presenterCount || 0,
            volunteerCount: member.volunteerCount || 0,
            topicPresenterCount: member.topicPresenterCount || 0,
        };

        maxValues.totalAttendance = Math.max(maxValues.totalAttendance, memberData.totalAttendance);
        maxValues.presenterCount = Math.max(maxValues.presenterCount, memberData.presenterCount);
        maxValues.volunteerCount = Math.max(maxValues.volunteerCount, memberData.volunteerCount);
        maxValues.topicPresenterCount = Math.max(maxValues.topicPresenterCount, memberData.topicPresenterCount);

        return memberData;
    });

    return { stats, maxValues };
}, [members, meetings]);

  const getProgressValue = (value: number, max: number) => (max > 0 ? (value / max) * 100 : 0);

  if (!isInitialized) {
    return <div className="flex justify-center items-center h-full"><p>Cargando estadísticas...</p></div>;
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-headline font-bold mb-6">Estadísticas de Reuniones</h1>
        {meetingsChartData.length === 0 ? (
             <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                No hay suficientes datos para mostrar gráficos. ¡Completa al menos una reunión para empezar!
                </CardContent>
            </Card>
        ) : (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Puntuación de Eficiencia</CardTitle>
                        <CardDescription>Evolución de la puntuación de eficiencia de las reuniones a lo largo del tiempo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={efficiencyChartConfig} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <LineChart data={meetingsChartData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis unit="%" />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent indicator="dot" />}
                                    />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <Line dataKey="efficiency" type="monotone" strokeWidth={2} stroke="var(--color-efficiency)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Asistencia a Reuniones</CardTitle>
                        <CardDescription>Desglose de la asistencia física y online por reunión.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={attendanceChartConfig} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <BarChart data={meetingsChartData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <Bar dataKey="physical" stackId="a" fill="var(--color-physical)" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="online" stackId="a" fill="var(--color-online)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Estadísticas por Miembro</CardTitle>
                        <CardDescription>Desglose de participación por miembro. Haz clic para expandir.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full">
                            {memberStatsData.stats.map(member => (
                                <AccordionItem value={member.id} key={member.id}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-3 w-full">
                                            <Avatar>
                                                <AvatarImage src={member.avatarUrl} alt={member.name} />
                                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{member.name}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-4">
                                        <div className="grid gap-3 text-sm">
                                            <div className="grid grid-cols-5 items-center gap-2">
                                                <div className="col-span-1 flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4"/> Asistencia</div>
                                                <div className="col-span-4">
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={getProgressValue(member.totalAttendance, memberStatsData.maxValues.totalAttendance)} className="w-full" />
                                                        <span className="font-bold">{member.totalAttendance}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        <span>Físico: {member.physicalAttendance}</span> / <span>Online: {member.onlineAttendance}</span>
                                                    </div>
                                                </div>
                                            </div>
                                             <div className="grid grid-cols-5 items-center gap-2">
                                                <div className="col-span-1 flex items-center gap-2 text-muted-foreground"><Presentation className="w-4 h-4"/> Presentador</div>
                                                <div className="col-span-4 flex items-center gap-2">
                                                    <Progress value={getProgressValue(member.presenterCount, memberStatsData.maxValues.presenterCount)} className="w-full" />
                                                    <span className="font-bold">{member.presenterCount}</span>
                                                </div>
                                            </div>
                                             <div className="grid grid-cols-5 items-center gap-2">
                                                <div className="col-span-1 flex items-center gap-2 text-muted-foreground"><UserCheck className="w-4 h-4"/> Secretario</div>
                                                <div className="col-span-4 flex items-center gap-2">
                                                    <Progress value={getProgressValue(member.volunteerCount, memberStatsData.maxValues.volunteerCount)} className="w-full" />
                                                    <span className="font-bold">{member.volunteerCount}</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-5 items-center gap-2">
                                                <div className="col-span-1 flex items-center gap-2 text-muted-foreground"><BookOpen className="w-4 h-4"/> Temas</div>
                                                <div className="col-span-4 flex items-center gap-2">
                                                    <Progress value={getProgressValue(member.topicPresenterCount, memberStatsData.maxValues.topicPresenterCount)} className="w-full" />
                                                    <span className="font-bold">{member.topicPresenterCount}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>

                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Datos de Participación</CardTitle>
                        <CardDescription>Resumen numérico de la participación de cada miembro.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Miembro</TableHead>
                                    <TableHead className="text-center">Asist. Total</TableHead>
                                    <TableHead className="text-center">Asist. Física</TableHead>
                                    <TableHead className="text-center">Asist. Online</TableHead>
                                    <TableHead className="text-center">Presentador</TableHead>
                                    <TableHead className="text-center">Secretario</TableHead>
                                    <TableHead className="text-center">Temas Prop.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {memberStatsData.stats.map(member => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{member.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">{member.totalAttendance}</TableCell>
                                        <TableCell className="text-center">{member.physicalAttendance}</TableCell>
                                        <TableCell className="text-center">{member.onlineAttendance}</TableCell>
                                        <TableCell className="text-center">{member.presenterCount}</TableCell>
                                        <TableCell className="text-center">{member.volunteerCount}</TableCell>
                                        <TableCell className="text-center">{member.topicPresenterCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        )}
    </main>
  );
}
