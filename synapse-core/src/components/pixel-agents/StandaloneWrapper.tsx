"use client";

import { useEffect, useState } from 'react';
import App from './App';
import { supabase } from '@/lib/supabase';

export default function PixelAgentsStandalone() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssets() {
      try {
        console.log("Fetching Pixel Agents Assets from Server...");
        const response = await fetch('/api/pixel-assets');
        if (!response.ok) {
          throw new Error('Failed to fetch assets');
        }
        const data = await response.json();

        console.log("Assets Loaded:", data);

        // Required load order exactly as originally defined by pixel-agents Extension
        
        // 1. Character Sprites
        window.dispatchEvent(new CustomEvent('vscode-message', {
          detail: { type: 'characterSpritesLoaded', characters: data.characters }
        }));

        // 2. Floor Tiles
        window.dispatchEvent(new CustomEvent('vscode-message', {
          detail: { type: 'floorTilesLoaded', sprites: data.floorTiles }
        }));

        // 3. Wall Tiles
        window.dispatchEvent(new CustomEvent('vscode-message', {
          detail: { type: 'wallTilesLoaded', sprites: data.wallTiles }
        }));

        // 4. Furniture Assets
        window.dispatchEvent(new CustomEvent('vscode-message', {
          detail: { type: 'furnitureAssetsLoaded', catalog: data.furniture.catalog, sprites: data.furniture.sprites }
        }));

        // 5. Layout Setup (Starting an empty layout for EKG Synapse)
        const emptyLayout = {
            version: 1,
            cols: 20,
            rows: 15,
            floor: [],
            camera: { x: 10, y: 7 },
            furniture: []
        };
        window.dispatchEvent(new CustomEvent('vscode-message', {
          detail: { type: 'layoutLoaded', layout: emptyLayout }
        }));

        // 6. Spawn Default EKG Operator Agent
        window.dispatchEvent(new CustomEvent('vscode-message', {
          detail: { type: 'agentCreated', id: 1, folderName: 'EKG Command AI' }
        }));

        setIsLoaded(true);

      } catch (err: any) {
        console.error("Error loading Pixel Agents assets:", err);
        setError(err.message || 'Unknown error');
      }
    }

    loadAssets();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Listen for live AI activities from Supabase
    const channel = supabase
      .channel('ekg_synapse_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'synapse_memory_logs' },
        (payload) => {
          console.log('Realtime AI Action:', payload);
          const row = payload.new as any;
          if (!row) return;

          if (payload.eventType === 'INSERT') {
            window.dispatchEvent(new CustomEvent('vscode-message', {
              detail: { type: 'agentToolStart', id: 1, toolId: row.id, status: row.action_type }
            }));
          } else if (payload.eventType === 'UPDATE') {
            if (row.status === 'completed' || row.status === 'failed') {
              window.dispatchEvent(new CustomEvent('vscode-message', {
                detail: { type: 'agentToolDone', id: 1, toolId: row.id }
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoaded]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-neutral-900 border border-red-500/30 text-red-500 font-mono text-sm p-4">
        Failed to load Matrix Assets: {error}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center w-full h-full animate-pulse text-cyan-500 font-mono">
        Downloading Matrix Textures...
      </div>
    );
  }

  // Once initialization messages are dispatched, render the main APP component
  return (
    <div className="w-full h-full bg-black relative">
       <div className="absolute top-4 left-4 z-50 pointer-events-none opacity-50">
          <h2 className="text-emerald-500 font-mono text-xs tracking-widest uppercase">EKG AI Visual Matrix LIVE</h2>
       </div>
       <App />
    </div>
  );
}
