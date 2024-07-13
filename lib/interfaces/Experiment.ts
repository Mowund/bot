export interface Experiment {
  data: Data;
  rollout?: ExperimentRollout;
}

export interface Data {
  kind: Kind;
  hash: number;
  holdout: Holdout;
  aa_mode: boolean;
  id?: string;
  label?: string;
  description?: string[];
  buckets?: number[];
  config_keys?: string[];
}

export interface Holdout {
  name?: null | string;
  bucket?: number | null;
}

export enum Kind {
  Guild = 'guild',
  User = 'user',
}

export interface ExperimentRollout {
  populations: Population[];
  revision: number;
  overrides: Record<'none' | `${number}`, string[]>;
  overrides_formatted: OverridesFormatted[];
}

export interface OverridesFormatted {
  buckets: Record<'none' | `${number}`, Bucket>;
  filters: OverridesFormattedFilter[];
}

export interface Bucket {
  rollout: RolloutElement[];
}

export interface RolloutElement {
  start: number;
  end: number;
}

export interface OverridesFormattedFilter {
  type: FilterType;
  features?: string[];
  ids?: string[];
  min_count?: number;
  max_count?: null;
}

export enum FilterType {
  GuildHasFeature = 'guild_has_feature',
  GuildIDS = 'guild_ids',
  GuildMemberCountRange = 'guild_member_count_range',
}

export interface Population {
  buckets: Record<'none' | `${number}`, Bucket>;
  filters: PopulationFilter[];
}

export interface PopulationFilter {
  type: PopulationType;
  features?: string[];
  hash_key?: number;
  target?: number;
  hub_types?: number[];
  min_count?: number;
  max_count?: number | null;
  has_vanity?: boolean;
}

export enum PopulationType {
  GuildHasFeature = 'guild_has_feature',
  GuildHasVanityURL = 'guild_has_vanity_url',
  GuildHubTypes = 'guild_hub_types',
  GuildInRangeByHash = 'guild_in_range_by_hash',
  GuildMemberCountRange = 'guild_member_count_range',
}
