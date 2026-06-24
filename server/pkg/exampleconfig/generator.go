package exampleconfig

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/friendsfriend/devenv/pkg/resources"
)

type Generator struct {
	ConfigDir string
	HomeDir   string
}

func New() (Generator, error) {
	home, err := resources.ResolveHomeDir("")
	if err != nil {
		return Generator{}, err
	}
	return Generator{ConfigDir: resources.ResolveConfigDir(), HomeDir: home}, nil
}

func (g Generator) Generate() error {
	if err := ensureEmpty(g.ConfigDir, "config directory"); err != nil {
		return err
	}
	scriptsDir := filepath.Join(g.HomeDir, "scripts")
	if err := ensureEmpty(scriptsDir, "scripts directory"); err != nil {
		return err
	}
	for path, content := range g.files() {
		mode := fs.FileMode(0644)
		if filepath.Dir(path) == scriptsDir {
			mode = 0755
		}
		if err := writeFile(path, content, mode); err != nil {
			return err
		}
	}
	return nil
}

func ensureEmpty(dir, label string) error {
	entries, err := os.ReadDir(dir)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if !entry.IsDir() {
			return fmt.Errorf("%s %q is not empty; move existing files or choose a clean directory", label, dir)
		}
		if err := ensureEmpty(filepath.Join(dir, entry.Name()), label); err != nil {
			return err
		}
	}
	return nil
}

func writeFile(path, content string, mode fs.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(content), mode)
}

func (g Generator) files() map[string]string {
	c, h, s := g.ConfigDir, g.HomeDir, filepath.Join(g.HomeDir, "scripts")
	return map[string]string{
		filepath.Join(c, ".env"): "DEVENV_HOME=" + h + "\n",
		filepath.Join(c, "apps", "definitions", "go-rest-postgres.json"):        `{"ident":"go-rest-postgres","displayName":"Go REST Postgres","repositoryPath":"https://github.com/pauljamescleary/go-rest-postgres.git","appType":"APP","containerBaseName":"go-rest-postgres","sourceType":"git","gitMode":"BRANCH"}` + "\n",
		filepath.Join(c, "apps", "definitions", "bhvr-site.json"):               `{"ident":"bhvr-site","displayName":"Bun TypeScript App","repositoryPath":"https://github.com/stevedylandev/bhvr-site.git","appType":"APP","containerBaseName":"bhvr-site","sourceType":"git","gitMode":"BRANCH"}` + "\n",
		filepath.Join(c, "libraries", "definitions", "bun-lib-starter.json"):    `{"ident":"bun-lib-starter","displayName":"Bun Library Starter","repositoryPath":"https://github.com/wobsoriano/bun-lib-starter.git","appType":"LIB","containerBaseName":"bun-lib-starter","sourceType":"git","gitMode":"BRANCH"}` + "\n",
		filepath.Join(c, "infrastructure", "definitions", "postgres.json"):      `{"ident":"postgres","displayName":"Postgres","containerBaseName":"example-postgres"}` + "\n",
		filepath.Join(c, "infrastructure", "definitions", "redis.json"):         `{"ident":"redis","displayName":"Redis","containerBaseName":"example-redis"}` + "\n",
		filepath.Join(c, "infrastructure", "definitions", "mailpit.json"):       `{"ident":"mailpit","displayName":"Mailpit","containerBaseName":"example-mailpit"}` + "\n",
		filepath.Join(c, "apps", "compose", "go-rest-postgres-compose.yml"):     goCompose,
		filepath.Join(c, "apps", "compose", "bhvr-site-compose.yml"):            bunCompose,
		filepath.Join(c, "apps", "compose", "bhvr-site-debug-compose.yml"):      bunDebugCompose,
		filepath.Join(c, "apps", "compose", "bhvr-site-with-redis-compose.yml"): bunRedisCompose,
		filepath.Join(c, "infrastructure", "compose", "postgres-compose.yml"):   postgresCompose,
		filepath.Join(c, "infrastructure", "compose", "redis-compose.yml"):      redisCompose,
		filepath.Join(c, "infrastructure", "compose", "mailpit-compose.yml"):    mailpitCompose,
		filepath.Join(c, "apps", "build", "go-rest-postgres-build.Dockerfile"):  goBuildDockerfile,
		filepath.Join(c, "apps", "build", "go-rest-postgres-test.Dockerfile"):   goTestDockerfile,
		filepath.Join(c, "apps", "build", "bhvr-site-build.Dockerfile"):         bunBuildDockerfile,
		filepath.Join(c, "apps", "build", "bhvr-site-test.Dockerfile"):          bunTestDockerfile,
		filepath.Join(c, "apps", "build", "bun-lib-starter-build.Dockerfile"):   bunLibBuildDockerfile,
		filepath.Join(c, "apps", "build", "bun-lib-starter-test.Dockerfile"):    bunLibTestDockerfile,
		filepath.Join(s, "hello.sh"):                                            "#!/usr/bin/env bash\nset -euo pipefail\necho 'Hello from DevEnv shell script'\n",
		filepath.Join(s, "hello.py"):                                            "#!/usr/bin/env python3\nprint('Hello from DevEnv Python script')\n",
		filepath.Join(s, "hello.ts"):                                            "#!/usr/bin/env bun\nconsole.log('Hello from DevEnv Bun script')\n",
	}
}

