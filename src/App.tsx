import { useEffect } from "react";
import { AppRouter } from "./app/router/AppRouter";
import { useAuthStore } from "./entities/user/model/authStore";

function App() {
  const initFromStorage = useAuthStore((s) => s.initFromStorage);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return <AppRouter />;
}

export default App;
