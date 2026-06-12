import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { CreatePollPage } from "./pages/CreatePollPage";
import { ProCreatePage } from "./pages/ProCreatePage";
import { VotePage } from "./pages/VotePage";
import { AdminPollPage } from "./pages/AdminPollPage";
import { ActivatePollPage } from "./pages/ActivatePollPage";
import { OperatorAdminPage } from "./pages/OperatorAdminPage";
import { EmbedPollPage } from "./pages/EmbedPollPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreatePollPage />} />
        <Route path="/create/pro" element={<ProCreatePage />} />
        <Route path="/p/:publicId" element={<VotePage />} />
        <Route path="/poll/:publicId" element={<VotePage />} />
        <Route path="/embed/:publicId" element={<EmbedPollPage />} />
        <Route path="/activate/:activationToken" element={<ActivatePollPage />} />
        <Route path="/admin/:adminToken" element={<AdminPollPage />} />
        <Route path="/operator-admin" element={<OperatorAdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
