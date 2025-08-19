import React from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import Navbar from "../components/Navbar";

export default function NotFound() {
  return (
    <div className="flex justify-between items-between flex-col min-h-screen bg-gray-100">

        <Navbar/>
    <div className="flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-9xl font-bold text-gray-800">404</h1>
      <h2 className="text-2xl font-semibold mt-4 text-gray-700">Page Not Found</h2>
      <p className="text-gray-500 mt-2 max-w-md">
        Oops! The page you’re looking for doesn’t exist or has been moved.
      </p>

      <Link to="/" className="mt-6">
        <button className="flex items-center gap-2 px-6 py-2 rounded-2xl shadow-md">
          <Home className="w-5 h-5" />
          Go Back Home
        </button>
      </Link>
    </div>
    <div>1</div>
    </div>
  );
}
