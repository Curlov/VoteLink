import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CreatePollPage } from "./pages/CreatePollPage";
import { VotePage } from "./pages/VotePage";
import { AdminPollPage } from "./pages/AdminPollPage";
import { ActivatePollPage } from "./pages/ActivatePollPage";
import { OperatorAdminPage } from "./pages/OperatorAdminPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreatePollPage />} />
        <Route path="/p/:publicId" element={<VotePage />} />
        <Route path="/activate/:activationToken" element={<ActivatePollPage />} />
        <Route path="/admin/:adminToken" element={<AdminPollPage />} />
        <Route path="/operator-admin" element={<OperatorAdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
