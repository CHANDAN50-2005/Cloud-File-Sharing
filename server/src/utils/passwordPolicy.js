const TRIVIALLY_WEAK_PASSWORDS = new Set([
  'password123',
  'password1234',
  '1234567890',
  '12345678901',
  'qwerty12345',
  'admin123456',
  'welcome1234',
  'administrator',
  'letmein12345',
  'changeme1234'
]);

/**
 * Validates a password against SecureCloud security policies:
 * - Minimum 10 characters
 * - Maximum 128 characters
 * - Rejection of common trivially weak passwords
 * @param {string} password
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePasswordStrength(password) {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }

  if (password.length < 10) {
    return { valid: false, error: 'Password must be at least 10 characters long' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must not exceed 128 characters' };
  }

  const normalized = password.toLowerCase().trim();
  if (TRIVIALLY_WEAK_PASSWORDS.has(normalized)) {
    return { valid: false, error: 'Password is too common and easily guessable' };
  }

  // Reject all single repeated character strings like "aaaaaaaaaa"
  if (/^(.)\1+$/.test(password)) {
    return { valid: false, error: 'Password cannot consist of a single repeated character' };
  }

  return { valid: true };
}
