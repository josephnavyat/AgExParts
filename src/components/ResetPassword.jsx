import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TextField, Button, Box, Typography } from '@mui/material';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ResetPassword() {
  const query = useQuery();
  const token = query.get('token') || '';
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
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data && data.error ? data.error : 'Unknown error');
      // success - navigate to login or success page
      navigate('/login?reset=1');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 6, px: 2 }}>
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
    </Box>
  );
}
