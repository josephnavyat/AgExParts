import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Select, MenuItem } from "@mui/material";

// Simple Orders Dashboard: Orders table and Order Items table
export default function OrdersDashboard() {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/.netlify/functions/get-orders");
        const data = await res.json();
        setOrders(data.orders || []);
        setOrderItems(data.order_items || []);
      } catch (err) {
        setError("Failed to load orders.");
      }
      setLoading(false);
    }
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    setLoading(true);
    try {
      await fetch("/.netlify/functions/update-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus })
      });
      setOrders(orders => orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch {
      setError("Failed to update status.");
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Orders Dashboard</Typography>
      {error && <Typography color="error">{error}</Typography>}
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map(order => (
              <TableRow key={order.id} selected={order.id === selectedOrderId}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.customer_name || order.customer_email}</TableCell>
                <TableCell>
                  <Select
                    value={order.status || ""}
                    onChange={e => handleStatusChange(order.id, e.target.value)}
                    size="small"
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="processing">Processing</MenuItem>
                    <MenuItem value="shipped">Shipped</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>${order.total}</TableCell>
                <TableCell>{order.created_at}</TableCell>
                <TableCell>
                  <Button variant="outlined" size="small" onClick={() => setSelectedOrderId(order.id)}>View Items</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {selectedOrderId && (
        <Box>
          <Typography variant="h6" gutterBottom>Order Items for Order #{selectedOrderId}</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item ID</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Unit Price</TableCell>
                  <TableCell>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderItems.filter(item => item.order_id === selectedOrderId).map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.product_name || item.product_id}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>${item.unit_price}</TableCell>
                    <TableCell>${item.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}
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

