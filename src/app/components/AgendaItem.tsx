"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RefreshCw, Trash2, Clock } from 'lucide-react';
import type { Topic } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface AgendaItemProps {
  topic: Topic;
  onUpdate: (topic: Topic) => void;
  onRemove: (id: string) => void;
}

export function AgendaItem({ topic, onUpdate, onRemove }: AgendaItemProps) {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(topic.actualDuration);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);
  
  useEffect(() => {
    // Sync with external state changes
    if (topic.status !== 'active' && isActive) {
      setIsActive(false);
    }
    setSeconds(topic.actualDuration);
  }, [topic]);

  const handleToggle = () => {
    const newIsActive = !isActive;
    setIsActive(newIsActive);
    onUpdate({ ...topic, status: newIsActive ? 'active' : 'paused', actualDuration: seconds });
  };

  const handleReset = () => {
    setIsActive(false);
    setSeconds(0);
    onUpdate({ ...topic, status: 'pending', actualDuration: 0 });
  };

  const handleFinish = () => {
    setIsActive(false);
    onUpdate({ ...topic, status: 'completed', actualDuration: seconds });
  };

  const estimatedSeconds = topic.estimatedDuration * 60;
  const progress = estimatedSeconds > 0 ? Math.min((seconds / estimatedSeconds) * 100, 100) : 0;
  const isOvertime = seconds > estimatedSeconds;

  return (
    <Card className="flex flex-col sm:flex-row items-center gap-4 p-4 transition-all duration-300 data-[status=completed]:opacity-60" data-status={topic.status}>
      <div className="flex-1 w-full">
        <h3 className="font-semibold">{topic.title}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Clock className="w-4 h-4" />
          <span>Estimado: {topic.estimatedDuration} min</span>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="w-24 text-center font-mono text-lg font-semibold" style={{ color: isOvertime ? 'hsl(var(--destructive))' : 'inherit' }}>
          {formatTime(seconds)}
        </div>
        <Button size="icon" variant={isActive ? "outline" : "ghost"} onClick={handleToggle} disabled={topic.status === 'completed'}>
          {isActive ? <Pause /> : <Play />}
        </Button>
        <Button size="icon" variant="ghost" onClick={handleReset} disabled={topic.status === 'completed'}>
          <RefreshCw />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onRemove(topic.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 />
        </Button>
      </div>
      <div className="w-full sm:w-32">
        <Progress value={progress} className={isOvertime ? '[&>div]:bg-destructive' : ''} />
      </div>
    </Card>
  );
}
