import http from 'http';
import { exec } from 'child_process';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log('\n======================================================');
  console.log('   Google Drive OAuth 2.0 Refresh Token Generator');
  console.log('======================================================\n');
  console.log('This will link your personal Gmail Google Drive (15GB free)');
  console.log('so the app can upload documents without quota restrictions.\n');

  // Read existing env if present
  const envPath = path.join(process.cwd(), '.env.local');
  let currentEnv = '';
  if (fs.existsSync(envPath)) {
    currentEnv = fs.readFileSync(envPath, 'utf8');
  }

  const clientIdMatch = currentEnv.match(/GOOGLE_CLIENT_ID=(.*)/);
  const clientSecretMatch = currentEnv.match(/GOOGLE_CLIENT_SECRET=(.*)/);

  let clientId = clientIdMatch ? clientIdMatch[1].trim() : '';
  let clientSecret = clientSecretMatch ? clientSecretMatch[1].trim() : '';

  if (!clientId) {
    clientId = await ask('1. Enter your Google Client ID: ');
    clientId = clientId.trim();
  } else {
    console.log(`Using existing Client ID: ${clientId.substring(0, 15)}...`);
  }

  if (!clientSecret) {
    clientSecret = await ask('2. Enter your Google Client Secret: ');
    clientSecret = clientSecret.trim();
  } else {
    console.log(`Using existing Client Secret: ${clientSecret.substring(0, 5)}...`);
  }

  const PORT = 8085;
  const REDIRECT_URI = `http://localhost:${PORT}`;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive'],
  });

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      const code = parsedUrl.searchParams.get('code');

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <div style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #047857;">&#10004; Google Drive Authentication Successful!</h1>
            <p>You can close this tab and return to your terminal.</p>
          </div>
        `);

        console.log('\nAuthorization code received! Exchanging for Refresh Token...');
        const { tokens } = await oauth2Client.getToken(code);

        console.log('\n======================================================');
        console.log('   SUCCESS! Your Google Drive Tokens are Ready:');
        console.log('======================================================\n');
        console.log(`GOOGLE_CLIENT_ID=${clientId}`);
        console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);

        // Save to .env.local
        let newEnv = currentEnv;
        if (!newEnv.includes('GOOGLE_CLIENT_ID=')) {
          newEnv += `\nGOOGLE_CLIENT_ID=${clientId}`;
        }
        if (!newEnv.includes('GOOGLE_CLIENT_SECRET=')) {
          newEnv += `\nGOOGLE_CLIENT_SECRET=${clientSecret}`;
        }
        if (newEnv.includes('GOOGLE_REFRESH_TOKEN=')) {
          newEnv = newEnv.replace(/GOOGLE_REFRESH_TOKEN=.*/, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        } else {
          newEnv += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`;
        }

        fs.writeFileSync(envPath, newEnv.trim() + '\n', 'utf8');
        console.log('Saved to .env.local automatically!\n');
        console.log('Add these 3 keys to your Vercel Environment Variables:');
        console.log('  1. GOOGLE_CLIENT_ID');
        console.log('  2. GOOGLE_CLIENT_SECRET');
        console.log('  3. GOOGLE_REFRESH_TOKEN\n');

        rl.close();
        server.close();
        process.exit(0);
      }
    } catch (e) {
      console.error('Error exchanging code for token:', e);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Authentication failed. Check terminal.');
      rl.close();
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log('\n======================================================');
    console.log('👉 Opening Google Chrome to authenticate with Google...');
    console.log('======================================================\n');
    console.log('If Google Chrome does not open automatically, copy & paste this link into Chrome:\n');
    console.log(authUrl + '\n');

    // Explicitly launch Google Chrome on macOS
    exec(`open -a "Google Chrome" "${authUrl}"`, (err) => {
      if (err) {
        // Fallback to default browser if Google Chrome is named differently
        exec(`open "${authUrl}"`);
      }
    });
  });
}

main().catch(console.error);
