import React, { useState } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';

const RecoverPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/.netlify/functions/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Password reset link sent! Check your email.');
      } else {
        setMessage(data.error || 'Could not send reset link.');
      }
    } catch (err) {
      setMessage('Error sending reset link.');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8, p: 3, boxShadow: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
      <Typography variant="h4" align="center" gutterBottom color="text.primary">
        Recover Password
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Email"
          variant="filled"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          color="primary"
        />
        <Button type="submit" disabled={loading} variant="contained" color="primary" sx={{ fontWeight: 600 }}>
          {loading ? 'Please wait...' : 'Send Reset Link'}
        </Button>
      </Box>
      {message && <Typography sx={{ mt: 2 }} align="center" color={message.includes('sent') ? 'primary' : 'error'} fontWeight={600}>{message}</Typography>}
    </Box>
  );
};

export default RecoverPassword;
