"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RefreshCw, Trash2, Clock, Mic, StopCircle, Loader2, Check } from 'lucide-react';
import type { Topic } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { summarizeAudio } from '@/ai/flows/summarize-audio-flow';
import { useToast } from '@/hooks/use-toast';

interface AgendaItemProps {
  topic: Topic;
  onUpdate: (topic: Topic) => void;
  onRemove: (id: string) => void;
}

export function AgendaItem({ topic, onUpdate, onRemove }: AgendaItemProps) {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(topic.actualDuration);
  const { toast } = useToast();

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
  
  const handleStartRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Error starting recording:", err);
        toast({
          variant: "destructive",
          title: "Error de grabación",
          description: "No se pudo acceder al micrófono. Asegúrate de haber dado permiso.",
        });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            audioChunksRef.current = []; // Reset for next recording
            
            // Stop the tracks to turn off the microphone indicator
            mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());

            if (audioBlob.size === 0) {
              toast({
                variant: "destructive",
                title: "Grabación vacía",
                description: "No se grabó ningún audio. Inténtalo de nuevo.",
              });
              return;
            }
            
            setIsSummarizing(true);
            try {
                // Convert Blob to Data URI
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    try {
                      const result = await summarizeAudio({ audioDataUri: base64Audio, topic: topic.title });
                      onUpdate({ ...topic, summary: result.summary });
                    } catch (error) {
                       console.error("Error summarizing audio:", error);
                       toast({
                          variant: "destructive",
                          title: "Error de resumen",
                          description: "No se pudo generar el resumen. Por favor, inténtalo de nuevo.",
                       });
                    } finally {
                       setIsSummarizing(false);
                    }
                };
            } catch (error) {
                console.error("Error processing audio:", error);
                 toast({
                    variant: "destructive",
                    title: "Error de procesamiento",
                    description: "No se pudo procesar el audio grabado.",
                 });
                setIsSummarizing(false);
            }
        };
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };


  const estimatedSeconds = topic.estimatedDuration * 60;
  const progress = estimatedSeconds > 0 ? Math.min((seconds / estimatedSeconds) * 100, 100) : 0;
  const isOvertime = seconds > estimatedSeconds;

  return (
    <Card className="flex flex-col gap-4 p-4 transition-all duration-300 data-[status=completed]:opacity-60" data-status={topic.status}>
        <div className="flex flex-col sm:flex-row items-center gap-4">
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
                <Button size="icon" variant="ghost" onClick={handleFinish} disabled={topic.status === 'completed'}>
                    <Check />
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
        </div>
        { (topic.status === 'active' || topic.summary) && (
             <div className="border-t pt-4 space-y-2">
                <div className="flex items-center gap-2">
                    {isRecording ? (
                        <Button variant="destructive" onClick={handleStopRecording} disabled={isSummarizing}>
                           <StopCircle className="mr-2 animate-pulse" /> Detener grabación
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={handleStartRecording} disabled={isRecording || isSummarizing || topic.status !== 'active'}>
                            <Mic className="mr-2" /> Grabar y resumir
                        </Button>
                    )}
                     {isSummarizing && <Loader2 className="animate-spin" />}
                </div>
                {topic.summary && (
                    <div className="p-3 bg-muted/50 rounded-md">
                        <h4 className="font-semibold text-sm">Resumen de la IA</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{topic.summary}</p>
                    </div>
                )}
            </div>
        )}
    </Card>
  );
}
