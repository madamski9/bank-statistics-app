/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as changeRules from "../changeRules.js";
import type * as crons from "../crons.js";
import type * as devices from "../devices.js";
import type * as exchangeRates from "../exchangeRates.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as owner from "../owner.js";
import type * as owners from "../owners.js";
import type * as profiles from "../profiles.js";
import type * as sessionToken from "../sessionToken.js";
import type * as sync from "../sync.js";
import type * as webhookSignature from "../webhookSignature.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  changeRules: typeof changeRules;
  crons: typeof crons;
  devices: typeof devices;
  exchangeRates: typeof exchangeRates;
  http: typeof http;
  migrations: typeof migrations;
  owner: typeof owner;
  owners: typeof owners;
  profiles: typeof profiles;
  sessionToken: typeof sessionToken;
  sync: typeof sync;
  webhookSignature: typeof webhookSignature;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
