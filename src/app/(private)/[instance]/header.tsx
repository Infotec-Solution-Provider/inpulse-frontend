"use client";
import Image from "next/image";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useMemo } from "react";
import { AuthContext } from "@/lib/contexts/auth.context";
import { Button, IconButton, Tooltip } from "@mui/material";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import MonitorIcon from "@mui/icons-material/Monitor";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import BarChartIcon from "@mui/icons-material/BarChart";
import BuildIcon from "@mui/icons-material/Build";

export default function Header() {
  const { signOut, user } = useContext(AuthContext);

  return (
    <header className="sticky top-0 z-20 shadow-2xl">
      <div className="flex items-center bg-slate-900">
        <div className="mx-auto flex w-screen items-center justify-between px-4 py-4">
          <div className="flex items-center gap-8">
            <Image src={HorizontalLogo} alt={"Logo"} height={36} />
          </div>
          <div>
            <Tooltip title={<h2 className="text-base">Area de atendimento</h2>} arrow>
              <Button>
                <HeadsetMicIcon />
              </Button>
            </Tooltip>

            <Tooltip title={<h2 className="text-base">Monitoria</h2>} arrow>
              <Button>
                <MonitorIcon />
              </Button>
            </Tooltip>

            <Tooltip title={<h2 className="text-base">Cadastros</h2>} arrow>
              <Button>
                <AppRegistrationIcon />
              </Button>
            </Tooltip>

            <Tooltip title={<h2 className="text-base">Relatórios</h2>} arrow>
              <Button>
                <BarChartIcon />
              </Button>
            </Tooltip>

            <Tooltip title={<h2 className="text-base">Ferramentas</h2>} arrow>
              <Button>
                <BuildIcon />
              </Button>
            </Tooltip>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="truncate">{user?.NOME}</h1>
            <IconButton title="notifications" type="button">
              <NotificationsIcon />
            </IconButton>
            <IconButton title="logout" type="button" onClick={signOut}>
              <LogoutIcon />
            </IconButton>
          </div>
        </div>
      </div>
    </header>
  );
}

interface MenuSubItem {
  title: string;
  href: string;
  roles?: string[];
}

interface MenuItemProps {
  title: string;
  href: string;
  roles?: string[];
  nestedItems?: MenuSubItem[];
}

function MenuItem({ title, href, nestedItems, roles }: MenuItemProps) {
  const { user } = useContext(AuthContext);
  // path completo /:instance/.../...
  const pathname = usePathname();
  const baseHref = pathname.split("/")[1];
  const display = useMemo(() => {
    if (!!user && roles) {
      return roles.includes(user.NIVEL || "");
    }
    return true;
  }, [user, roles]);

  return (
    <>
      {display && (
        <li className="group relative flex items-center gap-2">
          {nestedItems ? (
            <p className="cursor-default hover:text-indigo-400">{title}</p>
          ) : (
            <Link href={`/${baseHref}/${href}`} className="hover:text-indigo-400">
              {title}
            </Link>
          )}
          {nestedItems && (
            <div className="absolute bottom-0 left-0 z-20 hidden w-max translate-y-full pt-2 group-hover:block">
              <ul className="bg-neutral-700 px-4 py-1">
                {nestedItems.map((item) => (
                  <li key={item.title} className="w-max truncate p-1">
                    <Link
                      href={`/${baseHref}/${href}/${item.href}`}
                      className="hover:text-indigo-400"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      )}
    </>
  );
}
