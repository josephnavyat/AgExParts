import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TextField, Button, Box, Typography } from '@mui/material';
import Navbar from './Navbar.jsx';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#19a974' },
    background: { default: '#f7f7f7', paper: '#ffffff' },
    text: { primary: '#222', secondary: '#555' }
  }
});

export default function ResetPassword() {
  const query = useQuery();
  const token = query.get('token') || '';
  const emailFromQs = query.get('email') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('Missing token. Use the link from your email.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, email: emailFromQs }),
      });
      const data = await res.json();
  if (!res.ok) throw new Error(data && data.error ? data.error : 'Unknown error');
  // success - navigate to profile (login lives there in this app)
  navigate('/profile?reset=1');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemeProvider theme={lightTheme}>
      <Container maxWidth="sm">
        <Box sx={{ mt: 6 }}>
          <Paper elevation={6} sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h5" sx={{ mb: 2 }}>Set a new password</Typography>
            <form onSubmit={submit}>
              <TextField
                label="New password"
                type="password"
                fullWidth
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <TextField
                label="Confirm password"
                type="password"
                fullWidth
                margin="normal"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
              <Box sx={{ mt: 2 }}>
                <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Saving...' : 'Save new password'}</Button>
              </Box>
            </form>
          </Paper>
        </Box>
      </Container>
    </ThemeProvider>
  );
}
