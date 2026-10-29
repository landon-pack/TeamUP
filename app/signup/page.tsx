'use client';

/**
 * Sign up — create a TeamUP account.
 *
 * Flow:
 * 1. User enters name + email
 * 2. Browser POSTs to /api/auth/signin (same endpoint as Sign in)
 * 3. Server sets a session cookie
 * 4. Browser redirects to /workspace (or ?return_to=…)
 *
 * There is no password. Name + email is enough to open a session.
 * Landing “Sign up” points here; this form is intentionally complete.
 */

import { FormEvent, useState } from 'react';
import {
  DEFAULT_AFTER_AUTH_PATH,
  readReturnToParam,
  startEmailSession,
} from '../../lib/auth-client';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const { returnTo } = await startEmailSession({
        name,
        email,
        returnTo: readReturnToParam(),
      });
      window.location.assign(returnTo || DEFAULT_AFTER_AUTH_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
      setBusy(false);
    }
  }

  return (
    <main className='auth-page'>
      <div className='auth-card'>
        <p className='auth-brand'>
          teamup<span>.</span>
        </p>

        <h1>Create your account</h1>
        <p className='auth-lede'>Start coordinating your group in a couple of steps.</p>

        <form className='auth-form' onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              type='text'
              name='name'
              autoComplete='name'
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Alex Kim'
            />
          </label>

          <label>
            Email
            <input
              type='email'
              name='email'
              autoComplete='email'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='you@school.edu'
            />
          </label>

          {error ? (
            <p className='auth-error' role='alert'>
              {error}
            </p>
          ) : null}

          <button className='btn primary' type='submit' disabled={busy}>
            {busy ? 'Creating…' : 'Sign up'}
          </button>
        </form>

        <p className='auth-switch'>
          Already have an account? <a href='/signin'>Sign in</a>
        </p>
      </div>
    </main>
  );
}
