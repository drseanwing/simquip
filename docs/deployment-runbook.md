# SimQuip Deployment Runbook

> Version: 1.0 | Date: 2026-02-18 | Author: SimQuip Team

## 1. Prerequisites

Before deploying SimQuip, ensure the following are installed and available:

| Requirement | Version | How to verify |
|---|---|---|
| Node.js | LTS (v20+) | `node --version` |
| npm | 10+ (ships with Node LTS) | `npm --version` |
| PAC CLI | Latest | `pac --version` |
| VS Code | Latest (recommended) | `code --version` |
| Power Platform environment | Code Apps enabled | Confirm in Power Platform admin center |
| Entra ID credentials | -- | Access to target environment with maker role |

### Installing PAC CLI

The PAC CLI can be installed as either:

**Option A: VS Code extension (recommended for development)**
- Install the "Power Platform Tools" extension from the VS Code marketplace.

**Option B: .NET global tool**
```bash
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
```

## 2. Environment Setup

### 2.1 Authenticate to Power Platform

Create an authentication profile linked to your Entra ID credentials:

```bash
pac auth create
```

This opens a browser-based authentication flow. Sign in with an account that has maker permissions on the target environment.

To list existing authentication profiles:

```bash
pac auth list
```

### 2.2 Select the target environment

```bash
pac env list
pac env select --environment <environment-url-or-id>
```

Replace `<environment-url-or-id>` with the URL (e.g., `https://org12345.crm6.dynamics.com`) or the environment GUID.

Verify the selected environment:

```bash
pac env who
```

### 2.3 Initialize the Code App (first-time only)

If this is a new environment where SimQuip has never been deployed:

```bash
pac code init --displayName "SimQuip"
```

This registers the Code App component within the Power Platform solution.

## 3. Data Source Setup

Register Dataverse tables as data sources. Run each command once per table during initial setup:

```bash
pac code add-data-source --adapter dataverse --table Person
pac code add-data-source --adapter dataverse --table Team
pac code add-data-source --adapter dataverse --table TeamMember
pac code add-data-source --adapter dataverse --table Building
pac code add-data-source --adapter dataverse --table Level
pac code add-data-source --adapter dataverse --table Location
pac code add-data-source --adapter dataverse --table Equipment
pac code add-data-source --adapter dataverse --table EquipmentMedia
pac code add-data-source --adapter dataverse --table LocationMedia
pac code add-data-source --adapter dataverse --table LoanTransfer
```

After adding data sources, the Power Apps SDK generates typed service stubs under the project. Verify by checking that `@microsoft/power-apps` resolves the registered data sources.

## 4. Local Development

### 4.1 Install dependencies

```bash
npm install
```

### 4.2 Run the development server

```bash
npm run dev
```

This starts the Vite development server on port 3000. For local development without Power Platform connectivity, set the following environment variable in a `.env.local` file:

```
VITE_ENABLE_MOCK_DATA=true
VITE_APP_ENV=development
```

### 4.3 Run with PAC middleware (connected to Power Platform)

For testing with live Dataverse data:

```bash
pac code run
```

This starts the PAC middleware proxy alongside the Vite dev server, providing authenticated access to Dataverse connectors.

### 4.4 Run tests

```bash
npm test          # Watch mode
npm run test:run  # Single run
```

### 4.5 Type checking and linting

```bash
npm run typecheck
npm run lint
npm run format:check
```

## 5. Build and Deploy

### 5.1 Build the production bundle

```bash
npm run build
```

This runs TypeScript compilation (`tsc -b`) followed by the Vite production build. Output is written to the `dist/` directory.

Verify the build succeeded:

```bash
ls -la dist/
```

### 5.2 Push to Power Platform

```bash
pac code push --solution-name SimQuip
```

This uploads the built assets to the selected Power Platform environment and publishes the Code App within the specified solution.

### 5.3 Verify the deployment

1. Open the Power Platform maker portal for the target environment.
2. Navigate to Solutions and find the "SimQuip" solution.
3. Open the Code App component and verify it loads correctly.
4. Test core functionality: navigate between Dashboard, Equipment, Locations, Teams, and Loans pages.

## 6. Connection Reference Handling

### 6.1 Solution-aware connection references

