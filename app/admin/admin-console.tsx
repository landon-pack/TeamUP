'use client';

/**
 * Admin page.
 *
 * The login form is visible until an admin session cookie exists.
 * Maintain Users, Maintain Records, and Logout stay hidden until that login succeeds.
 * Logout calls /api/auth/signout, which clears the session cookie and returns here.
 * The totals above the tables (projects, accounts, active today, tasks, milestones)
 * stay on screen after login. Deleting a user or project does not reduce those totals.
 */

import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import AuthPasswordField from '../auth-password-field';

type Account = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  admin: boolean;
  daysUsed: number;
  lastSeen: string | null;
  actions: number;
  projectsCreated: number;
  projects: number;
};

type Overview = {
  viewerId: string;
  stats: {
    projectsCreated: number;
    accounts: number;
    activeToday: number;
    tasksCreated: number;
    milestonesCreated: number;
  };
  accounts: Account[];
};

type Detail = {
  account: Account;
  activity: { day: string; actions: number; lastSeen: string }[];
  projects: { id: string; title: string; role: string; tasksCreated: number; milestonesCreated: number }[];
};

type Draft = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  admin: boolean;
};

type ProjectRecord = {
  id: string;
  title: string;
  course: string;
  deadline: string;
  description: string;
  tasksCreated: number;
  milestonesCreated: number;
  ownerEmail: string;
};

type RecordDraft = {
  title: string;
  course: string;
  deadline: string;
  description: string;
};

const emptyDraft = (): Draft => ({
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  admin: false,
});

const emptyRecordDraft = (): RecordDraft => ({
  title: '',
  course: '',
  deadline: '',
  description: '',
});

