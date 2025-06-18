'use server';

/**
 * @fileOverview Compares two JSON files for semantic accuracy and provides a summary of differences.
 *
 * - compareJsonAccuracy - A function that compares two JSON files and returns an accuracy score and summary.
 * - CompareJsonAccuracyInput - The input type for the compareJsonAccuracy function.
 * - CompareJsonAccuracyOutput - The return type for the compareJsonAccuracy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CompareJsonAccuracyInputSchema = z.object({
  manualJson: z.string().describe('The manually created JSON file content.'),
  aiJson: z.string().describe('The AI-generated JSON file content.'),
});
export type CompareJsonAccuracyInput = z.infer<typeof CompareJsonAccuracyInputSchema>;

const CompareJsonAccuracyOutputSchema = z.object({
  accuracyScore: z.number().describe('The semantic accuracy score between 0 and 1.'),
  differencesSummary: z.string().describe('A summary of the key differences identified by the AI.'),
});
export type CompareJsonAccuracyOutput = z.infer<typeof CompareJsonAccuracyOutputSchema>;

export async function compareJsonAccuracy(input: CompareJsonAccuracyInput): Promise<CompareJsonAccuracyOutput> {
  return compareJsonAccuracyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'compareJsonAccuracyPrompt',
  input: {schema: CompareJsonAccuracyInputSchema},
  output: {schema: CompareJsonAccuracyOutputSchema},
  prompt: `You are a data analyst specializing in comparing JSON files for semantic accuracy.

You will receive two JSON files: one manually created (manualJson) and one AI-generated (aiJson).

Your task is to:
1.  Calculate a semantic accuracy score between 0 and 1, where 1 means the files are semantically identical.
2.  Provide a concise summary of the key differences identified by the AI.

Manual JSON:
{{{manualJson}}}

AI-Generated JSON:
{{{aiJson}}}

Ensure the accuracy score and differences summary are accurate and informative.
`,
});

const compareJsonAccuracyFlow = ai.defineFlow(
  {
    name: 'compareJsonAccuracyFlow',
    inputSchema: CompareJsonAccuracyInputSchema,
    outputSchema: CompareJsonAccuracyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
