
'use server';

/**
 * @fileOverview An AI agent that suggests an optimal trade amount based on trade history, portfolio value, and user-defined goals.
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
      stock: z.string().describe('The stock ticker for the trade.'),
      amount: z.number().describe('The amount of the trade.'),
      returnPercentage: z
        .number()
        .describe('The predicted return percentage of the trade.'),
      outcome: z.enum(['win', 'loss']).describe('The outcome of the trade.'),
      tradeType: z.enum(['call', 'put']).describe('The type of trade (call or put).')
    })
  ).describe('The history of past trades.'),
  currentPortfolioValue: z.number().describe('The current value of the portfolio.'),
  riskLevel: z.enum(['low', 'medium', 'high']).describe('The risk level selected by the user.'),
  profitGoal: z.number().describe('The user-defined profit goal for the session ($).'),
  targetWinRate: z.number().describe('The user-defined target win rate for the session (%).'),
  tradesRemaining: z.number().describe('The number of trades remaining to meet the session goal.'),
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

You will analyze the trader's past trade history, current portfolio value, risk level, and session goals to suggest an optimal trade amount.

Consider the following factors:

*   **Trade History:** Analyze the trader's past trades to identify patterns and calculate their win rate and average return percentage. Pay attention to performance on specific stocks and trade types (calls vs. puts).
*   **Current Portfolio Value:** Take into account the current value of the trader's portfolio to determine how much capital they can afford to risk.
*   **Risk Level:** Adjust the suggested trade amount based on the trader's selected risk level. A low-risk level should result in a more conservative trade amount, while a high-risk level can result in a more aggressive trade amount.
*   **Session Goals:** The primary objective is to reach the Profit Goal and Target Win Rate within the remaining trades. The suggested amount should be ambitious enough to make progress but not so risky that it jeopardizes the entire portfolio.
*   **Bankruptcy Risk:** Calculate the probability of bankrupting the portfolio with the suggested trade amount. Alert the user if the probability is higher than 20%.

User's Data:
- Current Portfolio Value: {{currentPortfolioValue}}
- Risk Level: {{riskLevel}}
- Profit Goal: {{profitGoal}}
- Target Win Rate: {{targetWinRate}}
- Trades Remaining in Session: {{tradesRemaining}}

Trade History:
{{#if tradeHistory.length}}
  {{#each tradeHistory}}
    - Stock: {{stock}}, Type: {{tradeType}}, Amount: {{amount}}, Return Percentage: {{returnPercentage}}, Outcome: {{outcome}}
  {{/each}}
{{else}}
  No trades in this session yet.
{{/if}}

Based on this information, suggest an optimal trade amount that maximizes the chances of reaching the session goals while managing risk according to the selected level. Provide clear reasoning for your suggestion and the calculated bankruptcy risk.

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