const goCompose = `services:
  go-rest-postgres:
    build:
      context: ../../..
      dockerfile: apps/build/go-rest-postgres-build.Dockerfile
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/example?sslmode=disable
    ports: ["8080:8080"]
    networks: [example]
networks:
  example:
    name: devenv-example
    external: true
`

const bunCompose = `services:
  bhvr-site:
    build:
      context: ../../..
      dockerfile: apps/build/bhvr-site-build.Dockerfile
    ports: ["3000:3000"]
`

const bunDebugCompose = `services:
  bhvr-site:
    build:
      context: ../../..
      dockerfile: apps/build/bhvr-site-build.Dockerfile
    command: bun --inspect run dev
    ports: ["3000:3000", "6499:6499"]
`

const bunRedisCompose = `services:
  bhvr-site:
    build:
      context: ../../..
      dockerfile: apps/build/bhvr-site-build.Dockerfile
    environment:
      REDIS_URL: redis://bhvr-redis:6379
    ports: ["3000:3000"]
  bhvr-redis:
    image: redis:7-alpine
`

const postgresCompose = `services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: example
    ports: ["5432:5432"]
    networks: [example]
networks:
  example:
    name: devenv-example
`
const redisCompose = "services:\n  redis:\n    image: redis:7-alpine\n    ports: [\"6379:6379\"]\n"
const mailpitCompose = "services:\n  mailpit:\n    image: axllent/mailpit:latest\n    ports: [\"8025:8025\", \"1025:1025\"]\n"

const goBuildDockerfile = "FROM golang:1.25-alpine\nWORKDIR /src\nCOPY . .\nRUN go mod download || true\nRUN go build ./...\nCMD [\"go\", \"run\", \"./...\"]\n"
const goTestDockerfile = "FROM golang:1.25-alpine\nWORKDIR /src\nCOPY . .\nRUN go test ./...\n"
const bunBuildDockerfile = "FROM oven/bun:1\nWORKDIR /src\nCOPY . .\nRUN bun install --frozen-lockfile || bun install\nRUN bun run build || true\nCMD [\"bun\", \"run\", \"dev\"]\n"
const bunTestDockerfile = "FROM oven/bun:1\nWORKDIR /src\nCOPY . .\nRUN bun install --frozen-lockfile || bun install\nRUN bun test || true\n"
const bunLibBuildDockerfile = "FROM oven/bun:1\nWORKDIR /src\nCOPY . .\nRUN bun install --frozen-lockfile || bun install\nRUN bun run build\n"
const bunLibTestDockerfile = "FROM oven/bun:1\nWORKDIR /src\nCOPY . .\nRUN bun install --frozen-lockfile || bun install\nRUN bun test || true\n"
