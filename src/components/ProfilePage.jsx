import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';

function ProfilePage() {
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
  const [message, setMessage] = useState('');
  const [editFields, setEditFields] = useState({
    first_name: loggedInUser?.first_name || '',
    last_name: loggedInUser?.last_name || '',
    email: loggedInUser?.email || '',
    address: loggedInUser?.address || '',
    phone: loggedInUser?.phone || ''
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const endpoint = mode === 'login' ? '/.netlify/functions/login-user' : '/.netlify/functions/register-user';
      const body = mode === 'login'
        ? { email: username, password }
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
            setLoggedInUser(payload);
          } catch {
            setLoggedInUser({ username });
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
  const lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#19a974',
      },
      background: {
        default: '#f7f7f7',
        paper: '#ffffff',
      },
      text: {
        primary: '#222',
        secondary: '#555',
      },
    },
  });
  const [taxFile, setTaxFile] = useState(null);
  const [taxUploadMessage, setTaxUploadMessage] = useState('');
  const [taxPreviewUrl, setTaxPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [taxStatus, setTaxStatus] = useState(null);
  const [taxExpDate, setTaxExpDate] = useState(null);

  // Fetch fresh user profile including tax exemption fields
  React.useEffect(() => {
    async function fetchProfile() {
      try {
        const token = localStorage.getItem('jwt');
        if (!token) return;
        const res = await fetch('/.netlify/functions/get-user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.user) {
          setTaxStatus(Boolean(data.user.tax_exempt_status));
          setTaxExpDate(data.user.tax_exempt_exp_date || null);
          // update loggedInUser with any fresh fields
          setLoggedInUser(prev => ({ ...(prev || {}), ...data.user }));
        }
      } catch (err) {
        // ignore fetch errors silently
        console.error('Failed to fetch profile', err);
      }
    }
    fetchProfile();
  }, []);
  return (
    <ThemeProvider theme={lightTheme}>
      <Navbar />
      <Container maxWidth="sm">
        <Box sx={{ mt: 6 }}>
          <Paper elevation={6} sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper' }}>
            {loggedInUser ? (
              <Box>
                <Typography variant="h4" align="center" gutterBottom color="text.primary">
                  Welcome, {loggedInUser.first_name} {loggedInUser.last_name}!
                </Typography>
                {/* Navigation Tabs */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, gap: 2 }}>
                  <Button variant="outlined" color="primary" component={Link} to="#account-info" sx={{ fontWeight: 600 }}>
                    Account Info
                  </Button>
                  <Button variant="outlined" color="primary" component={Link} to="#tax-exemption" sx={{ fontWeight: 600 }}>
                    Tax Exemption
                  </Button>
                  {loggedInUser.user_type === 'admin' && (
                    <Button variant="outlined" color="secondary" component={Link} to="/orders" sx={{ fontWeight: 600 }}>
                      Order Dashboard
                    </Button>
                  )}
                </Box>
                {/* Account Info Section */}
                <Box id="account-info" sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'background.default', color: 'text.primary' }}>
                  <Typography variant="body1"><strong>Username:</strong> {loggedInUser.username}</Typography>
                  <Typography variant="body1"><strong>Email:</strong> {loggedInUser.email || '—'}</Typography>
                  <Typography variant="body1"><strong>Address:</strong> {loggedInUser.address || '—'}</Typography>
                  <Typography variant="body1"><strong>Phone:</strong> {loggedInUser.phone || '—'}</Typography>
                </Box>
                {/* Tax Exemption Section */}
                <Box id="tax-exemption" sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'background.default', color: 'text.primary' }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>Tax Exemption</Typography>
                  <TextField
                    label="Tax Exemption"
                    variant="filled"
                    value={taxStatus ? 'Tax Exempt' : 'Not Tax Exempt'}
                    InputProps={{ readOnly: true }}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Tax Exemption Expiration"
                    variant="filled"
                    value={taxExpDate ? new Date(taxExpDate).toLocaleDateString() : '—'}
                    InputProps={{ readOnly: true }}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Upload your tax exemption document (PDF or image). Our team will review and update your status.
                  </Typography>
                  <input
                    id="tax-file"
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={e => {
                      const f = e.target.files && e.target.files[0];
                      setTaxFile(f);
                      if (f && f.type && f.type.startsWith('image/')) {
                        const url = URL.createObjectURL(f);
                        setTaxPreviewUrl(url);
                      } else {
                        setTaxPreviewUrl(null);
                      }
                    }}
                    style={{ marginBottom: 8 }}
                  />
                  {taxPreviewUrl && <img src={taxPreviewUrl} alt="preview" style={{ maxWidth: '100%', marginBottom: 8 }} />}
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Button variant="contained" color="primary" disabled={!taxFile} onClick={() => {
                      if (!taxFile) return;
                      setTaxUploadMessage('');
                      setUploadProgress(0);
                      const form = new FormData();
                      form.append('file', taxFile);
                      form.append('username', loggedInUser.username || '');
                      const xhr = new XMLHttpRequest();
                      xhr.open('POST', '/.netlify/functions/upload-tax-exempt');
                      xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
                      };
                      xhr.onload = () => {
                        try {
                          const res = JSON.parse(xhr.responseText || '{}');
                          if (xhr.status >= 200 && xhr.status < 300) {
                            setTaxUploadMessage('Upload successful. We will review and update your tax exemption status.');
                            setTaxFile(null);
                            setTaxPreviewUrl(null);
                            const input = document.getElementById('tax-file'); if (input) input.value = '';
                          } else {
                            setTaxUploadMessage(res.error || 'Upload failed');
                          }
                        } catch (err) {
                          setTaxUploadMessage('Upload returned unexpected response');
                        }
                      };
                      xhr.onerror = () => setTaxUploadMessage('Network error during upload');
                      xhr.send(form);
                    }}>
                      Upload
                    </Button>
                    <Button variant="outlined" color="secondary" onClick={() => { setTaxFile(null); const input = document.getElementById('tax-file'); if (input) input.value = ''; setTaxUploadMessage(''); }}>
                      Cancel
                    </Button>
                  </Box>
                  {uploadProgress > 0 && uploadProgress < 100 && <Typography variant="body2">Uploading: {uploadProgress}%</Typography>}
                  {taxUploadMessage && <Typography variant="body2" color={taxUploadMessage.toLowerCase().includes('success') ? 'primary' : 'error'}>{taxUploadMessage}</Typography>}
                </Box>
                {/* Edit Profile Section */}
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
                <Box sx={{ mt: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button variant="text" color="primary" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} sx={{ fontWeight: 600 }}>
                    {mode === 'login' ? 'Create an account' : 'Already have an account? Login'}
                  </Button>
                  {mode === 'login' && (
                    <Button variant="text" color="secondary" sx={{ fontWeight: 600 }} component={Link} to="/recover-password">
                      Forgot Password?
                    </Button>
                  )}
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
