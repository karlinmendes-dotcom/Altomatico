/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as contents from "../contents.js";
import type * as tasks from "../tasks.js";
import type * as settings from "../settings.js";
import type * as logs from "../logs.js";
import type * as generateContent from "../generateContent.js";
import type * as aiEngine from "../aiEngine.js";
import type * as seoEngine from "../seoEngine.js";
import type * as instagramEngine from "../instagramEngine.js";
import type * as youtubeEngine from "../youtubeEngine.js";
import type * as youtubeAutomation from "../youtubeAutomation.js";
import type * as pixabayEngine from "../pixabayEngine.js";
import type * as videoPipeline from "../videoPipeline.js";
import type * as scheduler from "../scheduler.js";
import type * as policyCheck from "../policyCheck.js";
import type * as originalityCheck from "../originalityCheck.js";

declare const fullApi: ApiFromModules<{
  contents: typeof contents;
  tasks: typeof tasks;
  settings: typeof settings;
  logs: typeof logs;
  generateContent: typeof generateContent;
  aiEngine: typeof aiEngine;
  seoEngine: typeof seoEngine;
  instagramEngine: typeof instagramEngine;
  youtubeEngine: typeof youtubeEngine;
  youtubeAutomation: typeof youtubeAutomation;
  pixabayEngine: typeof pixabayEngine;
  videoPipeline: typeof videoPipeline;
  scheduler: typeof scheduler;
  policyCheck: typeof policyCheck;
  originalityCheck: typeof originalityCheck;
}>;

export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
