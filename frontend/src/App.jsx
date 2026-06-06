import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CreatePollPage } from "./pages/CreatePollPage";
import { VotePage } from "./pages/VotePage";
import { AdminPollPage } from "./pages/AdminPollPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreatePollPage />} />
        <Route path="/p/:publicId" element={<VotePage />} />
        <Route path="/admin/:adminToken" element={<AdminPollPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
