import { UA, WebSocketInterface, debug } from "jssip";
import { BrowserPhone } from "./browser-phone";

export function createBrowserPhone(deps: Omit<ConstructorParameters<typeof BrowserPhone>[0], "createAgent" | "getMicrophone" | "createStream">) {
  // Never enable SIP packet/credential debug output in the application.
  debug.disable();
  return new BrowserPhone({
    ...deps,
    createAgent: config => {
      try {
        return new UA({
          sockets: [new WebSocketInterface(config.websocketUrl)], uri: config.uri,
          authorization_user: config.authorizationUser, password: config.password,
          register: true, session_timers: false,
        });
      } catch { throw new Error("Configuração de telefonia inválida. Consulte o administrador."); }
    },
    getMicrophone: () => navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
    createStream: () => new MediaStream(),
  });
}
