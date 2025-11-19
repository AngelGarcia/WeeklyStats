import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-next-secretary.ts';
import '@/ai/flows/summarize-audio-flow.ts'; // Deprecated but kept for now
import '@/ai/flows/transcribe-audio-flow.ts';
import '@/ai/flows/summarize-text-flow.ts';
