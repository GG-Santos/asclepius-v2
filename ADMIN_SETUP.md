# Admin Account Generation - Quick Reference Guide

You now have **three flexible ways** to generate admin accounts without needing to manually configure `.env` files:

## 🚀 Three Methods Available

### Method 1️⃣: Interactive Script (Best for Manual Setup)
```bash
npm run create-admin:interactive
```
✅ Prompts for email, password, and database credentials  
✅ No pre-configuration needed  
✅ User-friendly with clear feedback  
✅ Best for: Initial setup, development, manual deployments  

---

### Method 2️⃣: Command-Line Arguments (Best for Automation)
```bash
npm run create-admin:env -- \
  --email admin@example.com \
  --password SecurePass123 \
  --database-url "mongodb://localhost:27017/db" \
  --auth-secret "your-secret-key"
```
✅ No `.env` files needed  
✅ Perfect for CI/CD pipelines  
✅ Works in Docker, GitHub Actions, etc.  
✅ Best for: Automated deployments, containerized environments  

---

### Method 3️⃣: Environment Variables (Best for Existing Setup)
```bash
export DATABASE_URL="mongodb://..."
export BETTER_AUTH_SECRET="secret-key"
npm run create-admin admin@example.com SecurePass123
```
✅ Works with existing `.env` configuration  
✅ Simple and straightforward  
✅ Best for: Projects with existing env setup  

---

## 🎯 Quick Examples

### Docker Deployment
```dockerfile
# In your Dockerfile
RUN DATABASE_URL="mongodb://db:27017/mydb" \
    BETTER_AUTH_SECRET="secret" \
    npm run create-admin:env -- \
    --email admin@example.com \
    --password AdminPassword123
```

### GitHub Actions
```yaml
- name: Create Admin Account
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    BETTER_AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
  run: |
    npm run create-admin:env -- \
      --email ${{ secrets.ADMIN_EMAIL }} \
      --password ${{ secrets.ADMIN_PASSWORD }}
```

### Development/Testing
```bash
# Quick local testing
npx tsx scripts/create-admin-env.ts \
  --email dev@localhost \
  --password DevPassword123 \
  --database-url "mongodb://localhost:27017/asclepius" \
  --auth-secret "dev-secret-key"
```

---

## 📋 Available Scripts

All scripts are added to `package.json`:

```json
{
  "scripts": {
    "create-admin": "npx tsx scripts/create-admin.ts",
    "create-admin:interactive": "npx tsx scripts/create-admin-interactive.ts",
    "create-admin:env": "npx tsx scripts/create-admin-env.ts"
  }
}
```

---

## 📂 Script Files

- **`scripts/create-admin.ts`** - Original script (requires .env)
- **`scripts/create-admin-interactive.ts`** - Interactive prompts (NEW)
- **`scripts/create-admin-env.ts`** - CLI arguments & env vars (NEW)
- **`scripts/README.md`** - Complete documentation

---

## ✨ Key Features

✅ **No .env Required** - All methods work without pre-configured env files  
✅ **Flexible Input** - Choose between interactive, CLI args, or env vars  
✅ **Validation** - Validates email format and password length  
✅ **Create or Promote** - Creates new accounts or promotes existing users  
✅ **Email Verification** - Auto-verifies email for all admin accounts  
✅ **Clear Feedback** - User-friendly messages with status indicators  
✅ **CI/CD Ready** - Perfect for automated deployments  

---

## 🔐 Requirements

- Email: Valid email format
- Password: Minimum 8 characters
- DATABASE_URL: MongoDB connection string
- BETTER_AUTH_SECRET: Authentication secret key

---

## 📖 Full Documentation

For detailed information about all options and use cases, see:
```
scripts/README.md
```

Read it with:
```bash
cat scripts/README.md
```

---

## 🎓 Examples by Use Case

### Starting Fresh Development
```bash
npm run create-admin:interactive
# Follow the prompts - no setup needed!
```

### Automated Deployment
```bash
npm run create-admin:env -- \
  --email $ADMIN_EMAIL \
  --password $ADMIN_PASSWORD \
  --database-url $DB_URL \
  --auth-secret $AUTH_SECRET
```

### Docker/Container Setup
```bash
docker run -e DATABASE_URL=mongodb://... \
           -e BETTER_AUTH_SECRET=secret \
  myapp npm run create-admin:env -- \
  --email admin@example.com \
  --password SecurePass123
```

---

**That's it!** You can now generate admin accounts without dealing with environment files directly. Choose the method that works best for your workflow.
