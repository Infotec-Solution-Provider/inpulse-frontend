export interface Navigationitem {
    title: string;
    href: string;
    roles?: string[];
    nestedItems?: NavigationItemChildren[];
}

export interface NavigationItemChildren {
    title: string;
    href: string;
    roles?: string[]
}

export const navigationItems: Navigationitem[] = [
    {
        title: "Conversas",
        href: "",
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
        title: "Relatórios",
        href: "/reports",
        roles: ["ADMIN"],
        nestedItems: [
            { title: "Conversas", href: "chats" },
        ]
    }
];