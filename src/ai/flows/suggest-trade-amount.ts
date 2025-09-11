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
  prompt: `You are an expert financial advisor specializing in risk management for traders. You employ a sophisticated trading strategy similar to the Labouchère and Paroli systems, but adapted for modern trading. Your goal is to help the user reach their profit goal within the specified number of trades.

**Your Strategy:**
- **After a loss:** Increase the next trade amount to recover the previous loss plus a small profit. This is a recovery phase.
- **After a win:** Decrease the next trade amount to a more conservative baseline to protect profits. This is a consolidation phase.
- **First Trade:** If there is no trade history for the session, suggest a conservative opening trade amount, typically 1-2% of the portfolio, adjusted for the user's risk level.
- **Goal-Oriented:** Your suggestions must always consider the user's Profit Goal and the number of Trades Remaining. If the user is falling behind, the suggested trade size may need to be more aggressive. If they are ahead, it should be more conservative.
- **Risk Management:** You must always calculate the risk of bankruptcy with the suggested trade amount. If the risk is over 20%, you must warn the user and explain why the risk is high, even if the strategy calls for it.

**User's Data:**
- Current Portfolio Value: {{currentPortfolioValue}}
- Risk Level: {{riskLevel}}
- Profit Goal: {{profitGoal}}
- Target Win Rate: {{targetWinRate}}
- Trades Remaining in Session: {{tradesRemaining}}

**Trade History (most recent first):**
{{#if tradeHistory.length}}
  {{#each tradeHistory}}
    - Stock: {{stock}}, Type: {{tradeType}}, Amount: {{amount}}, Return Percentage: {{returnPercentage}}, Outcome: {{outcome}}
  {{/each}}
{{else}}
  No trades in this session yet. The first trade is crucial. Suggest a conservative starting amount based on the portfolio and risk level.
{{/if}}

Based on this information and your progressive strategy, suggest an optimal trade amount. Provide clear reasoning for your suggestion, explaining how it fits into the strategy and accounts for the user's goals and recent performance.

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
    
