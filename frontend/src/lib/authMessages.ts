// Fixed copy for auth and onboarding notices. Pages render only text from this
// table, keyed by a code in the URL, so a crafted ?error=... link cannot place
// arbitrary text (e.g. a phishing instruction) on our login or signup screens.

export const MIN_PASSWORD_LENGTH = 8;

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Incorrect email or password.',
  auth_failed: 'Authentication failed. Please try again.',
  callback_failed: 'Could not verify your sign-in link. Please log in again.',
  password_mismatch: 'Passwords do not match.',
  weak_password: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  signup_failed: 'Could not create the account. Please check your details and try again.',
  check_email: 'Please check your email to confirm your account.',
  box_exists: 'A box with this name already exists.',
  box_limit: 'You have reached the maximum number of boxes. Delete one to create another.',
  box_failed: 'Could not create the box. Please try again.',
};

export function authMessage(code?: string | null): string | null {
  return (code && Object.prototype.hasOwnProperty.call(AUTH_MESSAGES, code) && AUTH_MESSAGES[code]) || null;
}
