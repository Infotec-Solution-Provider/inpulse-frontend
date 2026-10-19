const SEGMENTS_CHANGED_EVENT = "inpulse:customer-segments-changed";

/** Refresh catalog consumers in this tenant without affecting other open tenants. */
export function publishCustomerSegmentsChanged(instance: string) {
  window.dispatchEvent(new CustomEvent(SEGMENTS_CHANGED_EVENT, { detail: { instance } }));
}

export function subscribeCustomerSegmentsChanged(instance: string, refresh: () => void) {
  const listener = (event: Event) => {
    if ((event as CustomEvent<{ instance: string }>).detail?.instance === instance) refresh();
  };
  window.addEventListener(SEGMENTS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(SEGMENTS_CHANGED_EVENT, listener);
}
