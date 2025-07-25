/**
 * Input validation and sanitization for message content and user inputs
 * Implements guardrails to prevent hallucination and ensure analysis quality standards
 */

export interface ContentValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedContent?: string
  riskLevel: 'low' | 'medium' | 'high'
  contentFlags: ContentFlag[]
}

export interface ContentFlag {
  type:
    | 'inappropriate'
    | 'spam'
    | 'injection'
    | 'too_long'
    | 'too_short'
    | 'encoding'
    | 'suspicious_patterns'
  severity: 'low' | 'medium' | 'high'
  description: string
  position?: number
}

// Content validation rules and limits
export const CONTENT_VALIDATION_RULES = {
  minLength: 1,
  maxLength: 5000, // Prevent extremely long inputs that could cause issues
  maxLines: 100, // Prevent formatted text attacks
  allowedCharacters:
    /^[\u0020-\u007E\u00A0-\u024F\u1E00-\u1EFF\u2000-\u206F\u20A0-\u20CF\u2100-\u214F\u2190-\u21FF\u2200-\u22FF\u2300-\u23FF\u2460-\u24FF\u25A0-\u25FF\u2600-\u26FF\u2700-\u27BF\u2800-\u28FF\u2900-\u297F\u2980-\u29FF\u2A00-\u2AFF\u2B00-\u2BFF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\u00C0-\u00FF\s]*$/,

  // Patterns that suggest potential prompt injection attempts
  suspiciousPatterns: [
    /ignore\s+previous\s+instructions/i,
    /system\s*:\s*you\s+are/i,
    /\{\{[^}]*\}\}/g, // Template injection patterns
    /<script[\s\S]*?<\/script>/gi,
    /javascript\s*:/i,
    /data\s*:\s*text\/html/i,
    /eval\s*\(/i,
    /function\s*\(/i,
    /=\s*\$\{[^}]*\}/g, // Template literal injection
    /\$\([^)]*\)/g, // Shell command injection patterns
  ],

  // Patterns indicating inappropriate content
  inappropriatePatterns: [
    /\b(hate|violence|threat|harm|kill|die|death)\b/i,
    /\b(porn|sex|nude|explicit)\b/i,
    // Add more patterns as needed for content policy
  ],

  // Spam detection patterns
  spamPatterns: [
    /(.)\1{10,}/g, // Repeated characters
    /\b(buy|sale|offer|deal|click|link|visit)\b.*\b(now|today|urgent)\b/i,
    /\b(www\.|http|\.com|\.net|\.org)\b/g,
  ],
}

/**
 * Validates and sanitizes message content before analysis
 */
export function validateMessageContent(
  content: string
): ContentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const contentFlags: ContentFlag[] = []
  let riskLevel: 'low' | 'medium' | 'high' = 'low'

  // Basic null/undefined check
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      errors: ['Message content is required and must be a string'],
      warnings: [],
      riskLevel: 'high',
      contentFlags: [],
    }
  }

  const trimmedContent = content.trim()

  // Length validation
  if (trimmedContent.length < CONTENT_VALIDATION_RULES.minLength) {
    errors.push('Message content is too short to analyze meaningfully')
  }

  if (trimmedContent.length > CONTENT_VALIDATION_RULES.maxLength) {
    errors.push(
      `Message content exceeds maximum length of ${CONTENT_VALIDATION_RULES.maxLength} characters`
    )
    contentFlags.push({
      type: 'too_long',
      severity: 'high',
      description: `Content length: ${trimmedContent.length} characters`,
    })
    riskLevel = 'high'
  }

  // Line count validation (prevent formatted text attacks)
  const lineCount = trimmedContent.split('\n').length
  if (lineCount > CONTENT_VALIDATION_RULES.maxLines) {
    contentFlags.push({
      type: 'suspicious_patterns',
      severity: 'medium',
      description: `Excessive line breaks: ${lineCount} lines`,
    })
    warnings.push('Message contains unusually many line breaks')
    riskLevel = 'medium'
  }

  // Character encoding validation
  if (!CONTENT_VALIDATION_RULES.allowedCharacters.test(trimmedContent)) {
    contentFlags.push({
      type: 'encoding',
      severity: 'medium',
      description: 'Contains potentially problematic characters',
    })
    warnings.push(
      'Message contains unusual characters that may affect analysis'
    )
    riskLevel = 'medium'
  }

  // Check for suspicious patterns (potential prompt injection)
  for (const pattern of CONTENT_VALIDATION_RULES.suspiciousPatterns) {
    const matches = trimmedContent.match(pattern)
    if (matches) {
      contentFlags.push({
        type: 'injection',
        severity: 'high',
        description: `Potential prompt injection pattern detected: ${matches[0]}`,
        position: trimmedContent.indexOf(matches[0]),
      })
      riskLevel = 'high'
    }
  }

  // Check for inappropriate content
  for (const pattern of CONTENT_VALIDATION_RULES.inappropriatePatterns) {
    const matches = trimmedContent.match(pattern)
    if (matches) {
      contentFlags.push({
        type: 'inappropriate',
        severity: 'high',
        description: `Inappropriate content detected: ${matches[0]}`,
        position: trimmedContent.indexOf(matches[0]),
      })
      riskLevel = 'high'
    }
  }

  // Check for spam patterns
  let spamScore = 0
  for (const pattern of CONTENT_VALIDATION_RULES.spamPatterns) {
    const matches = trimmedContent.match(pattern)
    if (matches) {
      spamScore += matches.length
      contentFlags.push({
        type: 'spam',
        severity: 'low',
        description: `Potential spam pattern: ${matches[0]}`,
        position: trimmedContent.indexOf(matches[0]),
      })
    }
  }

  if (spamScore > 3) {
    warnings.push('Message contains patterns commonly associated with spam')
    riskLevel = riskLevel === 'high' ? 'high' : 'medium'
  }

  // Block analysis for high-risk content
  const highRiskFlags = contentFlags.filter(flag => flag.severity === 'high')
  if (highRiskFlags.length > 0) {
    errors.push('Message content contains patterns that prevent safe analysis')
  }

  // Create sanitized content
  let sanitizedContent = trimmedContent

  // Basic sanitization - remove null bytes, control characters, etc.
  sanitizedContent = sanitizedContent
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters except newline and tab
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n') // Convert remaining CR to LF
    .trim()

  // Truncate if too long (for warnings, not errors)
  if (sanitizedContent.length > CONTENT_VALIDATION_RULES.maxLength) {
    sanitizedContent = sanitizedContent.substring(
      0,
      CONTENT_VALIDATION_RULES.maxLength
    )
    warnings.push('Content was truncated to maximum allowed length')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedContent,
    riskLevel,
    contentFlags,
  }
}

