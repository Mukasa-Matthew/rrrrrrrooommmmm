type QueuedRequest = {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
};

const KEY = 'lts_offline_queue_v1';

function loadQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(q: QueuedRequest[]) {
  localStorage.setItem(KEY, JSON.stringify(q));
}

export function enqueueRequest(req: Omit<QueuedRequest, 'id'>) {
  const q = loadQueue();
  const item: QueuedRequest = { id: `${Date.now()}-${Math.random()}`, ...req };
  q.push(item);
  saveQueue(q);
}

export async function flushQueue() {
  const q = loadQueue();
  const remaining: QueuedRequest[] = [];
  for (const item of q) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body ? JSON.stringify(item.body) : undefined,
      });
      if (!res.ok) throw new Error('Request failed');
    } catch {
      remaining.push(item);
    }
  }
  saveQueue(remaining);
}

export function initOfflineQueue() {
  window.addEventListener('online', () => {
    flushQueue();
  });
}

