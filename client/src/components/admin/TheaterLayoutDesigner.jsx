import React, { useState, useCallback } from 'react';
import { Plus, Minus, Download, Upload, RotateCcw, Save } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const CELL_TYPES = {
  restricted: { color: 'bg-red-500', label: 'Restricted', icon: '🚫' },
  path: { color: 'bg-yellow-200', label: 'Path', icon: '🚶' },
  seat: { color: 'bg-green-500', label: 'Seat', icon: '💺' },
  door: { color: 'bg-blue-500', label: 'Door', icon: '🚪' },
  screen: { color: 'bg-purple-500', label: 'Screen', icon: '📺' }
};

const TheaterLayoutDesigner = ({ editData = null, theatres = [], onSuccess = () => {} }) => {
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(12);
  const [selectedTool, setSelectedTool] = useState('seat');
  const [grid, setGrid] = useState({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [layoutData, setLayoutData] = useState([]);
  const [name, setName] = useState('Screen 1'); // Default screen name
  const [selectedTheatre, setSelectedTheatre] = useState(''); // Theatre selection
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state

  // Initialize form data when editData changes
  React.useEffect(() => {
    if (editData) {
      setName(editData.name || 'Screen 1');
      setSelectedTheatre(editData.theatre_id || '');
      
      // Load existing layout if available
      if (editData.layout) {
        try {
          const layoutArray = typeof editData.layout === 'string' 
            ? JSON.parse(editData.layout) 
            : editData.layout;
          
          if (Array.isArray(layoutArray)) {
            const gridData = {};
            let originalRows = null;
            let originalCols = null;
            
            // Check for metadata entry
            const metadataEntry = layoutArray.find(cell => cell.type === 'metadata');
            if (metadataEntry && metadataEntry.metadata) {
              originalRows = metadataEntry.metadata.originalRows;
              originalCols = metadataEntry.metadata.originalCols;
            }
            
            layoutArray.forEach(cell => {
              // Skip metadata entries
              if (cell.type === 'metadata') return;
              
              // Convert from 1-indexed (backend) to 0-indexed (frontend)
              const row = cell.row - 1;
              const col = cell.col - 1;
              const key = `${row}-${col}`;
              gridData[key] = {
                type: cell.type,
                label: cell.label || generateLabel(row, col, cell.type)
              };
            });
            
            setGrid(gridData);
            
            // Use original dimensions if available, otherwise fallback to detection
            if (originalRows && originalCols) {
              setRows(originalRows);
              setCols(originalCols);
            } else {
              // Fallback: Auto-detect minimum grid size needed for layout
              const nonMetadataCells = layoutArray.filter(cell => cell.type !== 'metadata');
              if (nonMetadataCells.length > 0) {
                const maxRow = Math.max(...nonMetadataCells.map(cell => cell.row));
                const maxCol = Math.max(...nonMetadataCells.map(cell => cell.col));
                
                // Grid size is the maximum coordinate (1-indexed from backend)
                // Ensure we have at least the minimum default size
                setRows(Math.max(maxRow, 8));
                setCols(Math.max(maxCol, 12));
              } else {
                // No layout data, use defaults
                setRows(8);
                setCols(12);
              }
            }
          }
        } catch (error) {
          console.error('Error parsing layout data:', error);
          toast.error('Error loading existing layout');
        }
      }
    } else {
      // Reset form for new screen
      setName('Screen 1');
      setSelectedTheatre('');
      setGrid({});
      setRows(8);
      setCols(12);
    }
  }, [editData]);
  // Generate Excel-style labels (A1, A2, B1, B2, etc.)
  const generateLabel = (row, col, type) => {
    if (type === 'seat') {
      const rowLetter = String.fromCharCode(65 + row); // A, B, C, etc.
      return `${rowLetter}${col + 1}`;
    }
    return `${type.toUpperCase()}-${row}-${col}`;
  };

  // Handle cell click/drag
  const handleCellInteraction = useCallback((row, col) => {
    const key = `${row}-${col}`;
    const newGrid = { ...grid };
    
    if (selectedTool === 'restricted') {
      // If already restricted, remove it (toggle behavior)
      if (grid[key]?.type === 'restricted') {
        delete newGrid[key];
      } else {
        newGrid[key] = {
          type: 'restricted',
          label: generateLabel(row, col, 'restricted')
        };
      }
    } else {
      newGrid[key] = {
        type: selectedTool,
        label: generateLabel(row, col, selectedTool)
      };
    }
    
    setGrid(newGrid);
  }, [grid, selectedTool]);

  // Mouse events for drawing
  const handleMouseDown = (row, col) => {
    setIsDrawing(true);
    handleCellInteraction(row, col);
  };

  const handleMouseEnter = (row, col) => {
    if (isDrawing) {
      handleCellInteraction(row, col);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // Generate layout data for backend
  const generateLayoutData = () => {
    const data = [];
    
    // First, add metadata about grid dimensions
    data.push({
      col: 0, // Special marker for metadata
      row: 0, // Special marker for metadata
      type: 'metadata',
      label: `${rows}x${cols}`, // Store original grid dimensions
      metadata: {
        originalRows: rows,
        originalCols: cols
      }
    });
    
    // Add all grid cells
    Object.entries(grid).forEach(([key, value]) => {
      const [row, col] = key.split('-').map(Number);
      data.push({
        col: col + 1, // 1-indexed for backend
        row: row + 1, // 1-indexed for backend
        type: value.type,
        label: value.label
      });
    });
    
    // Add all unmarked cells as restricted areas
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const key = `${row}-${col}`;
        if (!grid[key]) {
          data.push({
            col: col + 1,
            row: row + 1,
            type: 'restricted',
            label: generateLabel(row, col, 'restricted')
          });
        }
      }
    }
    
    setLayoutData(data);
    return data;
  };

  // // Export layout
  // const exportLayout = () => {
  //   const data = generateLayoutData();
  //   const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement('a');
  //   a.href = url;
  //   a.download = `theater-layout-${rows}x${cols}.json`;
  //   a.click();
  //   URL.revokeObjectURL(url);
  // };

  // Clear grid
  const clearGrid = () => {
    setGrid({});
    setLayoutData([]);
  };

  // Update grid size
  const updateRows = (delta) => {
    const newRows = Math.max(1, Math.min(26, rows + delta)); // Max 26 rows (A-Z)
    setRows(newRows);
    // Clean up grid if reducing size
    if (delta < 0) {
      const newGrid = {};
      Object.entries(grid).forEach(([key, value]) => {
        const [row, col] = key.split('-').map(Number);
        if (row < newRows && col < cols) {
          newGrid[key] = value;
        }
      });
      setGrid(newGrid);
    }
  };

  const updateCols = (delta) => {
    const newCols = Math.max(1, Math.min(50, cols + delta)); // Max 50 columns
    setCols(newCols);
    // Clean up grid if reducing size
    if (delta < 0) {
      const newGrid = {};
      Object.entries(grid).forEach(([key, value]) => {
        const [row, col] = key.split('-').map(Number);
        if (row < rows && col < newCols) {
          newGrid[key] = value;
        }
      });
      setGrid(newGrid);
    }
  };

  // Get cell display
  const getCellDisplay = (row, col) => {
    const key = `${row}-${col}`;
    const cell = grid[key];
    
    if (!cell) {
      return { 
        className: 'bg-red-100 border-red-300 text-red-600', 
        content: '🚫' 
      };
    }
    
    const type = CELL_TYPES[cell.type];
    return {
      className: `${type.color} ${cell.type === 'path' ? 'text-gray-800' : 'text-white'}`,
      content: cell.type === 'seat' ? cell.label : type.icon
    };
  };

  // Auto-generate seat layout
  const autoGenerateSeats = () => {
    const newGrid = {};
    
    // Add screen at top center
    const screenStart = Math.floor(cols / 3);
    const screenEnd = Math.floor((2 * cols) / 3);
    for (let col = screenStart; col <= screenEnd; col++) {
      const key = `0-${col}`;
      newGrid[key] = {
        type: 'screen',
        label: generateLabel(0, col, 'screen')
      };
    }
    
    // Leave first and last rows mostly as paths (for aisles)
    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        // Create center aisle
        if (col === Math.floor(cols / 2)) {
          newGrid[`${row}-${col}`] = {
            type: 'path',
            label: generateLabel(row, col, 'path')
          };
          continue;
        }
        
        const key = `${row}-${col}`;
        newGrid[key] = {
          type: 'seat',
          label: generateLabel(row, col, 'seat')
        };
      }
    }
    
    // Add path at back for walking
    for (let col = 0; col < cols; col++) {
      newGrid[`${rows - 1}-${col}`] = {
        type: 'path',
        label: generateLabel(rows - 1, col, 'path')
      };
    }
    
    // Add doors at back corners
    newGrid[`${rows - 1}-0`] = { type: 'door', label: 'DOOR-L' };
    newGrid[`${rows - 1}-${cols - 1}`] = { type: 'door', label: 'DOOR-R' };
    
    setGrid(newGrid);
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedTheatre) {
      toast.error("Please select a theatre");
      return;
    }
    
    if (!name.trim()) {
      toast.error("Please enter a screen name");
      return;
    }

    // Generate layout data
    const layout = generateLayoutData();
    const total_seats = layout.filter(cell => cell.type === 'seat').length;

    if (total_seats === 0) {
      toast.error("Please add at least one seat to the layout");
      return;
    }

    setIsSubmitting(true);

    try {
      let response;
      const requestData = {
        name,
        total_seats,
        layout: JSON.stringify(layout)
      };

      if (editData && editData.id) {
        // Update existing screen
        const URL = `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/screen/${editData.id}`;
        response = await axios.patch(URL, requestData, { withCredentials: true });
      } else {
        // Create new screen
        const URL = `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/theatre/${selectedTheatre}/screens`;
        response = await axios.post(URL, requestData, { withCredentials: true });
      }

      if (response.data.status === "success") {
        toast.success(editData ? "Screen layout updated successfully!" : "Screen layout created successfully!");
        onSuccess(); // Call the success callback
      } else {
        toast.error(response.data.message || "Failed to save screen layout");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error saving screen layout");
      console.error("Error saving screen:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-6">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                  {editData ? 'Edit Screen Layout' : 'Create Screen Layout'}
                </h1>
                <p className="text-gray-600">Design your theater seating arrangement with our interactive tool</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                {/* Theatre Selection */}
                <div className="min-w-[250px]">
                  <label htmlFor="theatreSelect" className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Theatre *
                  </label>
                  <select
                    id="theatreSelect"
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors bg-white"
                    value={selectedTheatre}
                    onChange={e => setSelectedTheatre(e.target.value)}
                    required
                    disabled={editData && editData.id} // Disable if editing
                  >
                    <option value="">Choose a theatre...</option>
                    {theatres.map(theatre => (
                      <option key={theatre.id} value={theatre.id}>
                        {theatre.name} - {theatre.city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Screen Name */}
                <div className="min-w-[200px]">
                  <label htmlFor="screenName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Screen Name *
                  </label>
                  <input
                    id="screenName"
                    type="text"
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter screen name"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">How to use:</h3>
                <p className="text-sm text-blue-700">
                  First select a theatre and enter a screen name. Then choose a tool from the panel below and click/drag on the grid to design your layout. 
                  Seats are automatically labeled (A1, A2, B1, etc.). Unmarked cells become restricted areas.
                </p>
              </div>
            </div>
          </div>
          {/* Controls Section */}
          <div className="grid lg:grid-cols-5 gap-6 mb-8">
            {/* Grid Size Controls */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 p-6 rounded-xl">
              <h3 className="font-bold text-gray-800 mb-4 text-center">Grid Dimensions</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Rows:</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateRows(-1)} 
                      className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center font-bold text-lg text-gray-800">{rows}</span>
                    <button 
                      onClick={() => updateRows(1)} 
                      className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Cols:</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateCols(-1)} 
                      className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center font-bold text-lg text-gray-800">{cols}</span>
                    <button 
                      onClick={() => updateCols(1)} 
                      className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawing Tools */}
            <div className="lg:col-span-2 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 p-6 rounded-xl">
              <h3 className="font-bold text-gray-800 mb-4 text-center">Drawing Tools</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(CELL_TYPES).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedTool(type)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                      selectedTool === type
                        ? `${config.color} text-white shadow-lg scale-105`
                        : 'bg-white border-2 border-gray-200 hover:border-purple-300 text-gray-700'
                    }`}
                  >
                    <div className="text-lg mb-1">{config.icon}</div>
                    <div className="text-xs">{config.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl">
              <h3 className="font-bold text-gray-800 mb-4 text-center">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={autoGenerateSeats}
                  className="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 transform hover:scale-105"
                >
                  Auto Layout
                </button>
                <button
                  onClick={clearGrid}
                  className="w-full p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} /> Clear Grid
                </button>
              </div>
            </div>

            {/* Layout Statistics */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6 rounded-xl">
              <h3 className="font-bold text-gray-800 mb-4 text-center">Layout Stats</h3>
              <div className="space-y-3">
                {Object.entries(CELL_TYPES).map(([type, config]) => {
                  const count = Object.values(grid).filter(cell => cell.type === type).length;
                  return (
                    <div key={type} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{config.icon}</span>
                        <span className="text-xs font-medium text-gray-600">{config.label}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-800">{count}</span>
                    </div>
                  );
                })}
                <div className="border-t border-green-200 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600">🚫 Empty (Restricted)</span>
                    <span className="text-sm font-bold text-gray-800">{rows * cols - Object.keys(grid).length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>



          {/* Theater Grid */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl shadow-2xl">
            <div className="mb-4 text-center">
              <div className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg font-bold">
                📺 SCREEN
              </div>
              <div className="text-gray-400 text-sm mt-2">Front of Theater</div>
            </div>
            
            <div className="bg-gray-100 p-4 rounded-lg overflow-auto">
              <div 
                className="inline-grid gap-1" 
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(45px, 1fr))` }}
                onMouseLeave={() => setIsDrawing(false)}
              >
                {Array.from({ length: rows }, (_, row) =>
                  Array.from({ length: cols }, (_, col) => {
                    const cellDisplay = getCellDisplay(row, col);
                    return (
                      <div
                        key={`${row}-${col}`}
                        className={`
                          w-11 h-11 border-2 border-gray-300 rounded-lg cursor-pointer
                          flex items-center justify-center text-xs font-bold
                          transition-all duration-200 hover:scale-110 hover:shadow-lg select-none
                          ${cellDisplay.className}
                        `}
                        onMouseDown={() => handleMouseDown(row, col)}
                        onMouseEnter={() => handleMouseEnter(row, col)}
                        onMouseUp={handleMouseUp}
                        title={`Row ${String.fromCharCode(65 + row)}, Col ${col + 1}`}
                      >
                        {cellDisplay.content}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            {/* Grid Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span>Empty/Restricted</span>
              </div>
              {Object.entries(CELL_TYPES).map(([type, config]) => (
                <div key={type} className="flex items-center gap-2 text-gray-300">
                  <div className={`w-4 h-4 ${config.color} rounded border border-gray-400`}></div>
                  <span>{config.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Section */}
          <div className="mt-8 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-800">Ready to Save?</h3>
                <p className="text-sm text-gray-600">
                  {editData ? 'Update your screen layout with the changes' : 'Create your new screen layout'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => generateLayoutData()}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  <Download size={18} /> Preview Data
                </button>
                {editData && (
                  <button
                    onClick={clearGrid}
                    className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <RotateCcw size={18} /> Reset Layout
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 transform ${
                    isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 hover:scale-105'
                  } text-white`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {editData ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save size={18} /> 
                      {editData ? 'Update Layout' : 'Create Layout'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Data Preview */}
          {layoutData.length > 0 && (
            <div className="mt-6 bg-gray-900 rounded-xl p-6">
              <h3 className="font-semibold mb-4 text-green-400">Generated Layout Data ({layoutData.length} items)</h3>
              <div className="bg-black text-green-400 p-4 rounded-lg overflow-auto max-h-60 font-mono text-sm">
                <pre>{JSON.stringify(layoutData, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TheaterLayoutDesigner;