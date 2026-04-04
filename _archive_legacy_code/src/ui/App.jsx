import React, { useEffect, useMemo, useRef, useState } from 'react';

function clsx(...parts) {
  return parts.filter(Boolean).join(' ');
}

async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || text || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value]);
  return [value, setValue];
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function Icon({ name }) {
  return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>;
}

function Bubble({ role, children, meta }) {
  return (
    <div className={clsx('msgRow', role === 'user' ? 'msgRowUser' : 'msgRowAi')}>
      <div className={clsx('bubble', role === 'user' ? 'bubbleUser' : 'bubbleAi')}>
        <div className="bubbleText">{children}</div>
        {meta ? <div className="bubbleMeta">{meta}</div> : null}
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useLocalStorageState('surya_token', '');
  const [me, setMe] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const [toast, setToast] = useState('');
  const [wsBusy, setWsBusy] = useState(false);
  const [wsError, setWsError] = useState('');
  const [wsStatus, setWsStatus] = useState({ connected: false, connectedAt: null, scopes: '' });

  const [messages, setMessages] = useLocalStorageState('surya_messages_v2', []);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [model, setModel] = useLocalStorageState('surya_model_v2', 'anthropic/claude-opus-4.6');

  const scrollRef = useRef(null);
  const endRef = useRef(null);

  const modelOptions = useMemo(() => ([
    { id: 'anthropic/claude-opus-4.6', label: 'Claude Opus 4.6 (Pro)' },
    { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Creative)' },
    { id: 'x-ai/grok-4.1-fast', label: 'Grok 4.1 Fast (Web Search)' }
  ]), []);

  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    apiFetch('/api/auth/me', { token })
      .then((json) => setMe(json?.data || null))
      .catch((e) => {
        setMe(null);
        setAuthError(e.message);
      })
      .finally(() => setAuthBusy(false));
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth_success');
    const wsConnected = params.get('workspace_connected');
    const wsErrorParam = params.get('workspace_error');
    if (authSuccess) {
      try {
        const decoded = JSON.parse(decodeURIComponent(authSuccess));
        if (decoded?.accessToken) setToken(decoded.accessToken);
      } catch {
        // ignore
      }
      params.delete('auth_success');
      if (wsConnected) params.delete('workspace_connected');
      if (wsErrorParam) params.delete('workspace_error');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', next);
    }

    if (wsConnected) {
      setToast('Workspace connected successfully.');
      params.delete('workspace_connected');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', next);
    }
    if (wsErrorParam) {
      setToast(`Workspace connect failed: ${wsErrorParam}`);
      params.delete('workspace_error');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, [setToken]);

  useEffect(() => {
    if (!token || !me?.email) {
      setWsStatus({ connected: false, connectedAt: null, scopes: '' });
      return;
    }
    setWsBusy(true);
    setWsError('');
    fetch('/api/connectors/google-workspace/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-surya-user-email': me.email
      }
    })
      .then((r) => r.text().then((t) => ({ ok: r.ok, status: r.status, t })))
      .then(({ ok, status, t }) => {
        if (!ok) throw new Error(t || `Status failed (${status})`);
        try {
          const json = t ? JSON.parse(t) : {};
          setWsStatus({
            connected: Boolean(json.connected),
            connectedAt: json.connectedAt || null,
            scopes: json.scopes || ''
          });
        } catch {
          throw new Error('Invalid status response');
        }
      })
      .catch((e) => setWsError(e.message))
      .finally(() => setWsBusy(false));
  }, [token, me?.email, toast]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, sending]);

  async function onSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    setSending(true);

    const now = Date.now();
    const nextUser = { id: crypto.randomUUID(), role: 'user', content: text, ts: now };
    const nextAi = { id: crypto.randomUUID(), role: 'assistant', content: '', ts: Date.now(), streaming: true };
    setMessages((m) => [...m, nextUser, nextAi]);

    try {
      const body = {
        model,
        messages: [...messages, nextUser].map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        maxTokens: 2048
      };

      const res = await fetch('/api/ai/chat/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Chat failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(trimmed.slice(6));
            const tok = json.chunk || json.content || '';
            if (!tok) continue;
            full += tok;
            setMessages((prev) => prev.map((x) => (x.id === nextAi.id ? { ...x, content: full } : x)));
          } catch {
            // ignore
          }
        }
      }
      setMessages((prev) => prev.map((x) => (x.id === nextAi.id ? { ...x, content: full, streaming: false } : x)));
    } catch (e) {
      setMessages((prev) => prev.map((x) => (x.id === nextAi.id ? { ...x, content: `Error: ${e.message}`, streaming: false, error: true } : x)));
    } finally {
      setSending(false);
    }
  }

  async function signOut() {
    try {
      await apiFetch('/api/auth/sign-out', { method: 'POST', token });
    } catch {
      // ignore
    } finally {
      setToken('');
      setMe(null);
    }
  }

  async function workspaceConnect() {
    if (!token || !me?.email) return;
    setWsBusy(true);
    setWsError('');
    try {
      const json = await apiFetch('/api/connectors/google-workspace/start', {
        method: 'POST',
        token,
        body: { email: me.email, userEmail: me.email, name: me.name }
      });
      if (!json?.authUrl) throw new Error('Missing authUrl');
      window.location.href = json.authUrl;
    } catch (e) {
      setWsError(e.message);
      setWsBusy(false);
    }
  }

  async function workspaceDisconnect() {
    if (!token || !me?.email) return;
    setWsBusy(true);
    setWsError('');
    try {
      await fetch('/api/connectors/google-workspace/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-surya-user-email': me.email
        },
        body: JSON.stringify({ userEmail: me.email })
      });
      setWsStatus({ connected: false, connectedAt: null, scopes: '' });
      setToast('Workspace disconnected.');
    } catch (e) {
      setWsError(e.message);
    } finally {
      setWsBusy(false);
    }
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="brand">
          <div className="sun">☀</div>
          <div className="brandText">
            <div className="brandTitle">Surya AI</div>
            <div className="brandSub">Fast, clean, production UI</div>
          </div>
        </div>

        <div className="card">
          <div className="cardTitle">Account</div>
          {authBusy ? (
            <div className="muted">Loading…</div>
          ) : me ? (
            <div className="me">
              <div className="meName">{me.name || 'User'}</div>
              <div className="meMeta">
                {me.email ? <span>{me.email}</span> : <span>Child account</span>}
                <span className="dot" />
                <span className="pill">{(me.accountType || 'adult').toUpperCase()}</span>
              </div>
              <button className="btn ghost" onClick={signOut}>
                <Icon name="logout" /> Sign out
              </button>
            </div>
          ) : (
            <div className="stack">
              <div className="muted">Not logged in.</div>
              <a className="btn" href="/auth/google">
                <Icon name="account_circle" /> Continue with Google
              </a>
              {authError ? <div className="error">{authError}</div> : null}
            </div>
          )}
        </div>

        <div className="card">
          <div className="cardTitle">Model</div>
          <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <div className="hint">
            Tip: keep scopes minimal in Google OAuth to avoid the “unverified app” warning.
          </div>
        </div>

        <div className="card">
          <div className="row">
            <div className="cardTitle">Workspace</div>
            <span className={clsx('badge', wsStatus.connected ? 'badgeOk' : 'badgeOff')}>
              {wsStatus.connected ? 'Connected' : 'Not connected'}
            </span>
          </div>

          {!me ? (
            <div className="muted">Login first to connect Workspace.</div>
          ) : !me.email ? (
            <div className="muted">Workspace connect needs an email account (not child).</div>
          ) : wsBusy ? (
            <div className="muted">Loading…</div>
          ) : (
            <div className="stack">
              {wsStatus.connected ? (
                <>
                  <div className="muted">
                    Connected{wsStatus.connectedAt ? ` • ${new Date(wsStatus.connectedAt).toLocaleString()}` : ''}
                  </div>
                  {wsStatus.scopes ? (
                    <div className="hint">
                      Scopes: {wsStatus.scopes}
                    </div>
                  ) : null}
                  <button className="btn ghost danger" onClick={workspaceDisconnect} disabled={wsBusy}>
                    <Icon name="link_off" /> Disconnect
                  </button>
                </>
              ) : (
                <>
                  <div className="muted">Connect Google Drive / Docs / Slides / Sheets.</div>
                  <button className="btn" onClick={workspaceConnect} disabled={wsBusy}>
                    <Icon name="link" /> Connect Workspace
                  </button>
                </>
              )}
              {wsError ? <div className="error">{wsError}</div> : null}
            </div>
          )}
        </div>

        <div className="footer">
          <button
            className="btn ghost"
            onClick={() => setMessages([])}
            disabled={sending || messages.length === 0}
          >
            <Icon name="delete" /> Clear chat
          </button>
          <div className="tiny">Local UI state stored in browser.</div>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topTitle">Chat</div>
          <div className="topRight">
            <span className={clsx('status', sending ? 'statusBusy' : 'statusOk')}>
              {sending ? 'Generating…' : 'Ready'}
            </span>
          </div>
        </div>

        <div className="chat" ref={scrollRef}>
          {toast ? (
            <div className="toast">
              <div>{toast}</div>
              <button className="toastX" onClick={() => setToast('')} aria-label="Close">
                <Icon name="close" />
              </button>
            </div>
          ) : null}
          {messages.length === 0 ? (
            <div className="empty">
              <div className="emptyTitle">Ask anything.</div>
              <div className="emptySub">
                Coding help, research, image prompts, and more — now in React.
              </div>
              <div className="emptyGrid">
                {[
                  'Write a landing page headline for Surya AI',
                  'Explain closures in JavaScript with examples',
                  'Make a study plan for class 7 science',
                  'Create a prompt to generate a logo icon'
                ].map((t) => (
                  <button key={t} className="chip" onClick={() => setDraft(t)}>
                    <Icon name="auto_awesome" /> {t}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <Bubble
              key={m.id}
              role={m.role}
              meta={m.ts ? `${m.role === 'user' ? 'You' : 'Surya'} • ${formatTime(m.ts)}` : ''}
            >
              {m.content}
            </Bubble>
          ))}
          <div ref={endRef} />
        </div>

        <div className="composer">
          <div className="composerInner">
            <textarea
              className="input"
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message Surya AI…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <button className="send" onClick={onSend} disabled={!draft.trim() || sending}>
              <Icon name="send" />
            </button>
          </div>
          <div className="composerMeta">
            Press <span className="kbd">Enter</span> to send, <span className="kbd">Shift</span>+<span className="kbd">Enter</span> for newline.
          </div>
        </div>
      </div>
    </div>
  );
}

