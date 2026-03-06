import { useState, useRef, useCallback } from 'react'
import './App.css'

// Bronze gradient presets - rich multi-stop metallic gradients
const GRADIENTS = {
  copperWarm: [
    { pos: 0, color: [94, 45, 16] },
    { pos: 0.17, color: [132, 81, 50] },
    { pos: 0.33, color: [166, 112, 81] },
    { pos: 0.50, color: [192, 138, 104] },
    { pos: 0.67, color: [203, 146, 113] },
    { pos: 0.83, color: [196, 134, 101] },
    { pos: 1, color: [182, 115, 79] }
  ],
  bronzeDark: [
    { pos: 0, color: [99, 49, 17] },
    { pos: 0.17, color: [147, 95, 61] },
    { pos: 0.33, color: [186, 129, 96] },
    { pos: 0.50, color: [203, 146, 113] },
    { pos: 0.67, color: [181, 128, 99] },
    { pos: 0.83, color: [128, 84, 63] },
    { pos: 1, color: [54, 18, 14] }
  ],
  roseChampagne: [
    { pos: 0, color: [161, 98, 64] },
    { pos: 0.17, color: [146, 89, 55] },
    { pos: 0.33, color: [138, 83, 49] },
    { pos: 0.50, color: [135, 80, 47] },
    { pos: 0.67, color: [162, 119, 90] },
    { pos: 0.83, color: [202, 176, 158] },
    { pos: 1, color: [250, 245, 239] }
  ],
  copperClassic: [
    { pos: 0, color: [195, 130, 89] },
    { pos: 0.17, color: [213, 162, 128] },
    { pos: 0.33, color: [228, 188, 166] },
    { pos: 0.50, color: [239, 209, 190] },
    { pos: 0.67, color: [224, 187, 166] },
    { pos: 0.83, color: [196, 151, 124] },
    { pos: 1, color: [163, 105, 72] }
  ],
  gold: [
    { pos: 0, color: [70, 50, 20] },
    { pos: 0.25, color: [140, 100, 40] },
    { pos: 0.5, color: [212, 175, 55] },
    { pos: 0.75, color: [255, 215, 100] },
    { pos: 1, color: [255, 235, 150] }
  ],
  silver: [
    { pos: 0, color: [40, 40, 45] },
    { pos: 0.25, color: [90, 90, 100] },
    { pos: 0.5, color: [150, 150, 160] },
    { pos: 0.75, color: [190, 190, 200] },
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
  const [selectedGradient, setSelectedGradient] = useState('copperWarm')
  const [preserveWhite, setPreserveWhite] = useState(true)
  const [gradientMode, setGradientMode] = useState('luminance') // 'luminance' or 'positional'
  const [gradientDirection, setGradientDirection] = useState('horizontal') // 'horizontal', 'vertical', 'radial'
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
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)
    
    if (gradientMode === 'positional') {
      // First pass: find bounding box of non-transparent pixels
      let minX = width, maxX = 0, minY = height, maxY = 0
      
      for (let i = 0; i < pixels.length; i += 4) {
        const a = pixels[i + 3]
        if (a < 10) continue
        
        const pixelIndex = i / 4
        const x = pixelIndex % width
        const y = Math.floor(pixelIndex / width)
        
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
      
      const boundWidth = maxX - minX || 1
      const boundHeight = maxY - minY || 1
      const boundCenterX = minX + boundWidth / 2
      const boundCenterY = minY + boundHeight / 2
      const boundMaxDist = Math.sqrt((boundWidth / 2) ** 2 + (boundHeight / 2) ** 2)
      
      // Second pass: apply gradient within bounding box
      for (let i = 0; i < pixels.length; i += 4) {
        const a = pixels[i + 3]
        
        // Skip transparent pixels
        if (a < 10) continue
        
        const pixelIndex = i / 4
        const x = pixelIndex % width
        const y = Math.floor(pixelIndex / width)
        
        let t = 0
        if (gradientDirection === 'horizontal') {
          t = (x - minX) / boundWidth
        } else if (gradientDirection === 'vertical') {
          t = (y - minY) / boundHeight
        } else if (gradientDirection === 'radial') {
          const dist = Math.sqrt((x - boundCenterX) ** 2 + (y - boundCenterY) ** 2)
          t = Math.min(1, dist / boundMaxDist)
        }
        
        const [nr, ng, nb] = sampleGradient(gradient, t)
        
        pixels[i] = nr
        pixels[i + 1] = ng
        pixels[i + 2] = nb
      }
    } else {
      // Luminance mode: gradient based on brightness
      // First pass: find min/max luminance for normalization
      let minLum = 255
      let maxLum = 0
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        const a = pixels[i + 3]
        
        if (a < 10) continue
        if (preserveWhite && r > 240 && g > 240 && b > 240) continue
        
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        minLum = Math.min(minLum, lum)
        maxLum = Math.max(maxLum, lum)
      }
      
      const lumRange = maxLum - minLum || 1
      
      // Second pass: apply gradient with normalized luminance
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        const a = pixels[i + 3]
        
        // Skip transparent pixels
        if (a < 10) continue
        
        // Optionally preserve near-white pixels
        if (preserveWhite && r > 240 && g > 240 && b > 240) continue
        
        // Calculate luminance and normalize to 0-1 range
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        const normalizedLum = (lum - minLum) / lumRange
        
        // Sample gradient
        const [nr, ng, nb] = sampleGradient(gradient, normalizedLum)
        
        pixels[i] = nr
        pixels[i + 1] = ng
        pixels[i + 2] = nb
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    setProcessedImage(canvas.toDataURL('image/png'))
  }, [preserveWhite, gradientMode, gradientDirection])

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
        <div className="option-group">
          <label className="option-label">Mode:</label>
          <div className="toggle-buttons">
            <button 
              className={`toggle-btn ${gradientMode === 'luminance' ? 'active' : ''}`}
              onClick={() => {
                setGradientMode('luminance')
                if (image) setTimeout(() => processImage(image, selectedGradient), 0)
              }}
            >
              Luminance
            </button>
            <button 
              className={`toggle-btn ${gradientMode === 'positional' ? 'active' : ''}`}
              onClick={() => {
                setGradientMode('positional')
                if (image) setTimeout(() => processImage(image, selectedGradient), 0)
              }}
            >
              Positional
            </button>
          </div>
        </div>
        
        {gradientMode === 'positional' && (
          <div className="option-group">
            <label className="option-label">Direction:</label>
            <div className="toggle-buttons">
              <button 
                className={`toggle-btn ${gradientDirection === 'horizontal' ? 'active' : ''}`}
                onClick={() => {
                  setGradientDirection('horizontal')
                  if (image) setTimeout(() => processImage(image, selectedGradient), 0)
                }}
              >
                ↔️ Horizontal
              </button>
              <button 
                className={`toggle-btn ${gradientDirection === 'vertical' ? 'active' : ''}`}
                onClick={() => {
                  setGradientDirection('vertical')
                  if (image) setTimeout(() => processImage(image, selectedGradient), 0)
                }}
              >
                ↕️ Vertical
              </button>
              <button 
                className={`toggle-btn ${gradientDirection === 'radial' ? 'active' : ''}`}
                onClick={() => {
                  setGradientDirection('radial')
                  if (image) setTimeout(() => processImage(image, selectedGradient), 0)
                }}
              >
                🔘 Radial
              </button>
            </div>
          </div>
        )}
        
        {gradientMode === 'luminance' && (
          <label className="checkbox-label">
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
        )}
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
