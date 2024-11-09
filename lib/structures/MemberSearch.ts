import { APIGuildMember, Snowflake } from 'discord.js';

export interface MemberSearch {
  guild_id: string;
  members: SearchedMember[];
  page_result_count: number;
  total_result_count: number;
}

export interface SearchedMember {
  member: APIGuildMember & { unusual_dm_activity_until: number };
  source_invite_code: null | string;
  join_source_type: JoinSourceType;
  inviter_id: null | Snowflake;
}

export interface MemberSearchQuery {
  or_query?: OrQuery;
  and_query?: AndQuery;
  limit?: number;
}

export interface AndQuery {
  usernames?: {
    or_query: string[];
  };
  role_ids?: {
    and_query: Snowflake[];
  };
  guild_joined_at?: {
    range: {
      gte: number;
    };
  };
  user_id?: {
    range?: {
      gte: Snowflake;
    };
    or_query?: Snowflake[];
  };
  source_invite_code?: {
    or_query: string[];
  };
}

export interface OrQuery {
  safety_signals: SafetySignals;
}

export interface SafetySignals {
  unusual_dm_activity_until: {
    range: {
      gte: number;
    };
  };
  communication_disabled_until: {
    range: {
      gte: number;
    };
  };
  unusual_account_activity: boolean;
  automod_quarantined_username: boolean;
}

export enum JoinSourceType {
  Unknown = 0,
  BotInvite = 1,
  // Undefined = 2,
  ServerDiscovery = 3,
  StudentHub = 4,
  Invite = 5,
  VanityURL = 6,
  ManualVerification = 7,
}
