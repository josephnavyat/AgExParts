import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { DataGrid } from "@mui/x-data-grid";
import { Accordion, AccordionSummary, AccordionDetails, Typography, Box, Paper } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Editable form for shipping cost and status
function OrderEditForm({ order, onUpdate }) {
  const [shipping, setShipping] = React.useState(order.shipping_total ?? '');
  const [status, setStatus] = React.useState(order.status ?? '');
  const [email, setEmail] = React.useState(order.customer_email ?? '');
  const [emailSubject, setEmailSubject] = React.useState('Order Update');
  const [emailText, setEmailText] = React.useState('');
  React.useEffect(() => {
    setShipping(order.shipping_total ?? '');
    setStatus(order.status ?? '');
    setEmail(order.customer_email ?? '');
  }, [order]);
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onUpdate({
          orderId: order.id,
          shipping_total: shipping,
          status,
          email,
          emailSubject,
          emailText,
        });
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <label>
        Shipping Cost ($):
        <input type="number" step="0.01" value={shipping} onChange={e => setShipping(e.target.value)} style={{ marginLeft: 8 }} />
      </label>
      <label>
        Status:
        <input type="text" value={status} onChange={e => setStatus(e.target.value)} style={{ marginLeft: 8 }} />
      </label>
      <label>
        Email (optional):
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ marginLeft: 8 }} />
      </label>
      <label>
        Email Subject:
        <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={{ marginLeft: 8 }} />
      </label>
      <label>
        Email Text:
        <textarea value={emailText} onChange={e => setEmailText(e.target.value)} style={{ marginLeft: 8, minHeight: 60 }} />
      </label>
      <button type="submit" style={{ marginTop: 12, fontWeight: 700, borderRadius: 6, padding: '0.5rem 1.5rem', background: '#1976d2', color: '#fff', border: 'none' }}>Update & Send Email</button>
    </form>
  );
}

function OrdersDashboard({ orders, setOrders, error, statusCounts, statusFilter, setStatusFilter, columns, loading, expandedOrder, setExpandedOrder }) {
  // Ensure statusCounts is always an object
  const safeStatusCounts = statusCounts || {};
  // Ensure chartData is always an array
  const chartData = Array.isArray(Object.entries(safeStatusCounts)) ? Object.entries(safeStatusCounts).map(([status, count], idx) => ({
    name: status || "Unknown",
    value: count,
    color: STATUS_COLORS[idx % STATUS_COLORS.length]
  })) : [];

  // Ensure filteredOrders is always an array
  const filteredOrders = Array.isArray(orders) ? (statusFilter ? orders.filter(o => o.status === statusFilter) : orders) : [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Orders
      </Typography>
      {error && <Typography color="error">{error}</Typography>}
      {chartData.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Order Status Breakdown</Typography>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                onClick={(data, idx) => setStatusFilter(data.name)}
              >
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} cursor="pointer" />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          {statusFilter && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                Showing orders with status: <b>{statusFilter}</b>
                <span style={{ cursor: 'pointer', color: '#1976d2', marginLeft: 12 }} onClick={() => setStatusFilter(null)}>[Clear Filter]</span>
              </Typography>
            </Box>
          )}
        </Paper>
      )}
      <Paper sx={{ height: 400, mb: 3 }}>
        <DataGrid
          rows={filteredOrders}
          columns={columns}
          pageSize={5}
          loading={loading}
          getRowId={(row) => row.id}
          onRowClick={(params) => setExpandedOrder(params.row.id)}
        />
      </Paper>
      {filteredOrders.map((order) =>
        expandedOrder === order.id ? (
          <Box key={order.id} sx={{ mt: 2 }}>
            <OrderItemsAccordion items={order.items && Array.isArray(order.items) ? order.items : []} expanded={true} />
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>Edit Shipping & Status</Typography>
              <OrderEditForm order={order} onUpdate={async (update) => {
                try {
                  const res = await fetch('/.netlify/functions/update-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(update),
                  });
                  if (!res.ok) throw new Error('Update failed');
                  setOrders((prev) => prev.map(o => o.id === order.id ? { ...o, ...update } : o));
                  alert('Order updated!');
                } catch (err) {
                  alert('Error: ' + err.message);
                }
              }} />
            </Paper>
          </Box>
        ) : null
      )}
    </Box>
  );
}

export default OrdersDashboard;

