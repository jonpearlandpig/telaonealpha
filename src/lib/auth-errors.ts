const SIGN_IN_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  invalid_state: 'Your sign-in request expired or could not be verified. Please try again.',
  oauth_denied: 'Google sign-in was cancelled. You can try again when you are ready.',
  no_code: 'Google did not return a sign-in code. Please try again.',
  token_exchange_failed: 'Google could not complete sign-in. Please try again.',
  userinfo_failed: 'Google signed you in, but your profile could not be loaded. Please try again.',
  unverified_email: 'Your Google account needs a verified email address to use ShowTela.',
  auth_failed: 'Sign-in is temporarily unavailable. Please try again.',
}

export function getSignInErrorMessage(error: string | string[] | undefined): string | null {
  const errorCode = Array.isArray(error) ? error[0] : error
  if (!errorCode) return null
  return SIGN_IN_ERROR_MESSAGES[errorCode] ?? 'Sign-in could not be completed. Please try again.'
}
