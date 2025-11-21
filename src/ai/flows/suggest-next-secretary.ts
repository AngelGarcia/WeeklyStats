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
  memberNames: z.array(z.string()).describe('A list of eligible member names for the tool to choose from.'),
});
export type SuggestNextSecretaryInput = z.infer<typeof SuggestNextSecretaryInputSchema>;

const SuggestNextSecretaryOutputSchema = z.object({
  suggestedSecretary: z.string().describe('The name of the suggested next secretary.'),
  reason: z.string().describe('The reason for choosing the suggested secretary.'),
});
export type SuggestNextSecretaryOutput = z.infer<typeof SuggestNextSecretaryOutputSchema>;


export async function suggestNextSecretary(input: SuggestNextSecretaryInput): Promise<SuggestNextSecretaryOutput> {
  if (input.memberNames.length === 0) {
    throw new Error("Cannot suggest a secretary from an empty list of members.");
  }

  // Dynamically create the tool schema with the provided member names
  const chooseSecretaryTool = ai.defineTool(
    {
      name: 'chooseSecretary',
      description: 'Choose the next secretary from the provided list of names.',
      inputSchema: z.object({
        suggestedSecretary: z.enum(input.memberNames as [string, ...string[]]).describe("The name of the team member to select as the next secretary."),
        reason: z.string().describe("The justification for selecting this member, based on fairness."),
      }),
      outputSchema: SuggestNextSecretaryOutputSchema,
    },
    async (input) => input
  );
  
  const result = await ai.generate({
    prompt: `You are a meeting facilitator. Given the following list of team members and their past presenter and volunteer counts, suggest the next secretary for the meeting, ensuring fairness.

Members: ${JSON.stringify(input.members)}

Consider the following factors:
- Prioritize members who have the fewest presenter and volunteer counts.
- If there are members with the same counts, randomly select one of them.

Use the chooseSecretary tool to provide your answer.
`,
    tools: [chooseSecretaryTool],
    toolChoice: 'required',
  });

  const toolRequest = result.toolRequest();
  if (!toolRequest) {
    throw new Error("The model did not return a tool request as expected.");
  }
  
  return toolRequest.tool.input;
}
