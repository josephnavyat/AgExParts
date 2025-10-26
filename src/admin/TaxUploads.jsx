import React, { useEffect, useState } from 'react';

export default function TaxUploads() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('jwt');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/.netlify/functions/admin-list-tax-uploads', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setUploads(data.uploads || []);
      } catch (err) {
        setError(err.message || 'Error');
      } finally { setLoading(false); }
    }
    load();
  }, [token]);

  async function handleAction(id, approve) {
    const exp = approve ? prompt('Enter expiration date (YYYY-MM-DD) or leave blank') : null;
    try {
      const res = await fetch('/.netlify/functions/admin-approve-tax-exempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uploadId: id, approve, exp_date: exp })
      });
      if (!res.ok) throw new Error('Action failed');
      alert('Action completed');
      // refresh
      const r = await fetch('/.netlify/functions/admin-list-tax-uploads', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setUploads(d.uploads || []);
    } catch (err) {
      alert(err.message || 'Error');
    }
  }

  if (loading) return <div>Loading uploads...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Tax Exemption Uploads</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>ID</th><th>User</th><th>Filename</th><th>Preview</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {uploads.map(u => (
            <tr key={u.id} style={{ borderTop: '1px solid #ddd' }}>
              <td>{u.id}</td>
              <td>{u.username || '—'}</td>
              <td>{u.filename}</td>
              <td>{u.preview_url ? <a href={u.preview_url} target="_blank" rel="noreferrer">Preview</a> : '—'}</td>
              <td>{u.status}</td>
              <td>{new Date(u.uploaded_at).toLocaleString()}</td>
              <td>
                <button onClick={() => handleAction(u.id, true)}>Approve</button>
                <button onClick={() => handleAction(u.id, false)} style={{ marginLeft: 8 }}>Deny</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
