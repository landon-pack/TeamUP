'use client';
import { useEffect, useState } from 'react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [returnTo, setReturnTo] = useState('/');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(params.get('return_to') || '/');
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, returnTo }),
      });
      const data: any = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to sign in.');
      window.location.assign(data.returnTo || '/');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className='join-page'>
      <section className='welcome-panel'>
        <span className='eyebrow'>TEAMUP ACCOUNT</span>
        <h1>Sign in to your workspace</h1>
        <p>
          Use your school email so teammates can find you on invites and shared projects. No
          password needed for this class project.
        </p>
        {error && (
          <p className='error' role='alert'>
            {error}
          </p>
        )}
        <form className='form' style={{ width: 'min(100%, 420px)', textAlign: 'left' }} onSubmit={submit}>
          <label>
            Display name
            <input
              required
              autoComplete='name'
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Alex Rivera'
            />
          </label>
          <label>
            Email
            <input
              required
              type='email'
              autoComplete='email'
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='you@school.edu'
            />
          </label>
          <button className='btn primary' disabled={busy} type='submit'>
            {busy ? 'Signing in…' : 'Continue'}
          </button>
        </form>
        <a className='btn subtle' href='/'>
          Back to workspace
        </a>
      </section>
    </main>
  );
}
