module.exports = {
  apps: [
    {
      name: "creativeai-api",
      cwd: "/var/www/creativeai",
      script: "npm",
      args: "run server",
      env: {
        NODE_ENV: "production",
        API_HOST: "127.0.0.1",
        PORT: "3847",
      },
      max_memory_restart: "700M",
      autorestart: true,
      watch: false,
      time: true,
      out_file: "/var/log/creativeai/api-out.log",
      error_file: "/var/log/creativeai/api-err.log",
    },
    {
      name: "creativeai-creagic",
      cwd: "/var/www/creativeai",
      script: "npm",
      args: "run creagic:api",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "700M",
      autorestart: true,
      watch: false,
      time: true,
      out_file: "/var/log/creativeai/creagic-out.log",
      error_file: "/var/log/creativeai/creagic-err.log",
    },
  ],
};
