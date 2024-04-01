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

export interface IDiscordGuildCommandDefinition {
  id?: number;
  name: string;
  description: string;
  type: number;
  options?: Array<{
    name: string;
    description: string;
    type: number;
    required: boolean;
    choices?: Array<{
      name: string;
      value: string;
    }>;
  }>;
}
