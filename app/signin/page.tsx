'use client';

/**
 * Sign in — resume an existing TeamUP session.
 *
 * This page already works (same API as Sign up). A teammate can polish the
 * layout/copy without changing the submit handler below.
 *
 * TODO(teammate): improve visual design / copy.
 * Safe to edit: headings, labels, placeholders, classNames, surrounding markup.
 * Prefer keeping handleSubmit + startEmailSession as-is so auth keeps working.
 */

import { FormEvent, useState } from 'react';
import {
  DEFAULT_AFTER_AUTH_PATH,
  readReturnToParam,
  startEmailSession,
} from '../../lib/auth-client';

export default function SignInPage() {
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
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
      setBusy(false);
    }
  }

  return (
    <main className='auth-page'>
      <div className='auth-card'>
        {/* TODO(teammate): restyle this card as you like */}
        <p className='auth-brand'>
          teamup<span>.</span>
        </p>

        <h1>Welcome back</h1>
        <p className='auth-lede'>Sign in with the name and email you used before.</p>

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
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className='auth-switch'>
          New here? <a href='/signup'>Create an account</a>
        </p>
      </div>
    </main>
  );
}
