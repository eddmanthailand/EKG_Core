"use client";

import dynamic from 'next/dynamic';

const PixelAgentsStandalone = dynamic(() => import('@/components/pixel-agents/StandaloneWrapper'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-screen bg-black text-green-500 font-mono">
      Initializing EKG M.A.T.R.I.X. Interface...
    </div>
  ),
});

export default function AgentsPage() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <PixelAgentsStandalone />
    </div>
  );
}
