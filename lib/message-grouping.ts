import { Message } from '@/types'

/**
 * Configuration for message grouping behavior
 */
export interface MessageGroupingConfig {
  /** Time threshold in milliseconds for grouping messages (default: 5 minutes) */
  groupingThreshold: number
  /** Time threshold in milliseconds for showing timestamps (default: 5 minutes) */
  timestampThreshold: number
  /** Maximum number of consecutive messages to group (default: 10) */
  maxGroupSize: number
}

export const DEFAULT_GROUPING_CONFIG: MessageGroupingConfig = {
  groupingThreshold: 5 * 60 * 1000, // 5 minutes
  timestampThreshold: 5 * 60 * 1000, // 5 minutes
  maxGroupSize: 10,
}

/**
 * Represents a processed message with grouping metadata
 */
export interface ProcessedMessage extends Message {
  /** Whether this is the first message in a group from this sender */
  isFirstInGroup: boolean
  /** Whether this is the last message in a group from this sender */
  isLastInGroup: boolean
  /** Whether to show the avatar for this message */
  showAvatar: boolean
  /** Whether to show the timestamp for this message */
  showTimestamp: boolean
  /** The variant to use for rendering (default, compact, grouped) */
  variant: 'default' | 'compact' | 'grouped'
  /** Group ID for this message (consecutive messages from same sender) */
  groupId: string
  /** Position within the group (0-indexed) */
  groupPosition: number
  /** Total messages in this group */
  groupSize: number
}

/**
 * Processes an array of messages to add grouping and timestamp logic
 *
 * @param messages - Array of messages in chronological order (oldest first)
 * @param config - Configuration options for grouping behavior
 * @returns Array of processed messages with grouping metadata
 */
export function processMessagesForGrouping(
  messages: Message[],
  config: MessageGroupingConfig = DEFAULT_GROUPING_CONFIG
): ProcessedMessage[] {
  if (messages.length === 0) {
    return []
  }

  const processedMessages: ProcessedMessage[] = []
  let currentGroupId = 0
  let currentGroupMessages: ProcessedMessage[] = []
  let lastTimestampShown = 0

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    const previousMessage = messages[i - 1]
    const nextMessage = messages[i + 1]

    // Determine if this message should start a new group
    const shouldStartNewGroup =
      !previousMessage ||
      previousMessage.userId !== message.userId ||
      message.timestamp - previousMessage.timestamp >
        config.groupingThreshold ||
      currentGroupMessages.length >= config.maxGroupSize

    // Start new group if needed
    if (shouldStartNewGroup) {
      // Finalize previous group
      if (currentGroupMessages.length > 0) {
        finalizeMessageGroup(currentGroupMessages)
        processedMessages.push(...currentGroupMessages)
      }

      // Start new group
      currentGroupId++
      currentGroupMessages = []
    }

    // Determine if timestamp should be shown
    const shouldShowTimestamp =
      i === 0 || // Always show for first message
      shouldStartNewGroup || // Show for first message in new group
      message.timestamp - lastTimestampShown >= config.timestampThreshold

    if (shouldShowTimestamp) {
      lastTimestampShown = message.timestamp
    }

    // Create processed message
    const processedMessage: ProcessedMessage = {
      ...message,
      isFirstInGroup: shouldStartNewGroup,
      isLastInGroup: false, // Will be set when finalizing group
      showAvatar: shouldStartNewGroup, // Show avatar only for first in group
      showTimestamp: shouldShowTimestamp,
      variant: shouldStartNewGroup ? 'default' : 'grouped',
      groupId: `group-${currentGroupId}`,
      groupPosition: currentGroupMessages.length,
      groupSize: 0, // Will be set when finalizing group
    }

    currentGroupMessages.push(processedMessage)
  }

  // Finalize the last group
  if (currentGroupMessages.length > 0) {
    finalizeMessageGroup(currentGroupMessages)
    processedMessages.push(...currentGroupMessages)
  }

  return processedMessages
}

/**
 * Finalizes a group of messages by setting group metadata
 */
function finalizeMessageGroup(groupMessages: ProcessedMessage[]): void {
  const groupSize = groupMessages.length

  groupMessages.forEach((message, index) => {
    message.groupSize = groupSize
    message.isLastInGroup = index === groupSize - 1

    // Adjust variant based on group size and position
    if (groupSize === 1) {
      message.variant = 'default'
    } else if (index === 0) {
      message.variant = 'default' // First message uses default styling
    } else {
      message.variant = 'grouped' // Subsequent messages use grouped styling
    }
  })
}

/**
 * Determines if two messages should be grouped together
 */
export function shouldGroupMessages(
  prevMessage: Message,
  currentMessage: Message,
  config: MessageGroupingConfig = DEFAULT_GROUPING_CONFIG
): boolean {
  // Different users should not be grouped
  if (prevMessage.userId !== currentMessage.userId) {
    return false
  }

  // Check time threshold
  const timeDiff = currentMessage.timestamp - prevMessage.timestamp
  if (timeDiff > config.groupingThreshold) {
    return false
  }

  return true
}

/**
 * Determines if a timestamp should be shown for a message
 */
export function shouldShowTimestamp(
  message: Message,
  previousMessage: Message | null,
  lastTimestampShown: number,
  config: MessageGroupingConfig = DEFAULT_GROUPING_CONFIG
): boolean {
  // Always show timestamp for first message
  if (!previousMessage) {
    return true
  }

  // Show timestamp if enough time has passed since last shown timestamp
  const timeSinceLastTimestamp = message.timestamp - lastTimestampShown
  if (timeSinceLastTimestamp >= config.timestampThreshold) {
    return true
  }

  // Show timestamp if this is the start of a new group
  if (!shouldGroupMessages(previousMessage, message, config)) {
    return true
  }

  return false
}

/**
 * Groups consecutive messages by the same sender
 */
export function groupConsecutiveMessages(messages: Message[]): Message[][] {
  if (messages.length === 0) {
    return []
  }

  const groups: Message[][] = []
  let currentGroup: Message[] = [messages[0]]

  for (let i = 1; i < messages.length; i++) {
    const currentMessage = messages[i]
    const previousMessage = messages[i - 1]

    if (shouldGroupMessages(previousMessage, currentMessage)) {
      currentGroup.push(currentMessage)
    } else {
      groups.push(currentGroup)
      currentGroup = [currentMessage]
    }
  }

  // Add the last group
  groups.push(currentGroup)

  return groups
}

/**
 * Creates a smart timestamp display configuration for a list of messages
 */
export function createTimestampDisplayConfig(
  messages: Message[],
  config: MessageGroupingConfig = DEFAULT_GROUPING_CONFIG
): Record<string, boolean> {
  const timestampConfig: Record<string, boolean> = {}
  let lastTimestampShown = 0

  messages.forEach((message, index) => {
    const previousMessage = index > 0 ? messages[index - 1] : null
    const shouldShow = shouldShowTimestamp(
      message,
      previousMessage,
      lastTimestampShown,
      config
    )

    timestampConfig[message._id] = shouldShow

    if (shouldShow) {
      lastTimestampShown = message.timestamp
    }
  })

  return timestampConfig
}
