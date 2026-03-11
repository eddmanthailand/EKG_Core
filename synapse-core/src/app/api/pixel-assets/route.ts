import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { PNG } from 'pngjs';

const CHAR_COUNT = 6;
const CHAR_FRAME_W = 16;
const CHAR_FRAME_H = 32;
const CHAR_FRAMES_PER_ROW = 7;
const CHARACTER_DIRECTIONS = ['down', 'up', 'right'];
const FLOOR_PATTERN_COUNT = 7;
const FLOOR_TILE_SIZE = 16;
const WALL_BITMASK_COUNT = 16;
const WALL_GRID_COLS = 4;
const WALL_PIECE_WIDTH = 16;
const WALL_PIECE_HEIGHT = 32;
const PNG_ALPHA_THRESHOLD = 50;

function pngToSpriteData(pngBuffer: Buffer, width: number, height: number): string[][] {
  const png = PNG.sync.read(pngBuffer);
  const sprite: string[][] = [];
  const data = png.data;

  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * png.width + x) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const a = data[pixelIndex + 3];

      if (a < PNG_ALPHA_THRESHOLD) {
        row.push('');
      } else {
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
        row.push(hex);
      }
    }
    sprite.push(row);
  }
  return sprite;
}

export async function GET() {
  const assetsDir = path.join(process.cwd(), 'public', 'pixel-agents-public', 'assets');
  let characters: any[] = [];
  let floorTiles: any[] = [];
  let wallTiles: any[] = [];
  
  try {
    // 1. Load Characters
    const charDir = path.join(assetsDir, 'characters');
    
    // Provide a fallback if directory does not exist or has errors
    if (fs.existsSync(charDir)) {
      for (let ci = 0; ci < CHAR_COUNT; ci++) {
        const filePath = path.join(charDir, `char_${ci}.png`);
        if (!fs.existsSync(filePath)) continue;

        const pngBuffer = fs.readFileSync(filePath);
        const png = PNG.sync.read(pngBuffer);
        const charData: any = { down: [], up: [], right: [] };

        for (let dirIdx = 0; dirIdx < CHARACTER_DIRECTIONS.length; dirIdx++) {
          const dir = CHARACTER_DIRECTIONS[dirIdx];
          const rowOffsetY = dirIdx * CHAR_FRAME_H;
          const frames: string[][][] = [];

          for (let f = 0; f < CHAR_FRAMES_PER_ROW; f++) {
            const sprite: string[][] = [];
            const frameOffsetX = f * CHAR_FRAME_W;
            for (let y = 0; y < CHAR_FRAME_H; y++) {
              const row: string[] = [];
              for (let x = 0; x < CHAR_FRAME_W; x++) {
                const idx = ((rowOffsetY + y) * png.width + (frameOffsetX + x)) * 4;
                const r = png.data[idx];
                const g = png.data[idx + 1];
                const b = png.data[idx + 2];
                const a = png.data[idx + 3];
                if (a < PNG_ALPHA_THRESHOLD) row.push('');
                else row.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase());
              }
              sprite.push(row);
            }
            frames.push(sprite);
          }
          charData[dir] = frames;
        }
        characters.push(charData);
      }
    }
    
    // 2. Load Walls (walls.png)
    const wallPath = path.join(assetsDir, 'walls.png');
    if (fs.existsSync(wallPath)) {
      const pngBuffer = fs.readFileSync(wallPath);
      const png = PNG.sync.read(pngBuffer);

      for (let mask = 0; mask < WALL_BITMASK_COUNT; mask++) {
        const ox = (mask % WALL_GRID_COLS) * WALL_PIECE_WIDTH;
        const oy = Math.floor(mask / WALL_GRID_COLS) * WALL_PIECE_HEIGHT;
        const sprite: string[][] = [];
        for (let r = 0; r < WALL_PIECE_HEIGHT; r++) {
          const row: string[] = [];
          for (let c = 0; c < WALL_PIECE_WIDTH; c++) {
            const idx = ((oy + r) * png.width + (ox + c)) * 4;
            const rv = png.data[idx];
            const gv = png.data[idx + 1];
            const bv = png.data[idx + 2];
            const av = png.data[idx + 3];
            if (av < PNG_ALPHA_THRESHOLD) row.push('');
            else row.push(`#${rv.toString(16).padStart(2, '0')}${gv.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`.toUpperCase());
          }
          sprite.push(row);
        }
        wallTiles.push(sprite);
      }
    }

    // 3. Load Floors - The repo might not have floors.png downloaded, provide an empty array if not present to avoid crash.
    const floorPath = path.join(assetsDir, 'floors.png');
    if (fs.existsSync(floorPath)) {
        const floorPngBuffer = fs.readFileSync(floorPath);
        const floorPng = PNG.sync.read(floorPngBuffer);
        
        for (let t = 0; t < FLOOR_PATTERN_COUNT; t++) {
            const sprite: string[][] = [];
            for (let y = 0; y < FLOOR_TILE_SIZE; y++) {
                const row: string[] = [];
                for (let x = 0; x < FLOOR_TILE_SIZE; x++) {
                    const px = t * FLOOR_TILE_SIZE + x;
                    const idx = (y * floorPng.width + px) * 4;
                    const r = floorPng.data[idx];
                    const g = floorPng.data[idx + 1];
                    const b = floorPng.data[idx + 2];
                    const a = floorPng.data[idx + 3];
                    if (a < PNG_ALPHA_THRESHOLD) row.push('');
                    else row.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase());
                }
                sprite.push(row);
            }
            floorTiles.push(sprite);
        }
    } else {
        // Fallback for missing floors.png: Generate 7 dummy solid color floor tiles
        for (let t = 0; t < FLOOR_PATTERN_COUNT; t++) {
            const sprite: string[][] = [];
            for (let y = 0; y < FLOOR_TILE_SIZE; y++) {
                const row: string[] = [];
                for (let x = 0; x < FLOOR_TILE_SIZE; x++) {
                    // Slight variation
                    row.push(t === 0 ? '#333333' : '#444444');
                }
                sprite.push(row);
            }
            floorTiles.push(sprite);
        }
    }

    // Furniture assets are not part of the open source repo (as stated in their README),
    // So we will pass empty arrays for furniture catalog and sprites to prevent crashes
    const defaultFurnitureCatalog: any[] = [];
    const defaultFurnitureSprites: any = {};

    return NextResponse.json({
      characters,
      floorTiles,
      wallTiles,
      furniture: {
        catalog: defaultFurnitureCatalog,
        sprites: defaultFurnitureSprites
      }
    });

  } catch (error) {
    console.error("Asset extraction failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
