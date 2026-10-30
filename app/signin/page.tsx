'use client';

/**
 * Sign in — email or username + password.
 *
 * TODO(teammate): polish visual design / copy.
 * Safe to edit: headings, labels, placeholders, classNames, surrounding markup.
 * Prefer keeping handleSubmit + signInAccount as-is so auth keeps working.
 */

import { FormEvent, useState } from 'react';
import {
  DEFAULT_AFTER_AUTH_PATH,
  readReturnToParam,
  signInAccount,
} from '../../lib/auth-client';

export default function SignInPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const { returnTo } = await signInAccount({
        login,
        password,
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
        <a className='auth-brand' href='/'>
          teamup<span>.</span>
        </a>

        <h1>Welcome back</h1>
        <p className='auth-lede'>Sign in with your email or username and password.</p>

        <form className='auth-form' onSubmit={handleSubmit}>
          <label>
            Email or username
            <input
              type='text'
              name='login'
              autoComplete='username'
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder='you@school.edu or alexkim'
            />
          </label>

          <label>
            Password
            <input
              type='password'
              name='password'
              autoComplete='current-password'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Your password'
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
