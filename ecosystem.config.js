module.exports = {
  apps: [{
    name: "ml-background-classifier",
    script: "./server.js",
    instances: 1,
    exec_mode: "fork",
    node_args: "--expose-gc",
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 3005
    }
  }]
}
