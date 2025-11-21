# 🚀 Get Started

### Requirements

- NodeJS (recent version)
- pnpm
- docker

### Recommended VSCode settings

For linting, download the [ESLint](https://marketplace.visualstudio.com/items/?itemName=dbaeumer.vscode-eslint) extension.

Create a new file `.vscode/settings.json`

```jsonc
{
  // Use 2 spaces (project default)
  "editor.tabSize": 2,
  "editor.insertSpaces": true,

  // Format on save
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,

  // Use prettier with project config
  "prettier.resolveGlobalModules": false,
  "prettier.enable": true,

  // Use project's typescript version
  "typescript.tsdk": "node_modules/typescript/lib",
}
```

> Note: Formatting & Linting will be done anyway before commit _and_ after push, but for a better dev experience your settings should match.

### Database setup

You will need a running database.

```sh
# optional: add `--restart always` to make the container automatically restart
# whenever it stopped (e.g. on system restart).
docker run -d \
  --name vebtan-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  postgres:16
```

### Environment

Following environment variables are needed (via .env or system environment)

| variable       | description                            | example                                                      |
| -------------- | -------------------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL` | postgres connection string to database | `postgresql://<user>:<password>@localhost:<port>/<database>` |

### Install dependencies

```sh
pnpm install
```

### Run the app

```sh
pnpm run dev
```

# 📖 Resources

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
