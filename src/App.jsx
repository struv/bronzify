import { useState, useRef, useCallback } from 'react'
import './App.css'

// Bronze gradient presets
const GRADIENTS = {
  classic: [
    { pos: 0, color: [61, 43, 31] },      // Dark bronze
    { pos: 0.5, color: [205, 127, 50] },   // Classic bronze
    { pos: 1, color: [255, 215, 140] }     // Light gold
  ],
  antique: [
    { pos: 0, color: [40, 30, 20] },
    { pos: 0.5, color: [139, 90, 43] },
    { pos: 1, color: [180, 140, 100] }
  ],
  copper: [
    { pos: 0, color: [50, 25, 20] },
    { pos: 0.5, color: [184, 115, 51] },
    { pos: 1, color: [230, 180, 140] }
  ],
  gold: [
    { pos: 0, color: [70, 50, 20] },
    { pos: 0.5, color: [212, 175, 55] },
    { pos: 1, color: [255, 235, 150] }
  ],
  rose: [
    { pos: 0, color: [60, 35, 35] },
    { pos: 0.5, color: [183, 110, 121] },
    { pos: 1, color: [240, 190, 190] }
  ],
  silver: [
    { pos: 0, color: [40, 40, 45] },
    { pos: 0.5, color: [150, 150, 160] },
    { pos: 1, color: [220, 220, 230] }
  ]
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function sampleGradient(gradient, t) {
  // Find the two stops we're between
  for (let i = 0; i < gradient.length - 1; i++) {
    if (t >= gradient[i].pos && t <= gradient[i + 1].pos) {
      const localT = (t - gradient[i].pos) / (gradient[i + 1].pos - gradient[i].pos)
      return [
        Math.round(lerp(gradient[i].color[0], gradient[i + 1].color[0], localT)),
        Math.round(lerp(gradient[i].color[1], gradient[i + 1].color[1], localT)),
        Math.round(lerp(gradient[i].color[2], gradient[i + 1].color[2], localT))
      ]
    }
  }
  return gradient[gradient.length - 1].color
}

function App() {
  const [image, setImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [selectedGradient, setSelectedGradient] = useState('classic')
  const [preserveWhite, setPreserveWhite] = useState(true)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          setImage(img)
          processImage(img, selectedGradient)
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  const processImage = useCallback((img, gradientName) => {
    if (!img) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    canvas.width = img.width
    canvas.height = img.height
    
    ctx.drawImage(img, 0, 0)
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    const gradient = GRADIENTS[gradientName]
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      const a = pixels[i + 3]
      
      // Skip transparent pixels
      if (a < 10) continue
      
      // Optionally preserve near-white pixels
      if (preserveWhite && r > 240 && g > 240 && b > 240) continue
      
      // Calculate luminance
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      
      // Sample gradient
      const [nr, ng, nb] = sampleGradient(gradient, lum)
      
      pixels[i] = nr
      pixels[i + 1] = ng
      pixels[i + 2] = nb
    }
    
    ctx.putImageData(imageData, 0, 0)
    setProcessedImage(canvas.toDataURL('image/png'))
  }, [preserveWhite])

  const handleGradientChange = (gradientName) => {
    setSelectedGradient(gradientName)
    if (image) {
      processImage(image, gradientName)
    }
  }

  const handleDownload = () => {
    if (!processedImage) return
    const link = document.createElement('a')
    link.download = `bronzified-${selectedGradient}.png`
    link.href = processedImage
    link.click()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          setImage(img)
          processImage(img, selectedGradient)
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  // Render gradient preview
  const renderGradientPreview = (name, gradient) => {
    const stops = gradient.map(stop => 
      `rgb(${stop.color.join(',')}) ${stop.pos * 100}%`
    ).join(', ')
    
    return (
      <button
        key={name}
        className={`gradient-btn ${selectedGradient === name ? 'active' : ''}`}
        onClick={() => handleGradientChange(name)}
        style={{
          background: `linear-gradient(90deg, ${stops})`
        }}
      >
        <span>{name}</span>
      </button>
    )
  }

  return (
    <div className="app">
      <h1>🥉 Bronzify</h1>
      <p className="subtitle">Apply bronze gradient maps to any image</p>
      
      <div className="gradients">
        {Object.entries(GRADIENTS).map(([name, gradient]) => 
          renderGradientPreview(name, gradient)
        )}
      </div>

      <div className="options">
        <label>
          <input
            type="checkbox"
            checked={preserveWhite}
            onChange={(e) => {
              setPreserveWhite(e.target.checked)
              if (image) processImage(image, selectedGradient)
            }}
          />
          Preserve white/light backgrounds
        </label>
      </div>

      <div 
        className="upload-area"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {processedImage ? (
          <img src={processedImage} alt="Processed" className="preview" />
        ) : (
          <div className="upload-prompt">
            <p>📁 Click or drop an image</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{ display: 'none' }}
      />

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {processedImage && (
        <div className="actions">
          <button className="download-btn" onClick={handleDownload}>
            ⬇️ Download
          </button>
          <button className="reset-btn" onClick={() => {
            setImage(null)
            setProcessedImage(null)
          }}>
            🔄 Reset
          </button>
        </div>
      )}
    </div>
  )
}

export default App
