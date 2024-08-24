import { InteractionType } from 'discord-interactions';
import { ColorResolvable } from 'discord.js';

// Discord types
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

export interface IDiscordUserStats {
  username?: string;
  posts: number;
  words?: number;
  letters?: number;
  lastActivity?: number; // A timestamp.
}

export interface IDiscordUserStatsActivity {
  activeUsers: Array<IDiscordUserStats>;
  inactiveUsers: Array<IDiscordUserStats>;
  inactiveUsersForRemoval?: Set<string>;
}

export interface ActiveStatsTable {
  username: string
  posts: number
}

export interface InactiveStatsTable {
  username: string
  lastSeenInDays: number
}

export interface IDiscordUserStatsInactivity {
  username: string;
  lastActivity: number; // A timestamp.
}

// Leetcode graphql types
export interface ILeetcodeProblem {
  questionId: string;
  link?: string;
  title: string;
  questionFrontendId?: string;
  frontendQuestionId?: string;
  titleSlug: string;
  difficulty: string;
  remainingTimeMessage?: string;
  color?: ColorResolvable;
  acRate?: number;
}

export interface ILeetcodeProblemSetQuestionList {
  data?: {
    problemsetQuestionList?: {
      questions: Array<ILeetcodeProblem>;
      total: number;
    }
  };
}

export interface ILeetcodeDailyChallenge {
  data?: {
    activeDailyCodingChallengeQuestion?: {
      question: ILeetcodeProblem;
      link: string;
    }
  };
}

export interface ILeetcodeWeeklyChallenges {
  data?: {
    dailyCodingChallengeV2?: {
      weeklyChallenges: Array<{
        question: ILeetcodeProblem;
        link: string;
        date: string;
      }>
    }
  }
}

export interface ILeetcodeProblemSetFromCategory {
  questions?: Array<ILeetcodeProblem>;
}
