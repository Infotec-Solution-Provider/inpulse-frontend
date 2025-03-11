"use client"
import Image from "next/image";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import AutoComplete from "@/lib/components/auto-complete";
import { FaSearch, FaSignOutAlt } from "react-icons/fa";
import { useContext, useRef } from "react";
import { authContext } from "@/lib/contexts/auth-context";
import Button from "@/lib/components/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface PageHeaderProps {
	pageContext: string;
	pageTitle: string;
}

export default function Header({ pageContext, pageTitle }: PageHeaderProps) {
	const { user, signOut } = useContext(authContext);

	const menuItems: MenuItemProps[] = [
		{
			title: "Início",
			href: "/",
		},
		{
			title: "Monitoria",
			href: "/monitor",
			roles: ["ADMIN"],
			nestedItems: [
				{ title: "Atendimentos", href: "attendances" },
				{ title: "Agendamentos", href: "schedules" },
				{ title: "Usuários", href: "users" },
			]
		},
		{
			title: "Ferramentas",
			href: "/tools",
			roles: ["ADMIN"],
			nestedItems: [
				{ title: "Exportar Conversas", href: "export-chats" },
			]
		}
	];

	const navOptions = menuItems.filter(item => !item.roles || item.roles.includes(user?.NIVEL || ""))
		.reduce((acc, item) => {
			acc[item.title] = item.href;

			if (item.nestedItems) {
				item.nestedItems.forEach(subItem => {
					acc[`${item.title} > ${subItem.title}`] = item.href + "/" + subItem.href;
				})
			}
			return acc;
		}, {} as Record<string, string>);

	return (
		<header className="sticky top-0 z-20 text-sm shadow-2xl" >
			<div className="bg-slate-800 flex items-center ">
				<div className="mx-auto flex w-[75rem] items-center justify-between px-4 py-2.5 ">
					<div className="flex items-center gap-8">
						<Image src={HorizontalLogo} alt={"Logo"} height={18} />
						<h1 className="text-sm">
							inPulse / {pageContext} /{" "}
							<span className="text-indigo-200">{pageTitle}</span>
						</h1>
					</div>

					<div className="my-auto text-xs">
						<AutoComplete
							options={navOptions}
							name="search"
							placeholder="Pesquisar"
							rightIcon={<FaSearch className="text-sm" />}
							width="26rem"
							maxOptions={5}
						/>
					</div>
					<div className="flex items-center gap-4">
						<h1 className="truncate text-xs">
							{user?.NOME}
						</h1>
						<Button title="logout" type="button" onClick={signOut}>
							<FaSignOutAlt />
						</Button>
					</div>

				</div>
			</div>
			<div className="bg-gradient-to-r from-indigo-900 to-orange-900">
				<nav className="w-[75rem] mx-auto px-2 text-sm ">
					<menu className="flex gap-4 px-4 py-1.5">
						{
							menuItems.map((item) => (
								<MenuItem key={item.title} {...item} />
							))
						}
					</menu>
				</nav>
			</div>
		</header >
	);
}

interface MenuSubItem {
	title: string;
	href: string;
	roles?: string[]
}

interface MenuItemProps {
	title: string;
	href: string;
	roles?: string[];
	nestedItems?: MenuSubItem[];
}

function MenuItem({ title, href, nestedItems, roles }: MenuItemProps) {
	const { user } = useContext(authContext);

	const pathname = usePathname();
	const baseHref = pathname.split("/")[1] + "/app";
	const componentRef = useRef<HTMLLIElement>(null);
	const display = !roles || roles.includes(user?.NIVEL || "");

	return (
		<>
			{
				display &&
				<li className="flex items-center gap-2 relative group" ref={componentRef}>
					{
						nestedItems ?
							<p className="hover:text-indigo-400 cursor-default">{title}</p>
							:
							<Link href={`/${baseHref}/${href}`} className="hover:text-indigo-400">{title}</Link>
					}
					{
						nestedItems && (
							<div className="absolute bottom-0 left-0 w-max translate-y-full hidden group-hover:block pt-2 z-20" >
								<ul className="bg-neutral-700 px-4 py-1">
									{
										nestedItems.map((item) => (
											<li key={item.title} className="p-1 w-max truncate">
												<Link href={`/${baseHref}/${href}/${item.href}`} className="hover:text-indigo-400">{item.title}</Link>
											</li>
										))
									}
								</ul>
							</div>
						)
					}
				</li>
			}
		</>
	)
}