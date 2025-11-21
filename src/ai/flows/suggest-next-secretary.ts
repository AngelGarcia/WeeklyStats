'use server';

/**
 * @fileOverview Suggests the next secretary for a meeting based on a fairness algorithm.
 *
 * - suggestNextSecretary - A function that suggests the next secretary.
 * - SuggestNextSecretaryInput - The input type for the suggestNextSecretary function.
 * - SuggestNextSecretaryOutput - The return type for the suggestNextSecretary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestNextSecretaryInputSchema = z.object({
  members: z
    .array(
      z.object({
        name: z.string(),
        presenterCount: z.number().optional().default(0),
        volunteerCount: z.number().optional().default(0),
      })
    )
    .describe('List of team members and their past presenter and volunteer counts.'),
});
export type SuggestNextSecretaryInput = z.infer<typeof SuggestNextSecretaryInputSchema>;

const SuggestNextSecretaryOutputSchema = z.object({
  suggestedSecretary: z.string().describe('The name of the suggested next secretary.'),
  reason: z.string().describe('The reason for choosing the suggested secretary.'),
});
export type SuggestNextSecretaryOutput = z.infer<typeof SuggestNextSecretaryOutputSchema>;

export async function suggestNextSecretary(input: SuggestNextSecretaryInput): Promise<SuggestNextSecretaryOutput> {
  return suggestNextSecretaryFlow(input);
}

const suggestNextSecretaryPrompt = ai.definePrompt({
  name: 'suggestNextSecretaryPrompt',
  input: {schema: SuggestNextSecretaryInputSchema},
  output: {schema: SuggestNextSecretaryOutputSchema},
  prompt: `You are a meeting facilitator. Given the following list of team members and their past presenter and volunteer counts, suggest the next secretary for the meeting, ensuring fairness.

Members: {{{members}}}

Consider the following factors:
- Prioritize members who have the fewest presenter and volunteer counts.
- If there are members with the same counts, randomly select one of them.
- Provide a brief reason for your suggestion.

Output the suggested secretary's name and the reason for your choice.

In JSON format.`, // Asking for JSON format is important for structured output and type safety
});

const suggestNextSecretaryFlow = ai.defineFlow(
  {
    name: 'suggestNextSecretaryFlow',
    inputSchema: SuggestNextSecretaryInputSchema,
    outputSchema: SuggestNextSecretaryOutputSchema,
  },
  async input => {
    const {output} = await suggestNextSecretaryPrompt(input);
    return output!;
  }
);
