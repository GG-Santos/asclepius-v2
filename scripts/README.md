# Admin Account Creation Scripts

This directory contains scripts for creating and managing admin accounts. Three different approaches are available depending on your use case.

## Quick Start

Choose the method that best fits your workflow:

### 1. **Interactive Script** (Recommended for manual setup)

Prompts you for email, password, and database credentials interactively.

```bash
npm run create-admin:interactive
# or
npx tsx scripts/create-admin-interactive.ts
```

**Prompts for:**
- Admin email
- Admin password (minimum 8 characters)
- DATABASE_URL (MongoDB connection string)
- BETTER_AUTH_SECRET

**Best for:** Initial setup, manual deployment, development environments

---

### 2. **Environment-based Script** (Recommended for automation)

Uses command-line arguments or environment variables.

```bash
# Using command-line arguments
npm run create-admin:env -- \
  --email admin@example.com \
  --password SecurePass123 \
  --database-url "******host:port/db" \
  --auth-secret "your-secret-key-here" \
  --name "Administrator"

# Using environment variables
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD=SecurePass123
export DATABASE_URL="******host:port/db"
export BETTER_AUTH_SECRET="your-secret-key-here"
npm run create-admin:env

# Or directly with tsx
npx tsx scripts/create-admin-env.ts \
  --email admin@example.com \
  --password SecurePass123 \
  --database-url "mongodb://..." \
  --auth-secret "secret"
```

**Supports:**
- Command-line arguments
- Environment variables (as fallback)
- Combination of both (CLI args take precedence)

**Best for:** CI/CD pipelines, automated deployments, Docker containers, development scripts

---

### 3. **Original Script** (Legacy support)

The original script with .env file support.

```bash
npm run create-admin admin@example.com SecurePass123

# Or with tsx directly
npx tsx scripts/create-admin.ts admin@example.com SecurePass123 "Admin Name"
```

**Setup required:**
- `.env` or `.env.local` file with DATABASE_URL and BETTER_AUTH_SECRET

**Best for:** Projects with existing .env setup

---

## Command Reference

### Interactive Script

```bash
npx tsx scripts/create-admin-interactive.ts [email] [password]
```

**Optional Arguments:**
- `[email]` - Skip email prompt by providing it as argument
- `[password]` - Skip password prompt by providing it as argument
- `[name]` - Set admin name (otherwise defaults to "Administrator")

**Examples:**
```bash
# Fully interactive
npx tsx scripts/create-admin-interactive.ts

# Pre-fill email, prompt for rest
npx tsx scripts/create-admin-interactive.ts admin@example.com

# Pre-fill email and password
npx tsx scripts/create-admin-interactive.ts admin@example.com MySecurePass123
```

---

### Environment-based Script

```bash
npx tsx scripts/create-admin-env.ts [options]
```

**Available Options:**
- `--email <email>` - Admin email address
- `--password <password>` - Admin password (minimum 8 characters)
- `--database-url <url>` - MongoDB connection string
- `--auth-secret <secret>` - BetterAuth secret key
- `--name <name>` - Admin name (default: "Administrator")

**Alternative option names:**
- `--db-url` (alias for `--database-url`)
- `--secret` (alias for `--auth-secret`)

**Examples:**
```bash
# Minimal - with env vars
DATABASE_URL="mongodb://..." BETTER_AUTH_SECRET="secret" \
  npx tsx scripts/create-admin-env.ts \
  --email admin@example.com \
  --password SecurePass123

# Complete - all args provided
npx tsx scripts/create-admin-env.ts \
  --email admin@example.com \
  --password SecurePass123 \
  --database-url "******host:port/db" \
  --auth-secret "very-secure-secret-key" \
  --name "Site Administrator"

# Mixed - some from env, some from args
DATABASE_URL="mongodb://..." \
  BETTER_AUTH_SECRET="secret" \
  npx tsx scripts/create-admin-env.ts \
  --email admin@example.com \
  --password SecurePass123
```

---

### Original Script

```bash
npx tsx scripts/create-admin.ts <email> <password> [name]
```

**Arguments:**
- `<email>` - Admin email (required, or set `ADMIN_EMAIL` env var)
- `<password>` - Admin password (required, or set `ADMIN_PASSWORD` env var)
- `[name]` - Admin name (optional, defaults to "Administrator")

**Examples:**
```bash
npx tsx scripts/create-admin.ts admin@example.com MySecurePass123

npx tsx scripts/create-admin.ts admin@example.com MySecurePass123 "Admin Name"

# With env file (.env or .env.local)
ADMIN_EMAIL=admin@example.com \
  ADMIN_PASSWORD=MySecurePass123 \
  npx tsx scripts/create-admin.ts
```

---

## Use Cases

### Scenario 1: Docker Deployment
```bash
docker run -e DATABASE_URL="..." -e BETTER_AUTH_SECRET="..." \
  myapp npx tsx scripts/create-admin-env.ts \
  --email admin@example.com \
  --password SecurePassword123
```

### Scenario 2: GitHub Actions
```yaml
- name: Create admin account
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    BETTER_AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
  run: |
    npm run create-admin:env -- \
      --email admin@example.com \
      --password ${{ secrets.ADMIN_PASSWORD }}
```

### Scenario 3: Manual Setup
```bash
# Interactive - just run it
npm run create-admin:interactive
```

### Scenario 4: Development
```bash
# If .env is already configured
npm run create-admin mydev@localhost SecureTestPass123

# Or with env args for quick testing
npx tsx scripts/create-admin-env.ts \
  --email test@localhost \
  --password TestPass123 \
  --database-url "mongodb://localhost:27017/mydb" \
  --auth-secret "dev-secret-key"
```

---

## Features

✅ **Interactive Prompts** - User-friendly prompts for manual setup  
✅ **CLI Arguments** - Supports command-line arguments for automation  
✅ **Environment Variables** - Reads from process env as fallback  
✅ **Validation** - Validates email format and password length  
✅ **Create or Promote** - Creates new accounts or promotes existing users to admin  
✅ **Email Verification** - Automatically marks email as verified  
✅ **Clear Feedback** - Visual feedback with emojis and status messages  

---

## Requirements

- Node.js 16+
- npm or similar package manager
- MongoDB database
- BetterAuth secret key

---

## Notes

- **Password Requirements:** Minimum 8 characters
- **Email Requirements:** Valid email format
- **Existing Users:** If the email already exists, the user is promoted to admin
- **Email Verification:** All created/promoted admin accounts have email verified set to true
- **Security:** Passwords are hashed using BetterAuth's password hashing algorithm

---

## Troubleshooting

### "DATABASE_URL is required"
Ensure you've either:
- Set the `DATABASE_URL` environment variable
- Provided `--database-url` as a CLI argument

### "BETTER_AUTH_SECRET is required"
Ensure you've either:
- Set the `BETTER_AUTH_SECRET` environment variable
- Provided `--auth-secret` as a CLI argument

### "Invalid email address"
Email must contain an `@` symbol and be a valid email format.

### "Password must be at least 8 characters"
Choose a password with at least 8 characters.

---

## Support

For issues or questions about these scripts, refer to:
- BetterAuth documentation: https://www.betterauth.dev
- Prisma documentation: https://www.prisma.io
