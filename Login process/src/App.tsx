import * as React from "react";
import { LoginPage } from "./components/LoginPage";

export default function App() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-zinc-900 selection:bg-zinc-100 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-100/40 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-5%] w-[30%] h-[50%] rounded-full bg-blue-50/50 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[10%] w-[40%] h-[40%] rounded-full bg-cyan-50/50 blur-[100px] pointer-events-none" />
      
      {/* Subtle Dot Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

      <LoginPage onLogin={() => {}} />
    </div>
  );
}
