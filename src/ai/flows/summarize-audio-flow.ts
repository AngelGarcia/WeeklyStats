'use server';
/**
 * @fileOverview This file is deprecated. Use summarize-text-flow.ts instead.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio recording of a meeting discussion, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  topic: z.string().describe('The title of the meeting topic being discussed.'),
});
export type SummarizeAudioInput = z.infer<typeof SummarizeAudioInputSchema>;

const SummarizeAudioOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the discussion, including key points, decisions, and action items.'),
});
export type SummarizeAudioOutput = z.infer<typeof SummarizeAudioOutputSchema>;


export async function summarizeAudio(input: SummarizeAudioInput): Promise<SummarizeAudioOutput> {
  // This flow is deprecated.
  // For new implementations, first use `transcribe-audio-flow.ts` to get the text,
  // and then use `summarize-text-flow.ts` to summarize it.
  // This implementation remains for backwards compatibility if needed, but chains transcription and summarization.
  
  const { output } = await summarizeAudioPrompt(input);
  return output!;
}


const summarizeAudioPrompt = ai.definePrompt({
  name: 'summarizeAudioPrompt',
  input: {schema: SummarizeAudioInputSchema},
  output: {schema: SummarizeAudioOutputSchema},
  prompt: `You are a meeting assistant. You will be given an audio recording of a discussion about a specific meeting topic.
Your task is to provide a concise summary of the conversation.

The topic of discussion is: "{{{topic}}}"

Listen to the audio and extract the following:
- Key points and arguments made.
- Any decisions that were reached.
- Action items assigned to individuals.

Format the output as a clear and brief summary.

Audio: {{media url=audioDataUri}}`,
});
