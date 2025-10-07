import React, { useState } from 'react';
import Navbar from './Navbar.jsx';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';

export default function ProfilePage() {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
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
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({
    first_name: loggedInUser?.first_name || '',
    last_name: loggedInUser?.last_name || '',
    email: loggedInUser?.email || '',
    address: loggedInUser?.address || '',
    phone: loggedInUser?.phone || ''
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const endpoint = mode === 'login' ? '/.netlify/functions/login-user' : '/.netlify/functions/register-user';
      const body = mode === 'login'
        ? { username, password }
        : {
            username,
            password,
            first_name: firstName,
            last_name: lastName,
            email,
            address,
            phone
          };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        if (mode === 'login') {
          setMessage('Login successful!');
          localStorage.setItem('jwt', data.token);
          try {
            const payload = JSON.parse(atob(data.token.split('.')[1]));
            setLoggedInUser(payload.username);
          } catch {
            setLoggedInUser(username);
          }
        } else {
          setMessage('Registration successful! You can now log in.');
          setMode('login');
        }
      } else {
        setMessage(data.error || 'Error occurred');
      }
    } catch (err) {
      setMessage('Network error');
    }
    setLoading(false);
  };

  const handleLogout = () => {
  localStorage.removeItem('jwt');
  setLoggedInUser(null);
  setMessage('Logged out successfully.');
  setEditMode(false);
  };

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
      {loggedInUser ? (
        <div>
          <h2 style={{ textAlign: 'center', marginBottom: 24, color: '#333' }}>Welcome, {loggedInUser.first_name} {loggedInUser.last_name}!</h2>
          <div style={{ marginBottom: 18, textAlign: 'left', background: '#f8f8f8', borderRadius: 8, padding: 16, color: '#222' }}>
            <strong style={{ color: '#333' }}>Username:</strong> {loggedInUser.username}<br />
            <strong style={{ color: '#333' }}>Email:</strong> {loggedInUser.email || '—'}<br />
            <strong style={{ color: '#333' }}>Address:</strong> {loggedInUser.address || '—'}<br />
            <strong style={{ color: '#333' }}>Phone:</strong> {loggedInUser.phone || '—'}<br />
          </div>
          {!editMode ? (
            <button onClick={() => setEditMode(true)} style={{ background: '#19a974', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 1.5rem', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', width: '100%', marginBottom: 12 }}>
              Edit Profile
            </button>
          ) : (
            <form
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
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}
            >
              <input
                type="text"
                placeholder="First Name"
                value={editFields.first_name}
                onChange={e => setEditFields(f => ({ ...f, first_name: e.target.value }))}
                required
                style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #ccc' }}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={editFields.last_name}
                onChange={e => setEditFields(f => ({ ...f, last_name: e.target.value }))}
                required
                style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #ccc' }}
              />
              <input
                type="email"
                placeholder="Email"
                value={editFields.email}
                onChange={e => setEditFields(f => ({ ...f, email: e.target.value }))}
                style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #ccc' }}
              />
              <input
                type="text"
                placeholder="Address"
                value={editFields.address}
                onChange={e => setEditFields(f => ({ ...f, address: e.target.value }))}
                style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #ccc' }}
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={editFields.phone}
                onChange={e => setEditFields(f => ({ ...f, phone: e.target.value }))}
                style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #ccc' }}
              />
              <button type="submit" style={{ background: '#19a974', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 1.5rem', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer' }}>
                Save Changes
              </button>
              <button type="button" onClick={() => setEditMode(false)} style={{ background: '#ccc', color: '#222', border: 'none', borderRadius: 8, padding: '0.75rem 1.5rem', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', marginTop: 6 }}>
                Cancel
              </button>
            </form>
          )}
          <button onClick={handleLogout} style={{ background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 1.5rem', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
            Logout
          </button>
          {message && <div style={{ marginTop: 18, color: '#19a974', textAlign: 'center', fontWeight: 600 }}>{message}</div>}
        </div>
      ) : (
        <div>
          <h2 style={{ textAlign: 'center', marginBottom: 24, color: '#333' }}>{mode === 'login' ? 'Login' : 'Create Account'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #ccc' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #ccc' }}
            />
            {mode === 'register' && (
              <>
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #ccc' }}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #ccc' }}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #ccc' }}
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #ccc' }}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #ccc' }}
                />
              </>
            )}
            <button type="submit" disabled={loading} style={{ background: '#19a974', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 1.5rem', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ background: 'none', border: 'none', color: '#19a974', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}>
              {mode === 'login' ? 'Create an account' : 'Already have an account? Login'}
            </button>
          </div>
          {message && <div style={{ marginTop: 18, color: message.includes('success') ? '#19a974' : '#d32f2f', textAlign: 'center', fontWeight: 600 }}>{message}</div>}
        </div>
      )}
    }
