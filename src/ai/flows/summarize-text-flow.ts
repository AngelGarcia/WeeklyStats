'use server';
/**
 * @fileOverview A flow to summarize a given text related to a meeting topic.
 *
 * - summarizeText - A function that takes text and topic context and returns a summary.
 * - SummarizeTextInput - The input type for the summarizeText function.
 * - SummarizeTextOutput - The return type for the summarizeText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTextInputSchema = z.object({
  text: z.string().describe('The text to be summarized (e.g., a meeting transcription).'),
  topic: z.string().describe('The title of the meeting topic being discussed.'),
});
export type SummarizeTextInput = z.infer<typeof SummarizeTextInputSchema>;

const SummarizeTextOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the text, including key points, decisions, and action items.'),
});
export type SummarizeTextOutput = z.infer<typeof SummarizeTextOutputSchema>;

export async function summarizeText(input: SummarizeTextInput): Promise<SummarizeTextOutput> {
  return summarizeTextFlow(input);
}

const summarizeTextPrompt = ai.definePrompt({
  name: 'summarizeTextPrompt',
  input: {schema: SummarizeTextInputSchema},
  output: {schema: SummarizeTextOutputSchema},
  prompt: `You are a meeting assistant. You will be given a transcription of a discussion about a specific meeting topic.
Your task is to provide a concise summary of the conversation.

The topic of discussion is: "{{{topic}}}"
The transcription is:
"""
{{{text}}}
"""

Extract the following:
- Key points and arguments made.
- Any decisions that were reached.
- Action items assigned to individuals.

Format the output as a clear and brief summary in markdown.`,
});

const summarizeTextFlow = ai.defineFlow(
  {
    name: 'summarizeTextFlow',
    inputSchema: SummarizeTextInputSchema,
    outputSchema: SummarizeTextOutputSchema,
  },
  async input => {
    const {output} = await summarizeTextPrompt(input);
    return output!;
  }
);
