/**
 * Configurable password validation utility
 * Configuration is loaded from environment variables to allow per-deployment customization
 * Supports variable number of regex rules through indexed environment variables
 */

interface PasswordRule {
  regex: RegExp
  message: string
}

interface PasswordValidationConfig {
  minLength: number
  minLengthMessage: string
  rules: PasswordRule[]
}

/**
 * Loads password validation configuration from environment variables
 * Falls back to secure defaults if environment variables are not set
 *
 * Environment variable format:
 * - NEXT_PUBLIC_PASSWORD_MIN_LENGTH: Minimum password length (default: 8)
 * - NEXT_PUBLIC_PASSWORD_MIN_LENGTH_MESSAGE: Custom message for min length
 * - NEXT_PUBLIC_PASSWORD_RULE_COUNT: Number of regex rules (optional, will auto-detect)
 * - NEXT_PUBLIC_PASSWORD_RULE_1_REGEX: First regex pattern
 * - NEXT_PUBLIC_PASSWORD_RULE_1_MESSAGE: First regex error message
 * - NEXT_PUBLIC_PASSWORD_RULE_2_REGEX: Second regex pattern
 * - NEXT_PUBLIC_PASSWORD_RULE_2_MESSAGE: Second regex error message
 * ... and so on for additional rules
 */
function loadPasswordConfig(): PasswordValidationConfig {
  const minLength = process.env.NEXT_PUBLIC_PASSWORD_MIN_LENGTH
    ? parseInt(process.env.NEXT_PUBLIC_PASSWORD_MIN_LENGTH, 10)
    : 8

  const minLengthMessage = process.env.NEXT_PUBLIC_PASSWORD_MIN_LENGTH_MESSAGE
    || `Password must be at least ${minLength} characters long`

  const rules: PasswordRule[] = []

  // Determine rule count - either explicitly set or auto-detect
  const explicitRuleCount = process.env.NEXT_PUBLIC_PASSWORD_RULE_COUNT
    ? parseInt(process.env.NEXT_PUBLIC_PASSWORD_RULE_COUNT, 10)
    : null

  if (explicitRuleCount !== null) {
    // Load exactly the specified number of rules
    for (let i = 1; i <= explicitRuleCount; i++) {
      const regexStr = process.env[`NEXT_PUBLIC_PASSWORD_RULE_${i}_REGEX`]
      const message = process.env[`NEXT_PUBLIC_PASSWORD_RULE_${i}_MESSAGE`]

      if (regexStr && message) {
        try {
          rules.push({
            regex: new RegExp(regexStr),
            message
          })
        } catch (error) {
          console.error(`Invalid regex pattern for rule ${i}: ${regexStr}`, error)
        }
      } else {
        console.warn(`Missing configuration for password rule ${i}`)
      }
    }
  } else {
    // Auto-detect rules by checking consecutive indices
    let i = 1
    while (true) {
      const regexStr = process.env[`NEXT_PUBLIC_PASSWORD_RULE_${i}_REGEX`]
      const message = process.env[`NEXT_PUBLIC_PASSWORD_RULE_${i}_MESSAGE`]

      if (!regexStr || !message) {
        break // Stop when we don't find a complete rule
      }

      try {
        rules.push({
          regex: new RegExp(regexStr),
          message
        })
      } catch (error) {
        console.error(`Invalid regex pattern for rule ${i}: ${regexStr}`, error)
      }

      i++
    }
  }

  // If no rules were configured, use secure defaults
  if (rules.length === 0) {
    rules.push(
      { regex: /[A-Z]/, message: 'Password must contain at least one uppercase letter' },
      { regex: /[a-z]/, message: 'Password must contain at least one lowercase letter' },
      { regex: /[0-9]/, message: 'Password must contain at least one number' },
      { regex: /[^A-Za-z0-9]/, message: 'Password must contain at least one special character' }
    )
  }

  return {
    minLength,
    minLengthMessage,
    rules
  }
}

// Load configuration once at module initialization
const config = loadPasswordConfig()

/**
 * Validates a password against configured rules
 * @param password - The password to validate
 * @returns Error message if validation fails, null if password is valid
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required'
  }

  if (password.length < config.minLength) {
    return config.minLengthMessage
  }

  for (const rule of config.rules) {
    if (!rule.regex.test(password)) {
      return rule.message
    }
  }

  return null
}

/**
 * Gets the current password requirements for display to users
 * @returns Array of requirement descriptions
 */
export function getPasswordRequirements(): string[] {
  const requirements: string[] = [
    config.minLengthMessage
  ]

  for (const rule of config.rules) {
    // Try to make the message more user-friendly for display
    let displayMessage = rule.message
    if (displayMessage.toLowerCase().startsWith('password must')) {
      displayMessage = displayMessage.substring(13).trim() // Remove "Password must" prefix
      displayMessage = displayMessage.charAt(0).toUpperCase() + displayMessage.slice(1)
    }
    requirements.push(displayMessage)
  }

  return requirements
}

/**
 * Gets the password validation configuration (for testing or debugging)
 * @returns The current configuration
 */
export function getPasswordConfig(): PasswordValidationConfig {
  return { ...config }
}
