import React, { useEffect, useState } from "react";
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
  { field: "created_at", headerName: "Date", width: 160 },
  { field: "grand_total", headerName: "Total", width: 120, valueFormatter: ({ value }) => `$${value}` },
];

function OrderItemsAccordion({ items }) {
  return (
    <Accordion>
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

export default function OrdersDashboard() {
  const [orders, setOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Orders
      </Typography>
      {error && <Typography color="error">{error}</Typography>}
      <Paper sx={{ height: 400, mb: 3 }}>
        <DataGrid
          rows={orders}
          columns={columns}
          pageSize={5}
          loading={loading}
          getRowId={(row) => row.id}
          onRowClick={(params) => setExpandedOrder(params.row.id)}
        />
      </Paper>
      {orders.map((order) =>
        expandedOrder === order.id ? (
          <OrderItemsAccordion key={order.id} items={order.items || []} />
        ) : null
      )}
    </Box>
  );
}
