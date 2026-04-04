import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface OperationMetric {
  name: string;
  duration_ms: number;
  timestamp: number;
}

export interface ResourceSample {
  cpu_percent: number;
  global_cpu: number;
  ram_mb: number;
  core_temp: number;
  db_size_bytes: number;
  cache_entries: number;
  timestamp: number;
}

export interface TaskRecord {
  name: string;
  state: 'idle' | 'running' | 'completed' | 'failed';
  started_at?: number;
  ended_at?: number;
  duration_ms?: number;
  retry_count: number;
  last_error?: string;
}

export interface TelemetrySnapshot {
  latest_resource?: ResourceSample;
  recent_operations: OperationMetric[];
  snippet_load_ms?: number;
  search_ms?: number;
  copy_ms?: number;
  db_query_ms?: number;
  tasks: TaskRecord[];
  diagnostics_enabled: boolean;
  core_temp: number;
  global_cpu: number;
}

export function useTelemetry(intervalMs = 5000) {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchTelemetry() {
      try {
        const data = await invoke<TelemetrySnapshot>('get_telemetry_snapshot');
        if (isMounted) {
          setSnapshot(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as string);
          setLoading(false);
        }
      }
    }

    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return { snapshot, loading, error };
}

/**
 * Record a client-side metric (e.g. copy execution time)
 */
export async function recordClientMetric(name: string, durationMs: number) {
  try {
    await invoke('record_client_metric', { name, durationMs });
  } catch (err) {
    console.error('Failed to record client metric:', err);
  }
}

/**
 * Update a background task state
 */
export async function updateTaskState(name: string, state: string, error?: string) {
  try {
    await invoke('update_task_state_cmd', { name, taskState: state, error });
  } catch (err) {
    console.error('Failed to update task state:', err);
  }
}
