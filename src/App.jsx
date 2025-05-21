import React from "react";
import Translator from "./components/Translator";
import { Link, Route, Routes } from "react-router-dom";
import PrivacyPolicy from "./pages/PrivacyPolicy";

export const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Translator />}/>
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Routes>

      <footer className="p-4 bg-zinc-800 text-center text-yellow-400">
        <Link to="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
};
