import { APIApplication } from 'discord.js';
import { MergeTypes } from '../../src/utils';

export type FullApplication = MergeTypes<RawApplication, APIApplication>;

export interface RawApplication {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: null;
  bot: Bot;
  summary: string;
  is_monetized: boolean;
  guild_id: string;
  bot_public: boolean;
  bot_require_code_grant: boolean;
  install_params: InstallParams;
  integration_types_config: { [key: string]: IntegrationTypesConfig };
  verify_key: string;
  flags: number;
  max_participants: null;
  tags: string[];
  hook: boolean;
  storefront_available: boolean;
  redirect_uris: string[];
  interactions_endpoint_url: null;
  role_connections_verification_url: string;
  owner: Bot;
  approximate_guild_count: number;
  interactions_event_types: any[];
  interactions_version: number;
  explicit_content_filter: number;
  rpc_application_state: number;
  store_application_state: number;
  verification_state: number;
  integration_public: boolean;
  integration_require_code_grant: boolean;
  discoverability_state: number;
  discovery_eligibility_flags: number;
  monetization_state: number;
  monetization_eligibility_flags: number;
  team: Team;
  internal_guild_restriction: number;
}

export interface Bot {
  id: string;
  username: string;
  avatar: null | string;
  discriminator: string;
  public_flags: number;
  flags: number;
  bot?: boolean;
  banner: null | string;
  accent_color: null;
  global_name: null | string;
  avatar_decoration_data: AvatarDecorationData | null;
  banner_color: null;
  clan: null;
}

export interface AvatarDecorationData {
  asset: string;
  sku_id: string;
}

export interface InstallParams {
  scopes: string[];
  permissions: string;
}

export interface IntegrationTypesConfig {
  oauth2_install_params: InstallParams;
}

export interface Team {
  id: string;
  icon: string;
  name: string;
  owner_user_id: string;
  members: Member[];
}

export interface Member {
  user: Bot;
  team_id: string;
  membership_state: number;
  role: string;
  permissions: string[];
}

export interface EmbeddedApplication {
  activity_preview_video_asset_id: null;
  supported_platforms: string[];
  default_orientation_lock_state: number;
  tablet_default_orientation_lock_state: number;
  requires_age_gate: boolean;
  premium_tier_requirement: null;
  free_period_starts_at: null;
  free_period_ends_at: null;
  client_platform_config: ClientPlatformConfig;
  shelf_rank: number;
  has_csp_exception: boolean;
  displays_advertisements: boolean;
  application_id: string;
}

export interface ClientPlatformConfig {
  android: Platform;
  ios: Platform;
  web: Platform;
}

export interface Platform {
  label_type: number;
  label_until: null;
  release_phase: string;
}