function formatWhen(value: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

async function readError(response: Response) {
  const data = (await response.json().catch(() => ({}))) as { error?: string; signedInAs?: string };
  return data;
}

export default function AdminConsole() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [localHint, setLocalHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [editor, setEditor] = useState<null | { mode: 'create' } | { mode: 'edit'; account: Account }>(
    null,
  );
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [detailVersion, setDetailVersion] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);
  const [panel, setPanel] = useState<'users' | 'records' | null>(null);
  const [records, setRecords] = useState<ProjectRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordEditor, setRecordEditor] = useState<
    null | { mode: 'create' } | { mode: 'edit'; record: ProjectRecord }
  >(null);
  const [recordDraft, setRecordDraft] = useState<RecordDraft>(emptyRecordDraft);
  const [pendingRecordDelete, setPendingRecordDelete] = useState<ProjectRecord | null>(null);
  const detailRowRef = useRef<HTMLTableRowElement | null>(null);

  async function loadOverview() {
    const response = await fetch('/api/admin/overview', { cache: 'no-store', credentials: 'same-origin' });
    if (response.status === 401 || response.status === 403) {
      const data = await readError(response);
      setOverview(null);
      setSignedInAs(data.signedInAs || null);
      return;
    }
    if (!response.ok) {
      const data = await readError(response);
      throw new Error(data.error || 'Unable to load accounts.');
    }
    const data = (await response.json()) as Overview;
    setOverview(data);
    setSignedInAs(null);
  }

  useEffect(() => {
    const host = window.location.hostname;
    setLocalHint(host === 'localhost' || host === '127.0.0.1');
    loadOverview()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load accounts.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    setDetailError(null);
    fetch(`/api/admin/accounts/${encodeURIComponent(selectedId)}`, {
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await readError(response);
          throw new Error(data.error || 'Unable to load that account.');
        }
        return response.json() as Promise<Detail>;
      })
      .then((next) => {
        if (!cancelled) setDetail(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(err instanceof Error ? err.message : 'Unable to load that account.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, detailVersion]);

  useEffect(() => {
    if (!selectedId) return;
    detailRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId, detail, detailError]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!overview) return [];
    if (!needle) return overview.accounts;
    return overview.accounts.filter((account) =>
      [account.name, account.email, account.username].join(' ').toLowerCase().includes(needle),
    );
  }, [overview, query]);

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: login, user_password: password, remember: false }),
      });
      const data = await readError(response);
      if (!response.ok) throw new Error(data.error || 'Unable to sign in.');
      setPassword('');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    setDraft(emptyDraft());
    setError(null);
    setEditor({ mode: 'create' });
  }

  function openEdit(account: Account) {
    setDraft({
      firstName: account.firstName,
      lastName: account.lastName,
      username: account.username,
      email: account.email,
      password: '',
      admin: account.admin,
    });
    setError(null);
    setEditor({ mode: 'edit', account });
  }

  async function submitAccount(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    setBusy(true);
    setError(null);
    try {
      const creating = editor.mode === 'create';
      const response = await fetch(
        creating ? '/api/admin/accounts' : `/api/admin/accounts/${encodeURIComponent(editor.account.id)}`,
        {
          method: creating ? 'POST' : 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: draft.firstName,
            lastName: draft.lastName,
            username: draft.username,
            email: draft.email,
            password: draft.password,
            admin: draft.admin,
          }),
        },
      );
      const data = await readError(response);
      if (!response.ok) throw new Error(data.error || 'Unable to save that account.');
      setEditor(null);
      await loadOverview();
      if (!creating) setDetailVersion((version) => version + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save that account.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(pendingDelete.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await readError(response);
      if (!response.ok) throw new Error(data.error || 'Unable to delete that account.');
      if (selectedId === pendingDelete.id) setSelectedId(null);
      setPendingDelete(null);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete that account.');
    } finally {
      setBusy(false);
    }
  }

  async function loadRecords() {
    setRecordsLoading(true);
    try {
      const response = await fetch('/api/admin/records', { cache: 'no-store', credentials: 'same-origin' });
      const data = (await response.json().catch(() => ({}))) as { error?: string; records?: ProjectRecord[] };
      if (!response.ok) throw new Error(data.error || 'Unable to load projects.');
      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load projects.');
    } finally {
      setRecordsLoading(false);
    }
  }

  function openUsers() {
    setPanel((current) => (current === 'users' ? null : 'users'));
    setRecordEditor(null);
    setPendingRecordDelete(null);
  }

  function openRecords() {
    setEditor(null);
    setPendingDelete(null);
    setPanel((current) => (current === 'records' ? null : 'records'));
  }

  useEffect(() => {
    if (panel === 'records') void loadRecords();
  }, [panel]);

  function openRecordCreate() {
    setRecordDraft(emptyRecordDraft());
    setError(null);
    setRecordEditor({ mode: 'create' });
  }

  function openRecordEdit(record: ProjectRecord) {
    setRecordDraft({
      title: record.title,
      course: record.course,
      deadline: record.deadline,
      description: record.description,
    });
    setError(null);
    setRecordEditor({ mode: 'edit', record });
  }

  async function submitRecord(event: FormEvent) {
    event.preventDefault();
    if (!recordEditor) return;
    setBusy(true);
    setError(null);
    try {
      const creating = recordEditor.mode === 'create';
      const response = await fetch(
        creating ? '/api/admin/records' : `/api/admin/records/${encodeURIComponent(recordEditor.record.id)}`,
        {
          method: creating ? 'POST' : 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recordDraft),
        },
      );
      const data = await readError(response);
      if (!response.ok) throw new Error(data.error || 'Unable to save that project.');
      setRecordEditor(null);
      await Promise.all([loadRecords(), loadOverview()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save that project.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmRecordDelete() {
    if (!pendingRecordDelete) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/records/${encodeURIComponent(pendingRecordDelete.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await readError(response);
      if (!response.ok) throw new Error(data.error || 'Unable to delete that project.');
      setPendingRecordDelete(null);
      await Promise.all([loadRecords(), loadOverview()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete that project.');
    } finally {
      setBusy(false);
    }
  }

  function toggleDetail(id: string) {
    setSelectedId((current) => (current === id ? null : id));
  }

  if (loading) {
    return (
      <main className='admin-page'>
        <p className='admin-loading'>Loading admin…</p>
      </main>
    );
  }

  if (!overview) {
    return (
      <main className='auth-page'>
        <div className='auth-card'>
          <a className='auth-brand' href='/'>
            TeamUP<span>.</span>
          </a>
          <h1>Admin</h1>
          <p className='auth-lede'>Sign in with an admin account to manage TeamUP accounts.</p>
          {localHint ? (
            <p className='auth-local-hint'>
              Local test login: <code>admin</code> / <code>teamup</code>
              <br />
              <span>Uses this machine only — not the live Cloudflare database.</span>
            </p>
          ) : null}
          {signedInAs ? (
            <p className='auth-error'>Signed in as {signedInAs}, which isn’t an admin.</p>
          ) : null}
          {error ? <p className='auth-error'>{error}</p> : null}
          <form className='auth-form' method='post' action='/admin' onSubmit={submitLogin}>
            <label htmlFor='user_email'>
              Email
              <input
                id='user_email'
                name='user_email'
                type='text'
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                autoComplete='username'
                required
              />
            </label>
            <AuthPasswordField
              id='user_password'
              label='Password'
              name='user_password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete='current-password'
              required
            />
            <button className='btn primary' type='submit' disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const stats = [
    ['Lifetime projects across all users', overview.stats.projectsCreated],
    ['Accounts', overview.stats.accounts],
    ['Active today', overview.stats.activeToday],
    ['Tasks created across all users', overview.stats.tasksCreated],
    ['Milestones Accomplished', overview.stats.milestonesCreated],
  ] as const;

  return (
    <main className='admin-page'>
      <header className='admin-top'>
        <div>
          <a className='auth-brand' href='/'>
            TeamUP<span>.</span>
          </a>
          <h1>Admin</h1>
          <p className='subtext'>
            Every account, how many days they’ve used TeamUP, and the projects they still belong to.
          </p>
        </div>
        <div className='admin-top-actions'>
          {/* Hidden until this signed-in view renders. Logout clears the session cookie. */}
          <button
            className='btn primary'
            type='button'
            aria-pressed={panel === 'users'}
            onClick={openUsers}
          >
            Maintain Users
          </button>
          <button className='btn primary' type='button' aria-pressed={panel === 'records'} onClick={openRecords}>
            Maintain Records
          </button>
          <a className='btn' href='/api/auth/signout?return_to=%2Fadmin'>
            Logout
          </a>
        </div>
      </header>

      <section className='admin-stats' aria-label='Site totals'>
        {stats.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value.toLocaleString()}</strong>
          </article>
        ))}
      </section>

      {error && !editor && !pendingDelete && !recordEditor && !pendingRecordDelete ? (
        <p className='auth-error'>{error}</p>
      ) : null}

      {panel === 'users' ? (
      <>
      <div className='admin-toolbar admin-maintain-toolbar'>
        <button className='btn primary' type='button' onClick={openCreate}>
          New account
        </button>
      </div>
      <div className='admin-toolbar'>
        <label>
          Find an account
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Name, email, or username'
          />
        </label>
      </div>

      <div className='admin-table-wrap'>
        <table className='admin-table'>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Days used</th>
              <th>Last active</th>
              <th>Projects created</th>
              <th>Active projects</th>
              <th>Access</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className='admin-empty' colSpan={9}>
                  No accounts match that search.
                </td>
              </tr>
            ) : (
              rows.map((account) => {
                const open = selectedId === account.id;
                const showDetail = open && detail?.account.id === account.id;
                return (
                  <Fragment key={account.id}>
                    <tr
                      className={open ? 'is-open' : undefined}
                      tabIndex={0}
                      aria-expanded={open}
                      onClick={() => toggleDetail(account.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleDetail(account.id);
                        }
                      }}
                    >
                      <td>{account.name}</td>
                      <td>{account.username || '—'}</td>
                      <td>{account.email}</td>
                      <td>{account.daysUsed.toLocaleString()}</td>
                      <td>{formatWhen(account.lastSeen)}</td>
                      <td>{account.projectsCreated.toLocaleString()}</td>
                      <td>{account.projects.toLocaleString()}</td>
                      <td>{account.admin ? 'Admin' : 'Member'}</td>
                      <td className='admin-row-actions'>
                        <button
                          type='button'
                          className='btn'
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(account);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type='button'
                          className='btn admin-delete'
                          disabled={account.id === overview.viewerId}
                          onClick={(event) => {
                            event.stopPropagation();
                            setError(null);
                            setPendingDelete(account);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {open ? (
                      <tr className='admin-detail-row' ref={detailRowRef}>
                        <td colSpan={9}>
                          <section className='admin-detail' aria-live='polite'>
                            {!showDetail && !detailError ? (
                              <p className='admin-loading'>Loading activity…</p>
                            ) : null}
                            {detailError ? <p className='auth-error'>{detailError}</p> : null}
                            {showDetail && detail ? (
                              <>
                                <header>
                                  <h2>{detail.account.name}</h2>
                                  <p className='subtext'>
                                    {`${detail.account.projectsCreated.toLocaleString()} project${detail.account.projectsCreated === 1 ? '' : 's'} created by ${detail.account.name}. Deleting a project does not lower this number. ${detail.account.daysUsed.toLocaleString()} day${detail.account.daysUsed === 1 ? '' : 's'} on TeamUP${
                                      detail.account.actions
                                        ? ` · ${detail.account.actions.toLocaleString()} stretch${detail.account.actions === 1 ? '' : 'es'} of use`
                                        : ''
                                    }. Days are UTC. Opening the app counts, including a remembered sign-in. A new stretch starts after 30 quiet minutes.`}
                                  </p>
                                </header>
                                <div className='admin-detail-grid'>
                                  <div>
                                    <h3>Days used</h3>
                                    {detail.activity.length === 0 ? (
                                      <p className='muted'>No use recorded yet.</p>
                                    ) : (
                                      <table className='admin-table admin-table-compact'>
                                        <thead>
                                          <tr>
                                            <th>Day</th>
                                            <th>Stretches</th>
                                            <th>Last seen</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detail.activity.map((day) => (
                                            <tr key={day.day}>
                                              <td>{formatDay(day.day)}</td>
                                              <td>{day.actions.toLocaleString()}</td>
                                              <td>{formatWhen(day.lastSeen)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                  <div>
                                    <h3>Active projects</h3>
                                    <p className='subtext admin-shared-note'>
                                      Tasks created and milestones accomplished are totals for the whole
                                      project. Everyone on the project shares those numbers.
                                    </p>
                                    {detail.projects.length === 0 ? (
                                      <p className='muted'>Not on a project right now.</p>
                                    ) : (
                                      <table className='admin-table admin-table-compact'>
                                        <thead>
                                          <tr>
                                            <th>Project</th>
                                            <th>Role</th>
                                            <th>Tasks created</th>
                                            <th>Milestones accomplished</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detail.projects.map((project) => (
                                            <tr key={project.id}>
                                              <td>{project.title}</td>
                                              <td>{project.role}</td>
                                              <td>{project.tasksCreated.toLocaleString()}</td>
                                              <td>{project.milestonesCreated.toLocaleString()}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </div>
                              </>
                            ) : null}
                          </section>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </>
      ) : null}

      {panel === 'records' ? (
        <section className='admin-records' aria-label='Maintain Records'>
          <div className='admin-toolbar admin-maintain-toolbar'>
            <button className='btn primary' type='button' onClick={openRecordCreate}>
              New record
            </button>
            <p className='subtext'>
              Projects are the records. Tasks created and milestones accomplished stay on each row.
              Deleting a project does not lower the totals above.
            </p>
          </div>
          <div className='admin-table-wrap'>
            <table className='admin-table'>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Course</th>
                  <th>Deadline</th>
                  <th>Owner</th>
                  <th>Tasks created</th>
                  <th>Milestones accomplished</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recordsLoading ? (
                  <tr>
                    <td className='admin-empty' colSpan={7}>
                      Loading projects…
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td className='admin-empty' colSpan={7}>
                      No projects yet.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.title}</td>
                      <td>{record.course || '—'}</td>
                      <td>{record.deadline || '—'}</td>
                      <td>{record.ownerEmail || '—'}</td>
                      <td>{record.tasksCreated.toLocaleString()}</td>
                      <td>{record.milestonesCreated.toLocaleString()}</td>
                      <td className='admin-row-actions'>
                        <button type='button' className='btn' onClick={() => openRecordEdit(record)}>
                          Edit
                        </button>
                        <button
                          type='button'
                          className='btn admin-delete'
                          onClick={() => {
                            setError(null);
                            setPendingRecordDelete(record);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {editor ? (
        <div className='admin-modal' role='presentation'>
          <form className='admin-dialog auth-form' onSubmit={submitAccount}>
            <h2>{editor.mode === 'create' ? 'New account' : 'Edit account'}</h2>
            {error ? <p className='auth-error'>{error}</p> : null}
            <div className='auth-form-row'>
              <label>
                First name
                <input
                  value={draft.firstName}
                  onChange={(event) => setDraft({ ...draft, firstName: event.target.value })}
                  required
                />
              </label>
              <label>
                Last name
                <input
                  value={draft.lastName}
                  onChange={(event) => setDraft({ ...draft, lastName: event.target.value })}
                  required
                />
              </label>
            </div>
            <label>
              Username
              <input
                value={draft.username}
                onChange={(event) => setDraft({ ...draft, username: event.target.value })}
                autoComplete='off'
                required
              />
            </label>
            <label>
              Email
              <input
                type='email'
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                disabled={editor.mode === 'edit'}
                required
              />
            </label>
            {editor.mode === 'edit' ? (
              <p className='subtext'>Email stays the same. It’s how this account is stored.</p>
            ) : null}
            <AuthPasswordField
              label={editor.mode === 'edit' ? 'New password' : 'Password'}
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
              autoComplete='new-password'
              placeholder={editor.mode === 'edit' ? 'Leave blank to keep the current password' : undefined}
              required={editor.mode === 'create'}
            />
            <label className='auth-check'>
              <input
                type='checkbox'
                checked={draft.admin}
                onChange={(event) => setDraft({ ...draft, admin: event.target.checked })}
              />
              Admin
            </label>
            <div className='admin-dialog-actions'>
              <button className='btn' type='button' onClick={() => setEditor(null)} disabled={busy}>
                Cancel
              </button>
              <button className='btn primary' type='submit' disabled={busy}>
                {busy ? 'Saving…' : editor.mode === 'create' ? 'Create account' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className='admin-modal' role='presentation'>
          <div className='admin-dialog' role='dialog' aria-modal='true' aria-labelledby='admin-delete-title'>
            <h2 id='admin-delete-title'>Delete {pendingDelete.name}?</h2>
            <p className='subtext'>
              They lose access to TeamUP. Projects they own have to be deleted first. Projects they only
              belong to stay, without them on the team.
            </p>
            {error ? <p className='auth-error'>{error}</p> : null}
            <div className='admin-dialog-actions'>
              <button className='btn' type='button' onClick={() => setPendingDelete(null)} disabled={busy}>
                Cancel
              </button>
              <button className='btn admin-delete' type='button' onClick={confirmDelete} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {recordEditor ? (
        <div className='admin-modal' role='presentation'>
          <form className='admin-dialog auth-form' onSubmit={submitRecord}>
            <h2>{recordEditor.mode === 'create' ? 'New record' : 'Edit record'}</h2>
            {recordEditor.mode === 'edit' ? (
              <p className='subtext'>
                Tasks created ({recordEditor.record.tasksCreated.toLocaleString()}) and milestones
                accomplished ({recordEditor.record.milestonesCreated.toLocaleString()}) stay the same.
              </p>
            ) : null}
            {error ? <p className='auth-error'>{error}</p> : null}
            <label>
              Project name
              <input
                value={recordDraft.title}
                onChange={(event) => setRecordDraft({ ...recordDraft, title: event.target.value })}
                required
              />
            </label>
            <label>
              Course
              <input
                value={recordDraft.course}
                onChange={(event) => setRecordDraft({ ...recordDraft, course: event.target.value })}
              />
            </label>
            <label>
              Deadline
              <input
                type='date'
                value={recordDraft.deadline}
                onChange={(event) => setRecordDraft({ ...recordDraft, deadline: event.target.value })}
                required
              />
            </label>
            <label>
              Description
              <input
                value={recordDraft.description}
                onChange={(event) => setRecordDraft({ ...recordDraft, description: event.target.value })}
              />
            </label>
            <div className='admin-dialog-actions'>
              <button className='btn' type='button' onClick={() => setRecordEditor(null)} disabled={busy}>
                Cancel
              </button>
              <button className='btn primary' type='submit' disabled={busy}>
                {busy ? 'Saving…' : recordEditor.mode === 'create' ? 'Create record' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {pendingRecordDelete ? (
        <div className='admin-modal' role='presentation'>
          <div className='admin-dialog' role='dialog' aria-modal='true' aria-labelledby='admin-record-delete-title'>
            <h2 id='admin-record-delete-title'>Delete {pendingRecordDelete.title}?</h2>
            <p className='subtext'>
              The project is removed. The lifetime totals for projects, tasks, and milestones stay
              where they are.
            </p>
            {error ? <p className='auth-error'>{error}</p> : null}
            <div className='admin-dialog-actions'>
              <button className='btn' type='button' onClick={() => setPendingRecordDelete(null)} disabled={busy}>
                Cancel
              </button>
              <button className='btn admin-delete' type='button' onClick={confirmRecordDelete} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete record'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
