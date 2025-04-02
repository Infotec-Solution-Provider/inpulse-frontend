"use client";
import Image from "next/image";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import AutoComplete from "@/lib/components/auto-complete";
import { FaSearch, FaSignOutAlt } from "react-icons/fa";
import Button from "@/lib/components/button";
import Link from "next/link";
import { navigationItems } from "./navigation";
import { usePathname } from "next/navigation";
import { useContext, useMemo } from "react";
import { AuthContext } from "@/lib/contexts/auth.context";

export default function Header() {
  const { signOut, user } = useContext(AuthContext);

  const navOptions = useMemo(() => {
    if (!!user) {
      return navigationItems
        .filter((item) => !item.roles || item.roles.includes(user!.NIVEL || ""))
        .reduce(
          (acc, item) => {
            acc[item.title] = item.href;

            if (item.nestedItems) {
              item.nestedItems.forEach((subItem) => {
                acc[`${item.title} > ${subItem.title}`] = item.href + "/" + subItem.href;
              });
            }
            return acc;
          },
          {} as Record<string, string>,
        );
    }

    return {};
  }, [user]);

  // path completo /:instance/.../...
  const path = usePathname();

  // path sem o nome do cliente /.../...
  const currentPath = path.split("/").slice(2);

  // texto do path atual sem o cliente
  const pathText = navigationItems.reduce((a, b) => {
    if (b.href.includes(currentPath[0])) {
      a = b.title;
      const findItem = b.nestedItems?.find((n) => n.href === currentPath[1]);
      if (!!findItem) {
        a += " / " + findItem.title;
      }
    }
    return a;
  }, "");

  return (
    <header className="sticky top-0 z-20 text-sm shadow-2xl">
      <div className="flex items-center bg-slate-800">
        <div className="mx-auto flex w-[75rem] items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-8">
            <Image src={HorizontalLogo} alt={"Logo"} height={18} />
            <h1 className="text-sm">in.Pulse / {pathText}</h1>
          </div>

          <div className="my-auto text-xs">
            <AutoComplete
              options={navOptions}
              name="search"
              placeholder="Pesquisar"
              rightIcon={<FaSearch className="text-sm" />}
              size="lg"
              maxOptions={5}
            />
          </div>
          <div className="flex items-center gap-4">
            <h1 className="truncate text-xs">{user?.NOME}</h1>
            <Button title="logout" type="button" onClick={signOut}>
              <FaSignOutAlt />
            </Button>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r from-indigo-900 to-orange-900">
        <nav className="mx-auto w-[75rem] px-2 text-sm">
          <menu className="flex gap-4 px-4 py-1.5">
            {navigationItems.map((item) => (
              <MenuItem key={item.title} {...item} />
            ))}
          </menu>
        </nav>
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
    return false;
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
