'use server';

/**
 * @fileOverview An AI agent that suggests an optimal trade amount based on trade history and portfolio value.
 *
 * - suggestTradeAmount - A function that suggests an optimal trade amount.
 * - SuggestTradeAmountInput - The input type for the suggestTradeAmount function.
 * - SuggestTradeAmountOutput - The return type for the suggestTradeAmount function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTradeAmountInputSchema = z.object({
  tradeHistory: z.array(
    z.object({
      amount: z.number().describe('The amount of the trade.'),
      returnPercentage: z
        .number()
        .describe('The predicted return percentage of the trade.'),
      outcome: z.enum(['win', 'loss']).describe('The outcome of the trade.'),
    })
  ).describe('The history of past trades.'),
  currentPortfolioValue: z.number().describe('The current value of the portfolio.'),
  riskLevel: z.enum(['low', 'medium', 'high']).describe('The risk level selected by the user.'),
});
export type SuggestTradeAmountInput = z.infer<typeof SuggestTradeAmountInputSchema>;

const SuggestTradeAmountOutputSchema = z.object({
  suggestedTradeAmount: z.number().describe('The suggested trade amount.'),
  bankruptcyRisk: z.number().describe('The probability of bankrupting the portfolio with the suggested trade amount, as a percentage.'),
  reasoning: z.string().describe('The reasoning behind the suggested trade amount.'),
});
export type SuggestTradeAmountOutput = z.infer<typeof SuggestTradeAmountOutputSchema>;

export async function suggestTradeAmount(input: SuggestTradeAmountInput): Promise<SuggestTradeAmountOutput> {
  return suggestTradeAmountFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTradeAmountPrompt',
  input: {schema: SuggestTradeAmountInputSchema},
  output: {schema: SuggestTradeAmountOutputSchema},
  prompt: `You are an expert financial advisor specializing in risk management for traders.

You will analyze the trader's past trade history, current portfolio value, and risk level to suggest an optimal trade amount.

Consider the following factors:

*   **Trade History:** Analyze the trader's past trades to identify patterns and calculate their win rate and average return percentage.
*   **Current Portfolio Value:** Take into account the current value of the trader's portfolio to determine how much capital they can afford to risk.
*   **Risk Level:** Adjust the suggested trade amount based on the trader's selected risk level. A low-risk level should result in a more conservative trade amount, while a high-risk level can result in a more aggressive trade amount.
*   **Bankruptcy Risk:** Calculate the probability of bankrupting the portfolio with the suggested trade amount. Alert the user if the probability is higher than 20%.

Trade History:
{{#each tradeHistory}}
  - Amount: {{amount}}, Return Percentage: {{returnPercentage}}, Outcome: {{outcome}}
{{/each}}

Current Portfolio Value: {{currentPortfolioValue}}
Risk Level: {{riskLevel}}

Based on this information, suggest an optimal trade amount that maximizes potential profits while considering the trader's risk level. Also, provide the reasoning behind the amount, and alert the user about the bankruptcy risk.

Output in JSON format:
{{outputSchema}}`,
});

const suggestTradeAmountFlow = ai.defineFlow(
  {
    name: 'suggestTradeAmountFlow',
    inputSchema: SuggestTradeAmountInputSchema,
    outputSchema: SuggestTradeAmountOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
