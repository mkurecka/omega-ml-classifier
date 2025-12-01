# Deployment Guide (No Docker)

This guide explains how to deploy the ML Background Classifier directly to a Linux server using PM2 and GitLab CI/CD.

## Prerequisites on the Server

1.  **Node.js 18+**:
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

2.  **Build Tools** (Required for TensorFlow.js):
    ```bash
    sudo apt-get update
    sudo apt-get install -y python3 make g++ build-essential
    ```

3.  **PM2** (Process Manager):
    ```bash
    sudo npm install -g pm2
    ```

4.  **Application Directory**:
    Create the directory where the app will live (must match `DEPLOY_DIR` in `.gitlab-ci.yml`):
    ```bash
    sudo mkdir -p /var/www/ml-background-classifier
    # Ensure your deployment user has permissions
    sudo chown -R $USER:$USER /var/www/ml-background-classifier
    ```

5.  **Model Directory**:
    If you have a `model` directory that is not in git, manually copy it to the server or ensure the app can download/access it.
    ```bash
    # Example if model files need to be there
    mkdir -p /var/www/ml-background-classifier/model
    ```

## GitLab CI/CD Configuration

Go to your GitLab Repository -> Settings -> CI/CD -> Variables and add the following:

| Variable | Description |
|or|---|
| `SSH_PRIVATE_KEY` | The private SSH key to access the server. |
| `SERVER_IP` | The IP address of your server. |
| `SERVER_USER` | The username to SSH into (e.g., `ubuntu` or `root`). |
| `API_TOKEN` | The secret token for API authentication. |

## Deployment

Once setup, every push to `main` or `master` will trigger the pipeline:
1.  Connect to server via SSH.
2.  Rsync files (excluding node_modules).
3.  Run `npm ci` on the server.
4.  Rebuild TensorFlow.js native bindings.
5.  Restart the application using PM2.

## Manual Commands (On Server)

- **Logs**: `pm2 logs ml-background-classifier`
- **Status**: `pm2 status`
- **Restart**: `pm2 restart ml-background-classifier`
- **Stop**: `pm2 stop ml-background-classifier`
