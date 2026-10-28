import {
  getSessionUser,
  signInPath,
  signOutPath,
  type SessionUser,
} from '@/lib/auth';

/** @deprecated Prefer SessionUser from lib/auth — kept for older imports. */
export type ChatGPTUser = SessionUser;

export async function getChatGPTUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

export async function requireChatGPTUser(returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user) return user;
  const { redirect } = await import('next/navigation');
  redirect(signInPath(returnTo));
  throw new Error('SIGN_IN');
}

export function chatGPTSignInPath(returnTo: string) {
  return signInPath(returnTo);
}

export function chatGPTSignOutPath(returnTo = '/') {
  return signOutPath(returnTo);
}
