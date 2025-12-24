
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Upload, 
  Layers, 
  Maximize2, 
  Minimize2, 
  Terminal, 
  Settings, 
  Info,
  Code2,
  Mountain,
  Building2
} from 'lucide-react';
import { AppState, AppMode, Point, FittingResult } from './types';
import { getEdges, segmentEdges } from './services/imageProcessor';
import { fitPolynomial, simplifyPoints } from './services/mathFitting';

// Helper components
const ControlGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-6">
    <label className="text-xs uppercase tracking-widest text-zinc-500 mb-2 block font-bold">{label}</label>
    {children}
  </div>
);

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    rationalIntensity: 5,
    fieldOpacity: 0.4,
    mode: AppMode.NATURAL,
    isScanning: false,
    imageLoaded: false,
    edgeDensity: 30,
  });

  const [fittingResults, setFittingResults] = useState<FittingResult[]>([]);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process image when settings change or image loads
  const processImage = useCallback(() => {
    if (!originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw image with opacity
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = state.fieldOpacity;
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;

    // 2. Draw Grid
    const gridSize = 40;
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // 3. Extract and Segment Edges
    const edges = getEdges(canvas, state.edgeDensity);
    const segmentedPaths = segmentEdges(edges, state.mode === AppMode.ARCHITECTURAL ? 5 : 15);
    
    // Pick N longest paths to fit
    const topPaths = segmentedPaths
      .sort((a, b) => b.length - a.length)
      .slice(0, 5);

    const results: FittingResult[] = topPaths.map(path => {
      const simplified = simplifyPoints(path, state.mode === AppMode.ARCHITECTURAL ? 2 : 10);
      return fitPolynomial(simplified, state.rationalIntensity, canvas.width, canvas.height);
    });

    setFittingResults(results);

    // 4. Draw Edges and Fitted Curves
    results.forEach((res, i) => {
      const color = i === 0 ? '#ff3e3e' : '#00f2ff';
      
      // Draw detected line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      res.points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Draw fitted curve
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.beginPath();
      res.points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw coefficients/formula near start
      if (res.points.length > 0) {
        ctx.fillStyle = color;
        ctx.font = '10px "JetBrains Mono"';
        ctx.fillText(res.formula, res.points[0].x, res.points[0].y - 10);
      }
    });

  }, [originalImage, state]);

  useEffect(() => {
    if (originalImage) {
      processImage();
    }
  }, [originalImage, state, processImage]);

  // Handle Image Upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setState(prev => ({ ...prev, imageLoaded: true, isScanning: true }));
        setScanProgress(0);
        
        // Resize canvas to match image aspect ratio
        if (canvasRef.current) {
          const container = canvasRef.current.parentElement;
          if (container) {
            const maxWidth = container.clientWidth;
            const maxHeight = container.clientHeight;
            const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
            canvasRef.current.width = img.width * ratio;
            canvasRef.current.height = img.height * ratio;
          }
        }

        // Start scanning animation
        let prog = 0;
        const interval = setInterval(() => {
          prog += 2;
          setScanProgress(prog);
          if (prog >= 100) {
            clearInterval(interval);
            setState(prev => ({ ...prev, isScanning: false }));
          }
        }, 30);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0a] text-zinc-300 overflow-hidden font-sans">
      
      {/* Sidebar: Parameter Control */}
      <aside className="w-80 h-full border-r border-zinc-800 flex flex-col p-6 bg-[#0c0c0c] z-20 shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-cyan-500/20 p-2 rounded">
            <Activity className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest text-white uppercase leading-tight">Code of Eyes</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Algorithmic Re-vision of Nature</p>
          </div>
        </div>

        <div className="flex-1 space-y-8">
          <ControlGroup label="Rational Intensity">
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="1" 
                max="12" 
                step="1"
                value={state.rationalIntensity}
                onChange={(e) => setState(prev => ({ ...prev, rationalIntensity: parseInt(e.target.value) }))}
                className="w-full accent-cyan-500"
              />
              <span className="mono text-xs w-8 text-cyan-400">{state.rationalIntensity}</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 italic">Controls the polynomial degree of regression curves.</p>
          </ControlGroup>

          <ControlGroup label="Field Opacity">
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={state.fieldOpacity}
                onChange={(e) => setState(prev => ({ ...prev, fieldOpacity: parseFloat(e.target.value) }))}
                className="w-full accent-cyan-500"
              />
              <span className="mono text-xs w-8 text-cyan-400">{Math.round(state.fieldOpacity * 100)}%</span>
            </div>
          </ControlGroup>

          <ControlGroup label="Structural Mode">
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setState(prev => ({ ...prev, mode: AppMode.NATURAL }))}
                className={`flex items-center justify-center gap-2 p-3 rounded border text-xs transition-all ${state.mode === AppMode.NATURAL ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'}`}
              >
                <Mountain className="w-4 h-4" />
                Nature
              </button>
              <button 
                onClick={() => setState(prev => ({ ...prev, mode: AppMode.ARCHITECTURAL }))}
                className={`flex items-center justify-center gap-2 p-3 rounded border text-xs transition-all ${state.mode === AppMode.ARCHITECTURAL ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'}`}
              >
                <Building2 className="w-4 h-4" />
                Structure
              </button>
            </div>
          </ControlGroup>

          <ControlGroup label="Edge Sensitivity">
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="10" 
                max="150" 
                step="5"
                value={state.edgeDensity}
                onChange={(e) => setState(prev => ({ ...prev, edgeDensity: parseInt(e.target.value) }))}
                className="w-full accent-red-500"
              />
              <span className="mono text-xs w-8 text-red-400">{state.edgeDensity}</span>
            </div>
          </ControlGroup>
        </div>

        <div className="mt-auto pt-6 border-t border-zinc-800 space-y-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-white text-black py-3 rounded-sm font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Ingest Image
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
            accept="image/*" 
          />
          
          <div className="p-3 bg-zinc-900 rounded-sm border border-zinc-800 flex gap-3">
             <Terminal className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
             <div className="mono text-[9px] text-zinc-500 leading-normal">
                SYSTEM_LOG: <span className="text-zinc-400">v0.8.4_beta</span><br/>
                STATUS: {state.imageLoaded ? 'FIELD_ACTIVE' : 'READY'}<br/>
                KERNEL: DOUGLAS_PEUCKER_REDUX
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col bg-black">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-500" />
              <span className="text-[10px] mono text-zinc-400 uppercase">Coord: {state.mode}</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-500" />
              <span className="text-[10px] mono text-zinc-400 uppercase">Fits: {fittingResults.length} Paths</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex -space-x-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-5 h-5 rounded-full border border-black bg-zinc-800 overflow-hidden">
                  <img src={`https://picsum.photos/20/20?sig=${i}`} alt="user" />
                </div>
              ))}
            </div>
            <div className="h-4 w-[1px] bg-zinc-800"></div>
            <Settings className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer transition-colors" />
            <Info className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer transition-colors" />
          </div>
        </header>

        {/* Viewer Area */}
        <div className="flex-1 relative overflow-hidden p-12 flex items-center justify-center">
          {!state.imageLoaded && (
            <div className="text-center space-y-6">
              <div className="w-32 h-32 border border-dashed border-zinc-700 rounded-full mx-auto flex items-center justify-center animate-pulse">
                <Upload className="w-8 h-8 text-zinc-700" />
              </div>
              <div>
                <h2 className="text-zinc-400 text-sm font-medium">No Visual Input Detected</h2>
                <p className="text-zinc-600 text-[10px] mt-1 max-w-xs mx-auto">Upload a landscape or architectural photo to initialize structural deconstruction.</p>
              </div>
            </div>
          )}

          {state.imageLoaded && (
            <div className="relative shadow-2xl shadow-cyan-900/10 border border-zinc-800">
              <canvas 
                ref={canvasRef} 
                className="max-w-full max-h-full block"
              />
              
              {/* Scanning Line Overlay */}
              {state.isScanning && (
                <div 
                  className="absolute left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] z-30 transition-all duration-30"
                  style={{ top: `${scanProgress}%` }}
                />
              )}
              
              {/* Data Overlays */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
                 <div className="mono text-[8px] bg-black/80 p-1 border border-cyan-500/30 text-cyan-400 flex gap-2">
                    <span className="opacity-50">[SAMANTHA_LEE_MODULE]</span>
                    <span>RESOLUTION_OPTIMIZED</span>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Data Panel */}
        <footer className="h-32 border-t border-zinc-800 bg-[#0c0c0c] flex overflow-x-auto p-4 gap-4 z-10">
          {fittingResults.length > 0 ? (
            fittingResults.map((res, i) => (
              <div key={i} className="min-w-[280px] p-3 border border-zinc-800 bg-black/40 rounded flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[9px] mono px-1.5 py-0.5 rounded ${i === 0 ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    PATH_{i+1}
                  </span>
                  <span className="text-[9px] mono text-zinc-600">CONF_0.{Math.floor(Math.random() * 20) + 75}</span>
                </div>
                <div className="mono text-[11px] text-zinc-300 break-all mb-2 leading-relaxed">
                  {res.formula}
                </div>
                <div className="mt-auto flex gap-1">
                   {res.coefficients.map((c, idx) => (
                     <div key={idx} className="h-1 bg-zinc-800 flex-1 relative overflow-hidden rounded-full">
                       <div className="absolute inset-0 bg-cyan-500 opacity-50" style={{ width: `${Math.abs(c) * 100}%` }}></div>
                     </div>
                   ))}
                </div>
              </div>
            ))
          ) : (
            <div className="w-full flex items-center justify-center text-[10px] mono text-zinc-600 uppercase tracking-widest">
              Waiting for data stream...
            </div>
          )}
        </footer>
      </main>
    </div>
  );
};

export default App;
