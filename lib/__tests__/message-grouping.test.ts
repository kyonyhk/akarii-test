import {
  processMessagesForGrouping,
  shouldGroupMessages,
  shouldShowTimestamp,
  groupConsecutiveMessages,
  createTimestampDisplayConfig,
  DEFAULT_GROUPING_CONFIG,
  MessageGroupingConfig,
} from '../message-grouping'
import { Message } from '@/types'
import type { Id } from '@/convex/_generated/dataModel'

// Helper function to create mock messages
function createMockMessage(
  id: string,
  userId: string,
  content: string,
  timestamp: number
): Message {
  return {
    _id: id as Id<'messages'>,
    content,
    userId,
    conversationId: 'conv-1',
    timestamp,
  }
}

describe('message-grouping', () => {
  const baseTime = new Date('2024-01-01T10:00:00Z').getTime()
  const fiveMinutes = 5 * 60 * 1000
  const tenMinutes = 10 * 60 * 1000

  describe('shouldGroupMessages', () => {
    it('should group messages from same user within time threshold', () => {
      const msg1 = createMockMessage('1', 'user-1', 'Hello', baseTime)
      const msg2 = createMockMessage(
        '2',
        'user-1',
        'How are you?',
        baseTime + fiveMinutes
      )

      expect(shouldGroupMessages(msg1, msg2)).toBe(true)
    })

    it('should not group messages from different users', () => {
      const msg1 = createMockMessage('1', 'user-1', 'Hello', baseTime)
      const msg2 = createMockMessage('2', 'user-2', 'Hi there', baseTime + 1000)

      expect(shouldGroupMessages(msg1, msg2)).toBe(false)
    })

    it('should not group messages beyond time threshold', () => {
      const msg1 = createMockMessage('1', 'user-1', 'Hello', baseTime)
      const msg2 = createMockMessage(
        '2',
        'user-1',
        'Anyone there?',
        baseTime + tenMinutes
      )

      expect(shouldGroupMessages(msg1, msg2)).toBe(false)
    })

    it('should respect custom time threshold', () => {
      const config: MessageGroupingConfig = {
        ...DEFAULT_GROUPING_CONFIG,
        groupingThreshold: 10 * 60 * 1000, // 10 minutes
      }

      const msg1 = createMockMessage('1', 'user-1', 'Hello', baseTime)
      const msg2 = createMockMessage(
        '2',
        'user-1',
        'Still here',
        baseTime + 8 * 60 * 1000
      )

      expect(shouldGroupMessages(msg1, msg2, config)).toBe(true)
    })
  })

  describe('shouldShowTimestamp', () => {
    it('should show timestamp for first message', () => {
      const msg = createMockMessage('1', 'user-1', 'Hello', baseTime)

      expect(shouldShowTimestamp(msg, null, 0)).toBe(true)
    })

    it('should show timestamp when enough time has passed', () => {
      const msg1 = createMockMessage('1', 'user-1', 'Hello', baseTime)
      const msg2 = createMockMessage(
        '2',
        'user-1',
        'World',
        baseTime + tenMinutes
      )

      expect(shouldShowTimestamp(msg2, msg1, baseTime)).toBe(true)
    })

    it('should not show timestamp for grouped messages within threshold', () => {
      const msg1 = createMockMessage('1', 'user-1', 'Hello', baseTime)
      const msg2 = createMockMessage('2', 'user-1', 'World', baseTime + 1000)

      expect(shouldShowTimestamp(msg2, msg1, baseTime)).toBe(false)
    })

    it('should show timestamp when starting new group (different user)', () => {
      const msg1 = createMockMessage('1', 'user-1', 'Hello', baseTime)
      const msg2 = createMockMessage('2', 'user-2', 'Hi', baseTime + 1000)

      expect(shouldShowTimestamp(msg2, msg1, baseTime)).toBe(true)
    })
  })

  describe('groupConsecutiveMessages', () => {
    it('should return empty array for no messages', () => {
      expect(groupConsecutiveMessages([])).toEqual([])
    })

    it('should group consecutive messages from same user', () => {
      const messages = [
        createMockMessage('1', 'user-1', 'Hello', baseTime),
        createMockMessage('2', 'user-1', 'How are you?', baseTime + 1000),
        createMockMessage('3', 'user-2', 'Hi there', baseTime + 2000),
        createMockMessage('4', 'user-2', 'Good morning', baseTime + 3000),
        createMockMessage('5', 'user-1', 'Bye', baseTime + 4000),
      ]

      const groups = groupConsecutiveMessages(messages)

      expect(groups).toHaveLength(3)
      expect(groups[0]).toHaveLength(2) // user-1: messages 1-2
      expect(groups[1]).toHaveLength(2) // user-2: messages 3-4
      expect(groups[2]).toHaveLength(1) // user-1: message 5
    })

    it('should not group messages beyond time threshold', () => {
      const messages = [
        createMockMessage('1', 'user-1', 'Hello', baseTime),
        createMockMessage(
          '2',
          'user-1',
          'Anyone there?',
          baseTime + tenMinutes
        ),
      ]

      const groups = groupConsecutiveMessages(messages)

      expect(groups).toHaveLength(2)
      expect(groups[0]).toHaveLength(1)
      expect(groups[1]).toHaveLength(1)
    })
  })

  describe('createTimestampDisplayConfig', () => {
    it('should create correct timestamp display configuration', () => {
      const messages = [
        createMockMessage('1', 'user-1', 'Hello', baseTime),
        createMockMessage('2', 'user-1', 'World', baseTime + 1000),
        createMockMessage('3', 'user-2', 'Hi', baseTime + 2000),
        createMockMessage('4', 'user-1', 'Bye', baseTime + tenMinutes),
      ]

      const config = createTimestampDisplayConfig(messages)

      expect(config['1']).toBe(true) // First message
      expect(config['2']).toBe(false) // Grouped with previous
      expect(config['3']).toBe(true) // Different user
      expect(config['4']).toBe(true) // Time threshold exceeded
    })
  })

  describe('processMessagesForGrouping', () => {
    it('should process empty message array', () => {
      const result = processMessagesForGrouping([])
      expect(result).toEqual([])
    })

    it('should process single message correctly', () => {
      const messages = [createMockMessage('1', 'user-1', 'Hello', baseTime)]

      const result = processMessagesForGrouping(messages)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        _id: '1',
        isFirstInGroup: true,
        isLastInGroup: true,
        showAvatar: true,
        showTimestamp: true,
        variant: 'default',
        groupSize: 1,
        groupPosition: 0,
      })
    })

    it('should process consecutive messages from same user', () => {
      const messages = [
        createMockMessage('1', 'user-1', 'Hello', baseTime),
        createMockMessage('2', 'user-1', 'How are you?', baseTime + 1000),
        createMockMessage('3', 'user-1', 'Are you there?', baseTime + 2000),
      ]

      const result = processMessagesForGrouping(messages)

      expect(result).toHaveLength(3)

      // First message
      expect(result[0]).toMatchObject({
        isFirstInGroup: true,
        isLastInGroup: false,
        showAvatar: true,
        showTimestamp: true,
        variant: 'default',
        groupSize: 3,
        groupPosition: 0,
      })

      // Middle message
      expect(result[1]).toMatchObject({
        isFirstInGroup: false,
        isLastInGroup: false,
        showAvatar: false,
        showTimestamp: false,
        variant: 'grouped',
        groupSize: 3,
        groupPosition: 1,
      })

      // Last message
      expect(result[2]).toMatchObject({
        isFirstInGroup: false,
        isLastInGroup: true,
        showAvatar: false,
        showTimestamp: false,
        variant: 'grouped',
        groupSize: 3,
        groupPosition: 2,
      })
    })

    it('should handle messages from different users', () => {
      const messages = [
        createMockMessage('1', 'user-1', 'Hello', baseTime),
        createMockMessage('2', 'user-2', 'Hi there', baseTime + 1000),
        createMockMessage('3', 'user-1', 'How are you?', baseTime + 2000),
      ]

      const result = processMessagesForGrouping(messages)

      expect(result).toHaveLength(3)

      // Each message should start its own group
      result.forEach(msg => {
        expect(msg.isFirstInGroup).toBe(true)
        expect(msg.isLastInGroup).toBe(true)
        expect(msg.showAvatar).toBe(true)
        expect(msg.showTimestamp).toBe(true)
        expect(msg.variant).toBe('default')
        expect(msg.groupSize).toBe(1)
      })
    })

    it('should respect max group size limit', () => {
      const config: MessageGroupingConfig = {
        ...DEFAULT_GROUPING_CONFIG,
        maxGroupSize: 2,
      }

      const messages = [
        createMockMessage('1', 'user-1', 'Message 1', baseTime),
        createMockMessage('2', 'user-1', 'Message 2', baseTime + 1000),
        createMockMessage('3', 'user-1', 'Message 3', baseTime + 2000),
      ]

      const result = processMessagesForGrouping(messages, config)

      expect(result).toHaveLength(3)

      // First two messages should be grouped
      expect(result[0].groupSize).toBe(2)
      expect(result[1].groupSize).toBe(2)

      // Third message should start new group
      expect(result[2].isFirstInGroup).toBe(true)
      expect(result[2].groupSize).toBe(1)
    })

    it('should handle time threshold correctly', () => {
      const messages = [
        createMockMessage('1', 'user-1', 'Hello', baseTime),
        createMockMessage('2', 'user-1', 'Quick follow-up', baseTime + 1000),
        createMockMessage(
          '3',
          'user-1',
          'After long pause',
          baseTime + tenMinutes
        ),
      ]

      const result = processMessagesForGrouping(messages)

      expect(result).toHaveLength(3)

      // First two should be grouped
      expect(result[0].groupSize).toBe(2)
      expect(result[1].groupSize).toBe(2)

      // Third should start new group due to time threshold
      expect(result[2].isFirstInGroup).toBe(true)
      expect(result[2].groupSize).toBe(1)
    })

    it('should show timestamps appropriately', () => {
      const messages = [
        createMockMessage('1', 'user-1', 'Hello', baseTime),
        createMockMessage('2', 'user-1', 'Quick message', baseTime + 1000),
        createMockMessage('3', 'user-2', 'Different user', baseTime + 2000),
        createMockMessage(
          '4',
          'user-1',
          'After time gap',
          baseTime + tenMinutes
        ),
      ]

      const result = processMessagesForGrouping(messages)

      expect(result[0].showTimestamp).toBe(true) // First message
      expect(result[1].showTimestamp).toBe(false) // Grouped with first
      expect(result[2].showTimestamp).toBe(true) // Different user
      expect(result[3].showTimestamp).toBe(true) // Time threshold exceeded
    })
  })
})
