"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RefreshCw, Trash2, Clock, Mic, StopCircle, Loader2, Check, CaseSensitive, User } from 'lucide-react';
import type { Member, Topic } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { transcribeAudio } from '@/ai/flows/transcribe-audio-flow';
import { summarizeText } from '@/ai/flows/summarize-text-flow';
import { useToast } from '@/hooks/use-toast';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


interface AgendaItemProps {
  topic: Topic;
  onUpdate: (topic: Topic) => void;
  onRemove: (id: string) => void;
  members: Member[];
}

export function AgendaItem({ topic, onUpdate, onRemove, members }: AgendaItemProps) {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(topic.actualDuration);
  const { toast } = useToast();

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingState, setProcessingState] = useState<'transcribing' | 'summarizing' | null>(null);
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
    if (isRecording) {
      handleStopRecording(false);
    }
    setIsActive(false);

    if (topic.status === 'completed') {
      // "Re-open" the topic, keep the time.
      onUpdate({ ...topic, status: 'pending' });
    } else {
      // "Pure" reset, clear everything.
      setSeconds(0);
      onUpdate({ ...topic, status: 'pending', actualDuration: 0, transcription: undefined, summary: undefined });
    }
  };

  const handleFinish = () => {
    if (isRecording) {
        handleStopRecording();
    }
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

  const handleStopRecording = (processAudio = true) => {
    if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            audioChunksRef.current = [];
            
            mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
            
            if (!processAudio) {
                setIsRecording(false);
                return;
            }

            if (audioBlob.size === 0) {
              toast({
                variant: "destructive",
                title: "Grabación vacía",
                description: "No se grabó ningún audio. Inténtalo de nuevo.",
              });
              setIsRecording(false);
              return;
            }
            
            setIsProcessing(true);
            try {
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    try {
                      setProcessingState('transcribing');
                      const transcriptionResult = await transcribeAudio({ audioDataUri: base64Audio });
                      onUpdate({ ...topic, transcription: transcriptionResult.transcription });
                      
                      setProcessingState('summarizing');
                      const summaryResult = await summarizeText({ text: transcriptionResult.transcription, topic: topic.title });
                      onUpdate({ ...topic, transcription: transcriptionResult.transcription, summary: summaryResult.summary });

                    } catch (error) {
                       console.error("Error in AI processing:", error);
                       toast({
                          variant: "destructive",
                          title: `Error al ${processingState === 'transcribing' ? 'transcribir' : 'resumir'}`,
                          description: "No se pudo procesar la grabación. Por favor, inténtalo de nuevo.",
                       });
                    } finally {
                       setIsProcessing(false);
                       setProcessingState(null);
                    }
                };
            } catch (error) {
                console.error("Error processing audio:", error);
                 toast({
                    variant: "destructive",
                    title: "Error de procesamiento",
                    description: "No se pudo procesar el audio grabado.",
                 });
                setIsProcessing(false);
                setProcessingState(null);
            }
        };
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };


  const estimatedSeconds = topic.estimatedDuration * 60;
  const progress = estimatedSeconds > 0 ? Math.min((seconds / estimatedSeconds) * 100, 100) : 0;
  const isOvertime = seconds > estimatedSeconds;
  const presenter = members.find(m => m.id === topic.presenterId);

  return (
    <Card className="flex flex-col gap-4 p-4 transition-all duration-300 data-[status=completed]:opacity-60" data-status={topic.status}>
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
                <h3 className="font-semibold">{topic.title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Estimado: {topic.estimatedDuration} min</span>
                    </div>
                     {presenter && (
                        <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={presenter.avatarUrl} alt={presenter.name} />
                                <AvatarFallback>{presenter.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{presenter.name}</span>
                        </div>
                    )}
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
                <Button size="icon" variant="ghost" onClick={handleReset}>
                    <RefreshCw />
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive">
                            <Trash2 />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el tema <strong>{topic.title}</strong> y sus datos asociados.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onRemove(topic.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="w-full sm:w-32">
                <Progress value={progress} className={isOvertime ? '[&>div]:bg-destructive' : ''} />
            </div>
        </div>
        { (topic.status === 'active' || topic.transcription || topic.summary) && (
             <div className="border-t pt-4 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {isRecording ? (
                            <Button variant="destructive" onClick={() => handleStopRecording()} disabled={isProcessing}>
                               <StopCircle className="mr-2 animate-pulse" /> Detener grabación
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={handleStartRecording} disabled={isRecording || isProcessing || topic.status !== 'active'}>
                                <Mic className="mr-2" /> Grabar y resumir
                            </Button>
                        )}
                    </div>
                     {isProcessing && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="animate-spin" />
                            <span>
                                {processingState === 'transcribing' ? 'Transcribiendo...' : 'Resumiendo...'}
                            </span>
                        </div>
                     )}
                </div>
                {topic.transcription && (
                    <div className="p-3 bg-muted/50 rounded-md">
                        <h4 className="font-semibold text-sm flex items-center gap-2"><CaseSensitive /> Transcripción</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{topic.transcription}</p>
                    </div>
                )}
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
