/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiEngine from "../aiEngine.js";
import type * as auth from "../auth.js";
import type * as connections from "../connections.js";
import type * as contentQueue from "../contentQueue.js";
import type * as contents from "../contents.js";
import type * as generateContent from "../generateContent.js";
import type * as helpers from "../helpers.js";
import type * as instagramConnection from "../instagramConnection.js";
import type * as instagramEngine from "../instagramEngine.js";
import type * as logs from "../logs.js";
import type * as mediaEngine from "../mediaEngine.js";
import type * as originalityCheck from "../originalityCheck.js";
import type * as pixabayEngine from "../pixabayEngine.js";
import type * as policyCheck from "../policyCheck.js";
import type * as scheduler from "../scheduler.js";
import type * as seoEngine from "../seoEngine.js";
import type * as settings from "../settings.js";
import type * as tasks from "../tasks.js";
import type * as tiktokConnection from "../tiktokConnection.js";
import type * as tiktokEngine from "../tiktokEngine.js";
import type * as videoPipeline from "../videoPipeline.js";
import type * as youtubeAutomation from "../youtubeAutomation.js";
import type * as youtubeEngine from "../youtubeEngine.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiEngine: typeof aiEngine;
  auth: typeof auth;
  connections: typeof connections;
  contentQueue: typeof contentQueue;
  contents: typeof contents;
  generateContent: typeof generateContent;
  helpers: typeof helpers;
  instagramConnection: typeof instagramConnection;
  instagramEngine: typeof instagramEngine;
  logs: typeof logs;
  mediaEngine: typeof mediaEngine;
  originalityCheck: typeof originalityCheck;
  pixabayEngine: typeof pixabayEngine;
  policyCheck: typeof policyCheck;
  scheduler: typeof scheduler;
  seoEngine: typeof seoEngine;
  settings: typeof settings;
  tasks: typeof tasks;
  tiktokConnection: typeof tiktokConnection;
  tiktokEngine: typeof tiktokEngine;
  videoPipeline: typeof videoPipeline;
  youtubeAutomation: typeof youtubeAutomation;
  youtubeEngine: typeof youtubeEngine;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
