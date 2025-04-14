import { Button, Menu, MenuItem, Tooltip } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { ReactNode } from "react";

interface HeaderNavItemProps {
  title: string;
  children: ReactNode;
  href?: string;
  routes?: { title: string; href: string }[];
  disabled?: boolean;
}

export default function HeaderNavItem({
  title,
  children,
  href,
  routes,
  disabled,
}: HeaderNavItemProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const pathname = usePathname();
  const baseHref = pathname.split("/")[1];

  return (
    <li aria-disabled={Boolean(disabled)} className="relative list-none aria-disabled:hidden">
      <Tooltip title={<h2 className="text-base">{title}</h2>} arrow disableHoverListener={open}>
        {!routes ? (
          <Button component={Link} href={`/${baseHref}${href}`}>
            {children}
          </Button>
        ) : (
          <div>
            <Button onClick={handleClick}>{children}</Button>
            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
              {routes.map((route) => (
                <MenuItem key={route.title} onClick={handleClose}>
                  <Link href={`/${baseHref}${route.href}`}>{route.title}</Link>
                </MenuItem>
              ))}
            </Menu>
          </div>
        )}
      </Tooltip>
    </li>
  );
}