/**
 * Validates prompt configuration to prevent injection or manipulation
 */
export function validatePromptConfig(config: any): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!config || typeof config !== 'object') {
    return { isValid: true, errors: [] } // Optional parameter
  }

  // Validate variant
  if (
    config.variant &&
    ![
      'standard',
      'question_focused',
      'confidence_calibrated',
      'context_aware',
    ].includes(config.variant)
  ) {
    errors.push('Invalid prompt variant specified')
  }

  // Validate mode
  if (
    config.mode &&
    !['production', 'testing', 'a_b_test'].includes(config.mode)
  ) {
    errors.push('Invalid prompt mode specified')
  }

  // Validate experimentId (if provided)
  if (
    config.experimentId &&
    (typeof config.experimentId !== 'string' ||
      config.experimentId.length > 100)
  ) {
    errors.push('Experiment ID must be a string with maximum 100 characters')
  }

  return { isValid: errors.length === 0, errors }
}

/**
 * Validates user and team identifiers
 */
export function validateIdentifiers(
  userId: string,
  teamId?: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate userId
  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    errors.push('Valid user ID is required')
  } else if (userId.length > 100) {
    errors.push('User ID exceeds maximum length')
  }

  // Validate teamId if provided
  if (teamId !== undefined) {
    if (typeof teamId !== 'string' || teamId.length === 0) {
      errors.push('Team ID must be a non-empty string when provided')
    } else if (teamId.length > 100) {
      errors.push('Team ID exceeds maximum length')
    }
  }

  return { isValid: errors.length === 0, errors }
}

/**
 * Comprehensive input validation for the analyzeMessage action
 */
export function validateAnalysisInput(args: {
  content: string
  userId: string
  conversationId: string
  teamId?: string
  promptConfig?: any
  useContext?: boolean
}): {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedArgs?: typeof args
  riskLevel: 'low' | 'medium' | 'high'
} {
  const allErrors: string[] = []
  const allWarnings: string[] = []
  let overallRiskLevel: 'low' | 'medium' | 'high' = 'low'

  // Validate message content
  const contentValidation = validateMessageContent(args.content)
  allErrors.push(...contentValidation.errors)
  allWarnings.push(...contentValidation.warnings)

  if (contentValidation.riskLevel === 'high') {
    overallRiskLevel = 'high'
  } else if (
    contentValidation.riskLevel === 'medium' &&
    overallRiskLevel !== 'high'
  ) {
    overallRiskLevel = 'medium'
  }

  // Validate prompt configuration
  const promptValidation = validatePromptConfig(args.promptConfig)
  allErrors.push(...promptValidation.errors)

  // Validate identifiers
  const idValidation = validateIdentifiers(args.userId, args.teamId)
  allErrors.push(...idValidation.errors)

  // Validate conversationId
  if (
    !args.conversationId ||
    typeof args.conversationId !== 'string' ||
    args.conversationId.length === 0
  ) {
    allErrors.push('Valid conversation ID is required')
  }

  // Create sanitized arguments if validation passes
  let sanitizedArgs
  if (allErrors.length === 0 && contentValidation.sanitizedContent) {
    sanitizedArgs = {
      ...args,
      content: contentValidation.sanitizedContent,
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    sanitizedArgs,
    riskLevel: overallRiskLevel,
  }
}
