import React, { useEffect, useState } from "react";

export default function SuccessPage() {
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (count === 0) {
      window.location.href = "/";
    } else {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h2 style={{ color: "#19a974", fontWeight: 700, fontSize: "2rem" }}>Payment Succeeded.</h2>
      <p style={{ fontSize: "1.2rem", marginTop: "1.5rem" }}>
        Redirecting to home in <span style={{ fontWeight: 700 }}>{count}</span> seconds...
      </p>
    </div>
  );
}
