// The dynamic import is intentional: install all in-memory HTTP adapters before
// service singletons or the real monitor components can be evaluated.
import "./preview-fixtures";

void import("./harness")
  .then(async () => {
    const { state } = await import("./doubles");
    let resolved = 0;
    window.setInterval(() => {
      // Explicitly fictional finish/transfer actions never affect a real chat.
      while (resolved < state.actions.length) state.actions[resolved++].resolve();
    }, 600);
  })
  .catch((error: unknown) => {
    const root = document.getElementById("root");
    if (root) root.textContent = `Não foi possível iniciar a prévia local: ${String(error)}`;
  });
