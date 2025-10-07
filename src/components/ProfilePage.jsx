import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';

function ProfilePage() {
  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setLoggedInUser(null);
    setMessage('Logged out successfully.');
    setEditMode(false);
  };
  const [message, setMessage] = useState('');
  const [editFields, setEditFields] = useState({
    first_name: '',
    last_name: '',
    email: '',
    address: '',
    phone: ''
  });
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  // ...existing code...
  const [loggedInUser, setLoggedInUser] = useState(() => {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) return null;
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  });
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#19a974',
      },
      background: {
        default: '#181818',
        paper: '#232323',
      },
      text: {
        primary: '#fff',
        secondary: '#ccc',
      },
    },
  });
  return (
    <ThemeProvider theme={darkTheme}>
      <Container maxWidth="sm">
        <Box sx={{ mt: 6 }}>
          <Paper elevation={6} sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper' }}>
            {loggedInUser ? (
              <Box>
                <Typography variant="h4" align="center" gutterBottom color="text.primary">
                  Welcome, {loggedInUser.first_name} {loggedInUser.last_name}!
                </Typography>
                <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'background.default', color: 'text.primary' }}>
                  <Typography variant="body1"><strong>Username:</strong> {loggedInUser.username}</Typography>
                  <Typography variant="body1"><strong>Email:</strong> {loggedInUser.email || '—'}</Typography>
                  <Typography variant="body1"><strong>Address:</strong> {loggedInUser.address || '—'}</Typography>
                  <Typography variant="body1"><strong>Phone:</strong> {loggedInUser.phone || '—'}</Typography>
                </Box>
                {!editMode ? (
                  <Button fullWidth variant="contained" color="primary" sx={{ mb: 2, fontWeight: 600 }} onClick={() => setEditMode(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <Box component="form"
                    onSubmit={async e => {
                      e.preventDefault();
                      setMessage('');
                      try {
                        const res = await fetch('/.netlify/functions/update-user', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${localStorage.getItem('jwt')}`
                          },
                          body: JSON.stringify(editFields)
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setLoggedInUser({ ...loggedInUser, ...editFields });
                          setEditMode(false);
                          setMessage('Profile updated successfully.');
                        } else {
                          setMessage(data.error || 'Error updating profile.');
                        }
                      } catch (err) {
                        setMessage('Network error updating profile.');
                      }
                    }}
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}
                  >
                    <TextField
                      label="First Name"
                      variant="filled"
                      value={editFields.first_name}
                      onChange={e => setEditFields(f => ({ ...f, first_name: e.target.value }))}
                      required
                      color="primary"
                    />
                    <TextField
                      label="Last Name"
                      variant="filled"
                      value={editFields.last_name}
                      onChange={e => setEditFields(f => ({ ...f, last_name: e.target.value }))}
                      required
                      color="primary"
                    />
                    <TextField
                      label="Email"
                      variant="filled"
                      value={editFields.email}
                      onChange={e => setEditFields(f => ({ ...f, email: e.target.value }))}
                      type="email"
                      color="primary"
                    />
                    <TextField
                      label="Address"
                      variant="filled"
                      value={editFields.address}
                      onChange={e => setEditFields(f => ({ ...f, address: e.target.value }))}
                      color="primary"
                    />
                    <TextField
                      label="Phone Number"
                      variant="filled"
                      value={editFields.phone}
                      onChange={e => setEditFields(f => ({ ...f, phone: e.target.value }))}
                      type="tel"
                      color="primary"
                    />
                    <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 600 }}>
                      Save Changes
                    </Button>
                    <Button type="button" variant="outlined" color="secondary" sx={{ mt: 1 }} onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                  </Box>
                )}
                <Button fullWidth variant="contained" color="error" sx={{ fontWeight: 600 }} onClick={handleLogout}>
                  Logout
                </Button>
                {message && <Typography sx={{ mt: 2 }} align="center" color={message.includes('success') ? 'primary' : 'error'} fontWeight={600}>{message}</Typography>}
              </Box>
            ) : (
              <Box>
                <Typography variant="h4" align="center" gutterBottom color="text.primary">
                  {mode === 'login' ? 'Login' : 'Create Account'}
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Username"
                    variant="filled"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    color="primary"
                  />
                  <TextField
                    label="Password"
                    variant="filled"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    color="primary"
                  />
                  {mode === 'register' && (
                    <>
                      <TextField
                        label="First Name"
                        variant="filled"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        required
                        color="primary"
                      />
                      <TextField
                        label="Last Name"
                        variant="filled"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        required
                        color="primary"
                      />
                      <TextField
                        label="Email"
                        variant="filled"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        type="email"
                        color="primary"
                      />
                      <TextField
                        label="Address"
                        variant="filled"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        color="primary"
                      />
                      <TextField
                        label="Phone Number"
                        variant="filled"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        type="tel"
                        color="primary"
                      />
                    </>
                  )}
                  <Button type="submit" disabled={loading} variant="contained" color="primary" sx={{ fontWeight: 600 }}>
                    {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
                  </Button>
                </Box>
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button variant="text" color="primary" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} sx={{ fontWeight: 600 }}>
                    {mode === 'login' ? 'Create an account' : 'Already have an account? Login'}
                  </Button>
                </Box>
                {message && <Typography sx={{ mt: 2 }} align="center" color={message.includes('success') ? 'primary' : 'error'} fontWeight={600}>{message}</Typography>}
              </Box>
            )}
          </Paper>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default ProfilePage;
