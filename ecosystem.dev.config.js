const fnmBootstrap = 'export FNM_DIR="$HOME/.local/share/fnm"; eval "$("$FNM_DIR/fnm" env --shell bash)"; pnpm dev';

const services = [
    {
        name: "instances",
        cwd: "/home/renan/Área de trabalho/Workspace/infotec/instances-service"
    },
    {
        name: "users",
        cwd: "/home/renan/Área de trabalho/Workspace/infotec/users-service"
    },
    {
        name: "customers",
        cwd: "/home/renan/Área de trabalho/Workspace/infotec/customers-service"
    },
    {
        name: "files",
        cwd: "/home/renan/Área de trabalho/Workspace/infotec/files-service"
    },
    {
        name: "socket",
        cwd: "/home/renan/Área de trabalho/Workspace/infotec/socket-service"
    },
    {
        name: "whatsapp",
        cwd: "/home/renan/Área de trabalho/Workspace/infotec/whatsapp-service"
    },
    {
        name: "frontend",
        cwd: "/home/renan/Área de trabalho/Workspace/infotec/inpulse-frontend"
    }
];

module.exports = {
    apps: services.map((service) => ({
        name: service.name,
        cwd: service.cwd,
        script: "bash",
        interpreter: "none",
        args: ["-lc", fnmBootstrap]
    }))
};