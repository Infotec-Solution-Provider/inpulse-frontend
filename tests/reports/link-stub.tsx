import { forwardRef, type ComponentProps } from "react";
export default forwardRef<HTMLAnchorElement, ComponentProps<"a">>(function Link(props, ref) {
  return <a {...props} ref={ref} />;
});
