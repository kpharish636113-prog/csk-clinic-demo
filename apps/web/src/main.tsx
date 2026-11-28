import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import './styles.css';

function App() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const workspace = new URLSearchParams(window.location.search).get('workspace') === 'doctor'
    ? 'doctor'
    : 'front-office';
  const initialView = workspace === 'doctor' ? 'doctor' : 'patients';

  useEffect(() => {
    let client: SupabaseClient | null = null;
    let channel: RealtimeChannel | null = null;
    let subscribedDoctorId = '';
    let retryTimer: number | undefined;
    let credentialTimer: number | undefined;

    const sendToFrame = (message: Record<string, unknown>) => {
      frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
    };
    const requestRealtimeCredentials = () => {
      sendToFrame({ type: 'CSK_REQUEST_REALTIME_CREDENTIALS' });
    };
    const clearTimers = () => {
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      if (credentialTimer !== undefined) window.clearInterval(credentialTimer);
      retryTimer = undefined;
      credentialTimer = undefined;
    };
    const stopRealtime = () => {
      clearTimers();
      if (client && channel) void client.removeChannel(channel);
      channel = null;
      client = null;
      subscribedDoctorId = '';
      sendToFrame({ type: 'CSK_REALTIME_STATUS', status: 'disconnected' });
    };

    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin
        || event.source !== frameRef.current?.contentWindow
      ) return;
      const message = event.data as {
        type?: string;
        status?: string;
        config?: { url?: string; anonKey?: string; token?: string };
        userId?: string;
      } | null;
      if (!message) return;
      if (message.type === 'CSK_DOCTOR_REALTIME_STOP') {
        stopRealtime();
        return;
      }
      if (message.type === 'CSK_REALTIME_REQUEST_CREDENTIALS') {
        requestRealtimeCredentials();
        return;
      }
      if (message.type !== 'CSK_DOCTOR_REALTIME_CONFIG') return;

      const { url, anonKey, token } = message.config || {};
      const doctorId = message.userId || '';
      if (!url || !anonKey || !token || !doctorId) {
        sendToFrame({ type: 'CSK_REALTIME_STATUS', status: 'unavailable' });
        return;
      }

      if (client && channel && subscribedDoctorId === doctorId) {
        client.realtime.setAuth(token);
        return;
      }

      stopRealtime();
      subscribedDoctorId = doctorId;
      client = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      client.realtime.setAuth(token);
      channel = client
        .channel(`doctor-queue-${doctorId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'QueueToken',
            filter: `doctorId=eq.${doctorId}`,
          },
          () => sendToFrame({ type: 'CSK_DOCTOR_QUEUE_CHANGED' }),
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            sendToFrame({ type: 'CSK_REALTIME_STATUS', status: 'connected' });
            sendToFrame({ type: 'CSK_DOCTOR_QUEUE_CHANGED' });
            if (credentialTimer === undefined) {
              credentialTimer = window.setInterval(requestRealtimeCredentials, 4 * 60 * 1000);
            }
            if (retryTimer !== undefined) window.clearTimeout(retryTimer);
            retryTimer = undefined;
            return;
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            sendToFrame({ type: 'CSK_REALTIME_STATUS', status: 'disconnected' });
            if (retryTimer === undefined) {
              retryTimer = window.setTimeout(() => {
                retryTimer = undefined;
                if (channel) channel.subscribe();
                else requestRealtimeCredentials();
              }, 15000);
            }
          }
        });
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      stopRealtime();
    };
  }, []);

  return (
    <iframe
      ref={frameRef}
      className="clinic-frame"
      src={`/prototype/index.html?workspace=${workspace}#${initialView}`}
      title="CSK Clinic management system"
      allow="fullscreen"
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
