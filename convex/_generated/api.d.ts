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
} from 'convex/server'
import type * as actions from '../actions.js'
import type * as analyses from '../analyses.js'
import type * as analysis_utils from '../analysis-utils.js'
import type * as conversations from '../conversations.js'
import type * as messages from '../messages.js'
import type * as openai from '../openai.js'
import type * as prompts from '../prompts.js'
import type * as utils from '../utils.js'

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  actions: typeof actions
  analyses: typeof analyses
  'analysis-utils': typeof analysis_utils
  conversations: typeof conversations
  messages: typeof messages
  openai: typeof openai
  prompts: typeof prompts
  utils: typeof utils
}>
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'public'>
>
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'internal'>
>
