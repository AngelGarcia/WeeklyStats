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
  prompt: `Eres un asistente de reuniones. Se te proporcionará una transcripción en español de un debate sobre un tema específico de la reunión.
Tu tarea es proporcionar un resumen conciso de la conversación en español.

El tema de discusión es: "{{{topic}}}"
La transcripción es:
"""
{{{text}}}
"""

Extrae lo siguiente:
- Puntos clave y argumentos expuestos.
- Cualquier decisión que se haya alcanzado.
- Puntos de acción asignados a individuos.

Formatea la salida como un resumen claro y breve en formato markdown.`,
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
