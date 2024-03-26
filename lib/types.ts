import { InteractionType } from 'discord-interactions';

export interface IDiscordInteractionsRequestBody {
  type: InteractionType;
  data: {
    name: string;
    options?: Array<{
      value: string; // or any other type depending on the actual values
    }>;
  };
}