SimQuip uses solution-aware connection references for all Dataverse data-source connections. When deploying to a new environment:

1. Export the solution from the source environment:
   ```bash
   pac solution export --name SimQuip --path ./exports/SimQuip.zip
   ```

2. Generate deployment settings for the target environment:
   ```bash
   pac solution create-settings --solution-zip ./exports/SimQuip.zip --settings-file ./exports/deploy-settings.json
   ```

3. Edit `deploy-settings.json` to map connection references to the target environment's connections.

4. Import the solution to the target environment:
   ```bash
   pac solution import --path ./exports/SimQuip.zip --settings-file ./exports/deploy-settings.json
   ```

### 6.2 Power Automate flow references

Reminder notification flows are managed externally via Power Automate. After deployment:

1. Verify that all flow connection references point to valid connections in the target environment.
2. Activate any flows that were imported in an off state.
3. Test trigger conditions by creating a draft loan with a due date that would fire a reminder.

## 7. Rollback Procedure

If a deployment introduces issues, roll back to the previous version:

### 7.1 Solution rollback

1. In the Power Platform maker portal, navigate to Solutions.
2. Select the SimQuip solution.
3. Use the solution history to restore the previous version, or re-import the last known-good solution export.

### 7.2 Code rollback

1. Identify the last known-good commit:
   ```bash
   git log --oneline -10
   ```

2. Check out the previous version:
   ```bash
   git checkout <commit-hash>
   ```

3. Rebuild and redeploy:
   ```bash
   npm install
   npm run build
   pac code push --solution-name SimQuip
   ```

4. Return to the main branch after confirming the rollback:
   ```bash
   git checkout main
   ```

### 7.3 Emergency rollback

If the Code App is completely non-functional:

1. Disable the Code App component in the Power Platform maker portal.
2. Investigate the root cause using browser developer tools (Console and Network tabs).
3. Once the fix is identified, deploy the corrected version following the standard procedure in Section 5.

## 8. Troubleshooting

### 8.1 `pac auth create` fails or times out

**Symptom:** Browser authentication window does not appear or returns an error.

**Resolution:**
- Ensure you are on a network that allows access to `login.microsoftonline.com`.
- Clear cached credentials: `pac auth clear` then retry.
- If using a corporate proxy, configure the `HTTPS_PROXY` environment variable.

### 8.2 `pac code push` returns "solution not found"

**Symptom:** Deployment fails with a solution reference error.

**Resolution:**
- Verify the solution name matches exactly (case-sensitive): `pac solution list`.
- Ensure you are authenticated to the correct environment: `pac env who`.
- If the solution does not exist, create it first in the maker portal or via `pac solution init`.

### 8.3 Data sources return 401/403 errors

**Symptom:** API calls to Dataverse fail with authentication or authorization errors.

**Resolution:**
- Confirm your Entra ID account has the required security roles in the target Dataverse environment.
- Re-authenticate: `pac auth create --environment <url>`.
- Check that connection references in the solution are mapped to valid, active connections.

### 8.4 Build fails with TypeScript errors

**Symptom:** `npm run build` exits with type errors.

**Resolution:**
- Run `npm run typecheck` to see the full list of errors.
- Ensure dependencies are up to date: `npm install`.
- Verify `tsconfig.json` has not been modified unintentionally.

### 8.5 Mock data mode not activating

**Symptom:** Application attempts to call Power Apps SDK in development instead of using mock data.

**Resolution:**
- Ensure the `.env.local` file exists in the project root with:
  ```
  VITE_ENABLE_MOCK_DATA=true
  ```
- Restart the dev server after changing environment variables (Vite does not hot-reload `.env` files).

### 8.6 Service worker caching stale assets

**Symptom:** After deployment, users see the old version of the application.

**Resolution:**
- Hard-refresh the browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS).
- If persistent, unregister the service worker via browser dev tools: Application > Service Workers > Unregister.
- For a managed rollout, increment the service worker version identifier to force cache invalidation.

### 8.7 Vite dev server port conflict

**Symptom:** `npm run dev` fails because port 3000 is already in use.

**Resolution:**
- Stop the other process using port 3000, or
- Override the port: `npm run dev -- --port 3001`.
