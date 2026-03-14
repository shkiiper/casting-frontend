import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import { AppQueryProvider } from "./app/providers/QueryProvider";
import "./app/styles/index.css";


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppQueryProvider>
      <App />
    </AppQueryProvider>
  </React.StrictMode>
);
