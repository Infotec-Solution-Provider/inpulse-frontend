import { forwardRef, useEffect, useState, type ComponentProps } from "react";

const routeEvent = "monitor-test:navigate";
let currentPath = "/tenant-a/monitor";
export function navigate(path: string) {
  currentPath = path;
  window.dispatchEvent(new Event(routeEvent));
}
export function usePathname() {
  const [pathname, setPathname] = useState(currentPath);
  useEffect(() => {
    const sync = () => setPathname(currentPath);
    window.addEventListener(routeEvent, sync);
    return () => window.removeEventListener(routeEvent, sync);
  }, []);
  return pathname.split("?")[0];
}
export const TestLink = forwardRef<
  HTMLAnchorElement,
  ComponentProps<"a"> & { href: string; prefetch?: boolean }
>(function TestLink({ href, onClick, prefetch: _prefetch, ...props }, ref) {
  return (
    <a
      {...props}
      href={href}
      ref={ref}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          navigate(href);
        }
      }}
    />
  );
});
export function TestImage({
  src,
  alt,
  priority: _priority,
  ...props
}: Omit<ComponentProps<"img">, "src"> & { src: string | { src: string }; priority?: boolean }) {
  return <img {...props} src={typeof src === "string" ? src : src.src} alt={alt} />;
}

export function useSearchParams() {
  usePathname();
  return new URLSearchParams(currentPath.split("?")[1] ?? "");
}
