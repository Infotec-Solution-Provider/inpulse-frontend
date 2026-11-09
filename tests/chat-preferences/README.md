# Chat menu preference regression

Run `npm run test:chat-preferences:e2e`.

The harness imports the real `ChatsMenuItem` and MUI Menu. Chromium clicks and
keyboard events cross the actual React portal. Stubbed service contexts avoid
authentication and customer data; callback events expose accidental conversation
opening/reading alongside unread and pin actions. The selected-chat case verifies
that changing the preference does not trigger another open/read callback.

This suite does not validate backend persistence, sockets, new messages while a
conversation remains open, or the authenticated application. Those require a
separate smoke test in the target environment.
