"""Tiny in-memory pub/sub so background alert producers (replay thread, live
poller) can push to any number of connected SSE clients."""

import queue
import threading


class AlertBus:
    def __init__(self):
        self._subscribers: list[queue.Queue] = []
        self._lock = threading.Lock()

    def subscribe(self) -> queue.Queue:
        q: queue.Queue = queue.Queue()
        with self._lock:
            self._subscribers.append(q)
        return q

    def unsubscribe(self, q: queue.Queue):
        with self._lock:
            if q in self._subscribers:
                self._subscribers.remove(q)

    def publish(self, item: dict):
        with self._lock:
            subs = list(self._subscribers)
        for q in subs:
            q.put(item)


bus = AlertBus()


def alert_to_dict(a) -> dict:
    return {
        "type": a.type,
        "instrument": a.instrument,
        "direction": a.direction,
        "date": a.date,
        "setup_id": a.setup_id,
        "message": a.message,
        "data": a.data,
    }
