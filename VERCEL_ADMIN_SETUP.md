# Admin Account Setup for Vercel Deployments

This guide explains how to create admin accounts in your Vercel deployment of Asclepius.

## Using the Admin API Endpoint

Since CLI scripts (`npm run create-admin`) cannot be executed in Vercel's serverless environment, we've created an API endpoint that can be called after deployment.

### Endpoint Details

- **URL:** `https://your-app-domain.vercel.app/api/admin/create`
- **Method:** `POST`
- **Hard-coded Credentials:**
  - Email: `admin@test.local`
  - Password: `qwerty1234`

### Method 1: Quick Setup (No Security)

If you haven't set `ADMIN_CREATE_SECRET` environment variable, just make a POST request:

```bash
curl -X POST https://your-app-domain.vercel.app/api/admin/create
```

### Method 2: Secure Setup (Recommended)

For security, set the `ADMIN_CREATE_SECRET` environment variable in Vercel:

1. Go to your Vercel project settings
2. Navigate to **Settings → Environment Variables**
3. Add a new variable:
   - **Name:** `ADMIN_CREATE_SECRET`
   - **Value:** Your secure secret key (e.g., a random string)

Then call the endpoint with the secret:

```bash
curl -X POST \
  -H "X-Admin-Secret: your-secret-key" \
  https://your-app-domain.vercel.app/api/admin/create
```

### Method 3: Using Vercel Deployment Hooks

You can automate this using Vercel deployment webhooks:

1. Create a deployment hook in Vercel project settings
2. After successful deployment, call the admin creation endpoint
3. Example using GitHub Actions:

```yaml
name: Create Admin After Deploy

on:
  deployment_status:
    if: github.event.deployment_status.state == 'success'

jobs:
  create-admin:
    runs-on: ubuntu-latest
    steps:
      - name: Create Admin Account
        run: |
          curl -X POST \
            -H "X-Admin-Secret: ${{ secrets.ADMIN_CREATE_SECRET }}" \
            https://your-app-domain.vercel.app/api/admin/create
```

### Testing the Endpoint

Check if the endpoint is working:

```bash
# Without secret (if ADMIN_CREATE_SECRET is not set)
curl https://your-app-domain.vercel.app/api/admin/create

# With secret
curl -H "X-Admin-Secret: your-secret-key" \
  https://your-app-domain.vercel.app/api/admin/create
```

Expected response:
```json
{
  "endpoint": "/api/admin/create",
  "method": "POST",
  "description": "Create or promote an admin account with hard-coded credentials",
  "credentials": {
    "email": "admin@test.local",
    "password": "***hidden***"
  },
  "headers": {
    "X-Admin-Secret": "optional (if ADMIN_CREATE_SECRET env var is set)"
  }
}
```

## Response Examples

### Success - New Account Created

```json
{
  "success": true,
  "message": "Created new admin account: admin@test.local",
  "email": "admin@test.local",
  "action": "created"
}
```

Status: `201 Created`

### Success - Account Promoted

```json
{
  "success": true,
  "message": "Promoted existing user to admin: admin@test.local",
  "email": "admin@test.local",
  "action": "promoted"
}
```

Status: `200 OK`

### Error - Unauthorized

```json
{
  "error": "Unauthorized: Invalid or missing admin secret"
}
```

Status: `401 Unauthorized`

### Error - Server Error

```json
{
  "error": "Failed to create admin account",
  "details": "Error details here"
}
```

Status: `500 Internal Server Error`

## CLI Scripts (for Local Development)

For local development, you can still use the CLI scripts:

```bash
# Interactive mode
npm run create-admin:interactive

# With arguments
npm run create-admin:env -- \
  --email admin@test.local \
  --password qwerty1234 \
  --database-url "mongodb://..." \
  --auth-secret "your-secret"
```

See `ADMIN_SETUP.md` for more details on local setup.

## Security Notes

- **In Production:** Always set `ADMIN_CREATE_SECRET` for the endpoint
- **Hard-coded Credentials:** Use these for initial setup, then change them after login
- **Email Verification:** Admin accounts created via this endpoint are automatically verified
- **Secret Storage:** Keep `ADMIN_CREATE_SECRET` in Vercel's encrypted environment variables

## Troubleshooting

### Endpoint returns 404

- Ensure the application is properly deployed
- Wait for deployment to complete
- Check that the URL matches your Vercel domain

### Database connection errors

- Verify `DATABASE_URL` is set in Vercel environment variables
- Ensure MongoDB connection string is valid
- Check database is accessible from Vercel region

### "Failed to create admin account"

- Check server logs in Vercel dashboard
- Verify `BETTER_AUTH_SECRET` is set
- Ensure email is valid
- Try accessing the endpoint via GET to see if it loads
