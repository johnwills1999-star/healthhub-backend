const express = require('express');
const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL;

app.get('/auth/login', async (req, res) => {
  const redirectUri = req.query.redirect_uri || 'vibecode://oauth/callback';
  
  try {
    // Create a demo user and get auth code
    const response = await fetch(`https://api.1up.health/user-management/v1/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_user_id: `demo_${Date.now()}`,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      })
    });
    
    const userData = await response.json();
    const code = userData.code;
    
    // Redirect to token exchange
    res.redirect(`${BACKEND_URL}/auth/callback?code=${code}&state=${encodeURIComponent(redirectUri)}`);
  } catch (error) {
    res.status(500).send('Failed to create user: ' + error.message);
  }
});

app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  const appRedirectUri = decodeURIComponent(state || 'vibecode://oauth/callback');
  
  try {
    const tokenResponse = await fetch('https://api.1up.health/fhir/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      })
    });
    
    const tokens = await tokenResponse.json();
    const redirectUrl = `${appRedirectUri}?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token || ''}&user_id=${tokens.patient || ''}`;
    res.redirect(redirectUrl);
  } catch (error) {
    res.redirect(`${appRedirectUri}?error=auth_failed`);
  }
});

app.get('/', (req, res) => {
  res.send('HealthHub Backend is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
