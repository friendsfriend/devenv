# Configuration Repository Guide

Use a configuration repository when you want to share DevEnv setup across machines or with a team.

## What goes into the repository

Commit the contents of:

```bash
~/.config/devenv
```

Do **not** commit the `.env` file. It can contain machine-specific paths and secrets.

Recommended `.gitignore`:

```gitignore
.env
providers/*.json
```

Provider credentials are stored outside normal app definitions and should stay local unless you intentionally manage them another secure way.

## 1. Create the repository

Create an empty Git repository in GitHub, GitLab, or another Git host.

Example:

```bash
mkdir devenv-config
cd devenv-config
git init
```

## 2. Copy your DevEnv config

Copy your current configuration into the repository:

```bash
cp -R ~/.config/devenv/. .
rm -f .env
```

If you do not have config yet, create the folders you want to share, for example:

```bash
mkdir -p apps/definitions libraries/definitions infrastructure/definitions
```

## 3. Ignore local-only files

Create `.gitignore`:

```bash
cat > .gitignore <<'EOF'
.env
providers/*.json
EOF
```

## 4. Commit and push

```bash
git add .
git commit -m "Add DevEnv configuration"
git remote add origin <your-config-repo-url>
git push -u origin main
```

## 5. Use it on another machine

Move any existing local config aside, then clone the repository:

```bash
mv ~/.config/devenv ~/.config/devenv.backup.$(date +%Y%m%d%H%M%S)
git clone <your-config-repo-url> ~/.config/devenv
```

Create a local `.env` file if needed:

```bash
cat > ~/.config/devenv/.env <<'EOF'
DEVENV_HOME=$HOME/devenv
EOF
```

## 6. Restart DevEnv

Quit and start DevEnv again. It will load applications, libraries, infrastructure, and scripts from the cloned config repository.

## Updating shared config

After adding or changing apps/infrastructure, commit and push the config changes:

```bash
cd ~/.config/devenv
git status
git add .
git commit -m "Update DevEnv config"
git push
```

On another machine:

```bash
cd ~/.config/devenv
git pull
```

Restart DevEnv after pulling changes.
