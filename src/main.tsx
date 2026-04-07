import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./app/providers/AppErrorBoundary";
import { AppQueryProvider } from "./app/providers/QueryProvider";
import { startUserActivityTracking } from "./shared/lib/activityTracker";
import "./app/styles/index.css";

startUserActivityTracking();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AppQueryProvider>
        <App />
      </AppQueryProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
