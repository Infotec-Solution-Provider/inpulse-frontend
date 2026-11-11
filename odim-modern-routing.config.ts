/** Odim-only application route; existing tenants continue using the current UI. */
export const odimModernRewrites = [
  { source: "/nova/odim/:path*", destination: "http://127.0.0.1:3031/nova/odim/:path*" },
  { source: "/nova/_next/:path*", destination: "http://127.0.0.1:3031/nova/_next/:path*" },
  { source: "/nova/fonts/:path*", destination: "http://127.0.0.1:3031/nova/fonts/:path*" },
  ...["manifest.webmanifest", "icon", "apple-icon", "favicon.ico", "chat-interno.mp3", "file.svg", "globe.svg", "next.svg", "notification-sound_wpp.mp3", "notification-sound.wav", "notify-chat.mp3", "notify-mention.mp3", "notify-message.mp3", "vercel.svg", "window.svg"].map(name => ({ source: `/nova/${name}`, destination: `http://127.0.0.1:3031/nova/${name}` })),
  { source: "/api/ai/:path*", destination: "http://127.0.0.1:8008/api/ai/:path*" },
];

export const odimModernRedirects = [
  { source: "/odim/:path*", destination: "/nova/odim/:path*", permanent: false },
  { source: "/nova", destination: "/nova/odim", permanent: false },
];
