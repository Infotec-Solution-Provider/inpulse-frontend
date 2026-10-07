/** Hold a browser-wide lock until disconnect; no SIP passwords in browser storage. */
export async function acquirePhoneTabLock(key: string): Promise<() => void> {
  if (!navigator.locks) throw new Error("Use um navegador atualizado com suporte à telefonia web.");
  return new Promise((resolve, reject) => {
    void navigator.locks.request(`inpulse:telephony:${key}`, { ifAvailable: true }, async lock => {
      if (!lock) { reject(new Error("A telefonia já está conectada em outra aba. Desconecte-a primeiro.")); return; }
      await new Promise<void>(release => resolve(release));
    }).catch(reject);
  });
}
