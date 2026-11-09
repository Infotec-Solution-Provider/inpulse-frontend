type MutableRef<T> = { current: T };

/** Keep automatic chat selection tied to the latest manual start request. */
export async function startUserChat<T>(
  pendingContact: MutableRef<number | null>,
  latestRequest: MutableRef<number>,
  contactId: number,
  start: () => Promise<T>,
): Promise<T> {
  const requestId = ++latestRequest.current;
  pendingContact.current = contactId;
  try {
    return await start();
  } catch (error) {
    // A denied request must not select a later socket event or erase a newer
    // start intent, including a retry for the same contact.
    if (latestRequest.current === requestId && pendingContact.current === contactId) {
      pendingContact.current = null;
    }
    throw error;
  }
}
