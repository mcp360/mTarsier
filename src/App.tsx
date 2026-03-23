import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Config from "./pages/Config";
import Marketplace from "./pages/Marketplace";
import AuditLogs from "./pages/AuditLogs";
import Skills from "./pages/Skills";
import Settings from "./pages/Settings";
import About from "./pages/About";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/config" element={<Config />} />
          <Route path="/audit" element={<AuditLogs />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
