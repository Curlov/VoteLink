import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CreatePollPage } from "./pages/CreatePollPage";
import { VotePage } from "./pages/VotePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreatePollPage />} />
        <Route path="/p/:publicId" element={<VotePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
