
"use client"

import React, { useMemo } from 'react';
import { useAppContext } from '@/app/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ChartConfig } from '@/components/ui/chart';

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
  const { meetings, surveyCriteria, isInitialized } = useAppContext();

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

  const chartData = useMemo(() => {
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

  if (!isInitialized) {
    return <div className="flex justify-center items-center h-full"><p>Cargando estadísticas...</p></div>;
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-headline font-bold mb-6">Estadísticas de Reuniones</h1>
        {chartData.length === 0 ? (
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
                                <LineChart data={chartData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis unit="%" />
                                    <Tooltip
                                        cursor={false}
                                        content={<ChartTooltipContent indicator="dot" />}
                                    />
                                    <Legend content={<ChartLegendContent />} />
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
                                <BarChart data={chartData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend content={<ChartLegendContent />} />
                                    <Bar dataKey="physical" stackId="a" fill="var(--color-physical)" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="online" stackId="a" fill="var(--color-online)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        )}
    </main>
  );
}
