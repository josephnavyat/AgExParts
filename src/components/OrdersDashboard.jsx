import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { DataGrid } from "@mui/x-data-grid";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Orders will be fetched from backend

const columns = [
  { field: "id", headerName: "Order ID", width: 100 },
  { field: "customer_name", headerName: "Customer", width: 180 },
  { field: "status", headerName: "Status", width: 120 },
  { field: "created_at", headerName: "Date", width: 160 },
  {
    field: "grand_total",
    headerName: "Total",
    width: 120,
    valueFormatter: ({ value }) => {
      const num = typeof value === "number" ? value : parseFloat(value);
      return `$${!isNaN(num) ? num.toFixed(2) : "0.00"}`;
    },
  },
];

function OrderItemsAccordion({ items, expanded = true }) {
  return (
    <Accordion expanded={expanded}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Order Items</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {items.map((item, idx) => (
          <Box key={idx} sx={{ mb: 1 }}>
            <Typography variant="body2">
              {item.qty} x {item.name} @ {item.price}
            </Typography>
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}

const STATUS_COLORS = ["#1976d2", "#388e3c", "#fbc02d", "#d32f2f", "#7b1fa2", "#0288d1"];

export default function OrdersDashboard() {
  const [orders, setOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const res = await fetch("/.netlify/functions/get-orders");
        if (!res.ok) throw new Error("Failed to fetch orders");
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  // Prepare chart data
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(statusCounts).map(([status, count], idx) => ({
    name: status || "Unknown",
    value: count,
    color: STATUS_COLORS[idx % STATUS_COLORS.length]
  }));

  // Filtered orders for table
  const filteredOrders = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;

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
          <OrderItemsAccordion key={order.id} items={order.items || []} expanded={true} />
        ) : null
      )}
    </Box>
  );
}
