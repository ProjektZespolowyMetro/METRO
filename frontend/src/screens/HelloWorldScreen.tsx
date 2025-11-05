import React, { useEffect, useState } from "react";

const HelloWorldScreen: React.FC = () => {
  const [message, setMessage] = useState<string>("Loading...");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/hello-world/")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then((data) => setMessage(data))
      .catch((error) => {
        console.error("Error fetching message:", error);
        setMessage("Error loading message");
      });
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>{message}</h1>
    </div>
  );
};

export default HelloWorldScreen;