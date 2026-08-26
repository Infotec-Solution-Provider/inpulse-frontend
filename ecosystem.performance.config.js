const performancePort = Number.parseInt(process.env.PERFORMANCE_PORT || "3002", 10);

if (!Number.isInteger(performancePort) || performancePort < 1 || performancePort > 65535) {
    throw new Error("PERFORMANCE_PORT must be a valid TCP port");
}

module.exports = {
    apps: [
        {
            name: process.env.PERFORMANCE_APP_NAME || "performance",
            cwd: __dirname,
            script: "npm",
            args: "start",
            exec_mode: "fork",
            instances: 1,
            autorestart: true,
            env: {
                NODE_ENV: "production",
                HOSTNAME: "0.0.0.0",
                PORT: performancePort,
                // This value must also be present when `npm run build` is executed,
                // because NEXT_PUBLIC_* variables are embedded in the browser bundle.
                NEXT_PUBLIC_BUILD_SHA: process.env.NEXT_PUBLIC_BUILD_SHA || "performance"
            }
        }
    ]
};
