// ═══════════════════════════════════════════════════════════════
// Stick Figure Renderer — Gera personagens 2D estilo viral
// Renderiza bonequinhos, cenários e legendas no Canvas
// ═══════════════════════════════════════════════════════════════

export interface StickCharacter {
  id: string
  type: 'man' | 'woman' | 'child' | 'elder' | 'animal' | 'custom'
  label?: string           // Label above character (e.g., "avó", "lobo")
  x: number               // Position X (0-1 normalized)
  y: number               // Position Y (0-1 normalized)
  scale?: number          // Scale factor (default 1)
  expression?: 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry' | 'laughing' | 'scared' | 'thinking'
  facing?: 'left' | 'right' | 'front'
  holding?: string        // What the character is holding
  accessory?: string      // Hat, glasses, etc.
  bodyColor?: string      // Fill color for clothing
  walkFrame?: number      // 0-1 for walk cycle animation
  armGesture?: 'down' | 'wave' | 'point' | 'hold_item' | 'hands_up' | 'hips'
}

export interface StickScene {
  id: string
  characters: StickCharacter[]
  background: 'white' | 'outdoor' | 'house' | 'night' | 'nature' | 'city' | 'custom'
  backgroundProps?: string[]  // Additional props like 'tree', 'house', 'sun'
  text?: string              // Text to display (subtitle or label)
  textPosition?: 'top' | 'bottom' | 'middle'
  textStyle?: 'normal' | 'screaming' | 'whisper'
  duration: number           // seconds
  transition?: 'cut' | 'fade'
}

export interface StickVideoProject {
  title: string
  scenes: StickScene[]
  width: number
  height: number
  fps: number
}

// ─── Color Palette (matching viral stick figure style) ───────

const COLORS = {
  skin: '#FDBF60',
  skinDark: '#E8A838',
  outline: '#2D2D2D',
  outlineWidth: 4,
  white: '#FFFFFF',
  background: '#F5F5F5',
  clothing: {
    brown: '#8B6F47',
    blue: '#4A7AB5',
    red: '#C0392B',
    green: '#27AE60',
    purple: '#8E44AD',
    black: '#333333',
    gray: '#7F8C8D',
    orange: '#E67E22',
  },
  text: {
    normal: '#2D2D2D',
    scream: '#C0392B',
    whisper: '#7F8C8D',
  },
  animals: {
    dog: '#8B7355',
    cat: '#F39C12',
    wolf: '#95A5A6',
  }
}

// ─── Drawing Primitives ──────────────────────────────────────

function drawCircle(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  fill?: string, stroke?: boolean
) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = COLORS.outlineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  width?: number, color?: string
) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = color || COLORS.outline
  ctx.lineWidth = width || COLORS.outlineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

function drawEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, ry: number,
  fill?: string, stroke?: boolean
) {
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = COLORS.outlineWidth
    ctx.stroke()
  }
}

// ─── Character Body Parts ────────────────────────────────────

function drawHead(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  expression: string = 'neutral',
  facing: string = 'front'
) {
  // Head circle
  drawCircle(ctx, cx, cy, radius, COLORS.skin)

  // Eyes
  const eyeSpacing = radius * 0.4
  const eyeY = cy - radius * 0.1
  const eyeRadius = radius * 0.22

  if (expression === 'surprised' || expression === 'scared') {
    // Big round eyes
    drawCircle(ctx, cx - eyeSpacing, eyeY, eyeRadius * 1.3, COLORS.white)
    drawCircle(ctx, cx + eyeSpacing, eyeY, eyeRadius * 1.3, COLORS.white)
    drawCircle(ctx, cx - eyeSpacing, eyeY, eyeRadius * 0.6, COLORS.outline)
    drawCircle(ctx, cx + eyeSpacing, eyeY, eyeRadius * 0.6, COLORS.outline)
    // White dots
    drawCircle(ctx, cx - eyeSpacing + eyeRadius * 0.2, eyeY - eyeRadius * 0.2, eyeRadius * 0.25, COLORS.white, false)
    drawCircle(ctx, cx + eyeSpacing + eyeRadius * 0.2, eyeY - eyeRadius * 0.2, eyeRadius * 0.25, COLORS.white, false)
  } else if (expression === 'happy' || expression === 'laughing') {
    // Happy eyes (curved lines)
    ctx.beginPath()
    ctx.arc(cx - eyeSpacing, eyeY, eyeRadius, Math.PI, 0, false)
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + eyeSpacing, eyeY, eyeRadius, Math.PI, 0, false)
    ctx.stroke()
  } else if (expression === 'angry') {
    // Angry eyes with eyebrows
    drawCircle(ctx, cx - eyeSpacing, eyeY, eyeRadius, COLORS.white)
    drawCircle(ctx, cx + eyeSpacing, eyeY, eyeRadius, COLORS.white)
    drawCircle(ctx, cx - eyeSpacing, eyeY, eyeRadius * 0.5, COLORS.outline)
    drawCircle(ctx, cx + eyeSpacing, eyeY, eyeRadius * 0.5, COLORS.outline)
    // Angry eyebrows
    drawLine(ctx, cx - eyeSpacing - eyeRadius, eyeY - eyeRadius * 1.5, cx - eyeSpacing + eyeRadius * 0.5, eyeY - eyeRadius * 0.8, 3)
    drawLine(ctx, cx + eyeSpacing + eyeRadius, eyeY - eyeRadius * 1.5, cx + eyeSpacing - eyeRadius * 0.5, eyeY - eyeRadius * 0.8, 3)
  } else if (expression === 'sad') {
    // Sad eyes
    drawCircle(ctx, cx - eyeSpacing, eyeY, eyeRadius, COLORS.white)
    drawCircle(ctx, cx + eyeSpacing, eyeY, eyeRadius, COLORS.white)
    drawCircle(ctx, cx - eyeSpacing, eyeY + eyeRadius * 0.2, eyeRadius * 0.5, COLORS.outline)
    drawCircle(ctx, cx + eyeSpacing, eyeY + eyeRadius * 0.2, eyeRadius * 0.5, COLORS.outline)
  } else {
    // Neutral eyes (normal dots)
    drawCircle(ctx, cx - eyeSpacing, eyeY, eyeRadius, COLORS.white)
    drawCircle(ctx, cx + eyeSpacing, eyeY, eyeRadius, COLORS.white)
    drawCircle(ctx, cx - eyeSpacing, eyeY, eyeRadius * 0.55, COLORS.outline)
    drawCircle(ctx, cx + eyeSpacing, eyeY, eyeRadius * 0.55, COLORS.outline)
  }

  // Mouth
  const mouthY = cy + radius * 0.35
  const mouthWidth = radius * 0.5

  if (expression === 'happy' || expression === 'laughing') {
    ctx.beginPath()
    ctx.arc(cx, mouthY - radius * 0.1, mouthWidth, 0, Math.PI, false)
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = 3
    ctx.stroke()
    if (expression === 'laughing') {
      // Open mouth
      ctx.beginPath()
      ctx.arc(cx, mouthY, mouthWidth * 0.7, 0, Math.PI, false)
      ctx.fillStyle = '#C0392B'
      ctx.fill()
      ctx.stroke()
    }
  } else if (expression === 'surprised' || expression === 'scared') {
    // O mouth
    drawCircle(ctx, cx, mouthY, radius * 0.15, '#C0392B')
  } else if (expression === 'sad') {
    ctx.beginPath()
    ctx.arc(cx, mouthY + radius * 0.2, mouthWidth, Math.PI, 0, false)
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = 3
    ctx.stroke()
  } else if (expression === 'angry') {
    ctx.beginPath()
    ctx.moveTo(cx - mouthWidth, mouthY)
    ctx.lineTo(cx + mouthWidth, mouthY)
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = 3
    ctx.stroke()
  } else {
    // Neutral: slight smile
    ctx.beginPath()
    ctx.arc(cx, mouthY - radius * 0.05, mouthWidth * 0.6, 0.2, Math.PI - 0.2, false)
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = 3
    ctx.stroke()
  }
}

function drawStickBody(
  ctx: CanvasRenderingContext2D,
  cx: number, headBottom: number, height: number,
  armGesture: string = 'down',
  walkFrame: number = 0,
  clothingColor?: string
) {
  const shoulderY = headBottom + height * 0.05
  const hipY = headBottom + height * 0.45
  const legLength = height * 0.5

  // Body line (neck to hip)
  drawLine(ctx, cx, shoulderY, cx, hipY, COLORS.outlineWidth + 1)

  // Arms
  const armLength = height * 0.35
  const armSpread = height * 0.25

  if (armGesture === 'wave') {
    // One arm up waving
    drawLine(ctx, cx, shoulderY + height * 0.05, cx - armSpread, shoulderY - armLength * 0.3, COLORS.outlineWidth)
    drawLine(ctx, cx, shoulderY + height * 0.05, cx + armSpread * 0.8, shoulderY - armLength * 0.8, COLORS.outlineWidth)
    // Hand waving
    drawCircle(ctx, cx + armSpread * 0.8, shoulderY - armLength * 0.85, 5, COLORS.skin, false)
  } else if (armGesture === 'point') {
    drawLine(ctx, cx, shoulderY + height * 0.05, cx - armSpread * 0.6, shoulderY + armLength * 0.3, COLORS.outlineWidth)
    drawLine(ctx, cx, shoulderY + height * 0.05, cx + armSpread * 1.2, shoulderY - armLength * 0.1, COLORS.outlineWidth)
  } else if (armGesture === 'hands_up') {
    drawLine(ctx, cx, shoulderY + height * 0.05, cx - armSpread * 0.8, shoulderY - armLength * 0.7, COLORS.outlineWidth)
    drawLine(ctx, cx, shoulderY + height * 0.05, cx + armSpread * 0.8, shoulderY - armLength * 0.7, COLORS.outlineWidth)
  } else if (armGesture === 'hips') {
    drawLine(ctx, cx, shoulderY + height * 0.05, cx - armSpread * 0.4, hipY - height * 0.05, COLORS.outlineWidth)
    drawLine(ctx, cx, shoulderY + height * 0.05, cx + armSpread * 0.4, hipY - height * 0.05, COLORS.outlineWidth)
  } else {
    // Default down arms with slight swing
    const swing = Math.sin(walkFrame * Math.PI * 2) * armSpread * 0.15
    drawLine(ctx, cx, shoulderY + height * 0.05, cx - armSpread * 0.5 + swing, shoulderY + armLength * 0.5, COLORS.outlineWidth)
    drawLine(ctx, cx, shoulderY + height * 0.05, cx + armSpread * 0.5 - swing, shoulderY + armLength * 0.5, COLORS.outlineWidth)
  }

  // Legs
  const legSpread = height * 0.18
  const legSwing = Math.sin(walkFrame * Math.PI * 2) * legSpread * 0.4

  drawLine(ctx, cx, hipY, cx - legSpread + legSwing, hipY + legLength, COLORS.outlineWidth + 1)
  drawLine(ctx, cx, hipY, cx + legSpread - legSwing, hipY + legLength, COLORS.outlineWidth + 1)

  // Feet
  const footSize = 8
  const leftFootX = cx - legSpread + legSwing
  const rightFootX = cx + legSpread - legSwing
  const footY = hipY + legLength

  ctx.beginPath()
  ctx.moveTo(leftFootX, footY)
  ctx.lineTo(leftFootX - footSize, footY + 2)
  ctx.lineTo(leftFootX + footSize, footY + 2)
  ctx.fillStyle = COLORS.outline
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(rightFootX, footY)
  ctx.lineTo(rightFootX - footSize, footY + 2)
  ctx.lineTo(rightFootX + footSize, footY + 2)
  ctx.fill()
}

function drawClothing(
  ctx: CanvasRenderingContext2D,
  cx: number, headBottom: number, height: number,
  characterType: string,
  color?: string
) {
  const clothingColor = color || COLORS.clothing.brown
  const shoulderY = headBottom + height * 0.05
  const hipY = headBottom + height * 0.45

  if (characterType === 'woman' || characterType === 'elder') {
    // Triangle dress
    ctx.beginPath()
    ctx.moveTo(cx, shoulderY)
    ctx.lineTo(cx - height * 0.25, hipY + height * 0.15)
    ctx.lineTo(cx + height * 0.25, hipY + height * 0.15)
    ctx.closePath()
    ctx.fillStyle = clothingColor
    ctx.fill()
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = COLORS.outlineWidth
    ctx.stroke()
  } else if (characterType === 'man' || characterType === 'child') {
    // Shirt
    ctx.beginPath()
    ctx.moveTo(cx - height * 0.15, shoulderY)
    ctx.lineTo(cx + height * 0.15, shoulderY)
    ctx.lineTo(cx + height * 0.12, hipY)
    ctx.lineTo(cx - height * 0.12, hipY)
    ctx.closePath()
    ctx.fillStyle = clothingColor
    ctx.fill()
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = COLORS.outlineWidth
    ctx.stroke()
  }
}

function drawAnimal(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  animalType: string = 'dog',
  walkFrame: number = 0
) {
  const animalColor = COLORS.animals[animalType as keyof typeof COLORS.animals] || COLORS.animals.dog

  // Body (oval)
  drawEllipse(ctx, cx, cy, size * 0.6, size * 0.35, animalColor)

  // Head
  const headX = cx + size * 0.5
  const headY = cy - size * 0.2
  drawCircle(ctx, headX, headY, size * 0.3, animalColor)

  // Snout
  drawEllipse(ctx, headX + size * 0.2, headY + size * 0.05, size * 0.15, size * 0.1, animalColor)

  // Eyes
  drawCircle(ctx, headX + size * 0.05, headY - size * 0.08, size * 0.06, COLORS.white)
  drawCircle(ctx, headX + size * 0.05, headY - size * 0.08, size * 0.03, COLORS.outline)

  // Nose
  drawCircle(ctx, headX + size * 0.3, headY + size * 0.05, size * 0.05, COLORS.outline)

  // Ears
  ctx.beginPath()
  ctx.moveTo(headX - size * 0.1, headY - size * 0.2)
  ctx.lineTo(headX - size * 0.25, headY - size * 0.45)
  ctx.lineTo(headX + size * 0.05, headY - size * 0.25)
  ctx.fillStyle = animalColor
  ctx.fill()
  ctx.strokeStyle = COLORS.outline
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(headX + size * 0.15, headY - size * 0.2)
  ctx.lineTo(headX + size * 0.3, headY - size * 0.45)
  ctx.lineTo(headX + size * 0.35, headY - size * 0.2)
  ctx.fill()
  ctx.stroke()

  // Tail
  const tailWag = Math.sin(walkFrame * Math.PI * 4) * size * 0.15
  ctx.beginPath()
  ctx.moveTo(cx - size * 0.5, cy - size * 0.2)
  ctx.quadraticCurveTo(cx - size * 0.7, cy - size * 0.5 + tailWag, cx - size * 0.65, cy - size * 0.6 + tailWag)
  ctx.strokeStyle = COLORS.outline
  ctx.lineWidth = 3
  ctx.stroke()

  // Legs
  const legSwing = Math.sin(walkFrame * Math.PI * 2) * size * 0.08
  drawLine(ctx, cx - size * 0.3, cy + size * 0.25, cx - size * 0.3 + legSwing, cy + size * 0.55, 3)
  drawLine(ctx, cx - size * 0.1, cy + size * 0.25, cx - size * 0.1 - legSwing, cy + size * 0.55, 3)
  drawLine(ctx, cx + size * 0.1, cy + size * 0.25, cx + size * 0.1 + legSwing, cy + size * 0.55, 3)
  drawLine(ctx, cx + size * 0.3, cy + size * 0.25, cx + size * 0.3 - legSwing, cy + size * 0.55, 3)
}

// ─── Accessory Drawing ───────────────────────────────────────

function drawAccessory(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  accessory: string
) {
  if (accessory === 'hat') {
    // Cowboy/rustic hat
    ctx.beginPath()
    ctx.ellipse(cx, cy - radius * 0.9, radius * 1.3, radius * 0.15, 0, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.clothing.brown
    ctx.fill()
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    ctx.ellipse(cx, cy - radius * 1.1, radius * 0.7, radius * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (accessory === 'bun') {
    // Hair bun (for old woman)
    drawCircle(ctx, cx + radius * 0.1, cy - radius * 1.1, radius * 0.35, COLORS.outline)
  } else if (accessory === 'glasses') {
    // Round glasses
    ctx.beginPath()
    ctx.arc(cx - radius * 0.4, cy - radius * 0.1, radius * 0.25, 0, Math.PI * 2)
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + radius * 0.4, cy - radius * 0.1, radius * 0.25, 0, Math.PI * 2)
    ctx.stroke()
    drawLine(ctx, cx - radius * 0.15, cy - radius * 0.1, cx + radius * 0.15, cy - radius * 0.1, 2)
  } else if (accessory === 'bag') {
    // Cloth bag on stick
    const bagX = cx + radius * 1.5
    const bagY = cy + radius * 1.0
    // Stick
    drawLine(ctx, cx + radius * 0.3, cy - radius * 0.5, bagX, bagY - radius * 0.3, 3, COLORS.clothing.brown)
    // Bag
    ctx.beginPath()
    ctx.arc(bagX, bagY, radius * 0.4, 0, Math.PI * 2)
    ctx.fillStyle = '#E8DCC8'
    ctx.fill()
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = 3
    ctx.stroke()
  } else if (accessory === 'leash') {
    // Leash (held in hand)
    const leashEndX = cx + radius * 2.5
    const leashEndY = cy + radius * 1.8
    ctx.beginPath()
    ctx.moveTo(cx + radius * 0.8, cy + radius * 0.8)
    ctx.quadraticCurveTo(cx + radius * 1.5, cy + radius * 1.5, leashEndX, leashEndY)
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

// ─── Background Drawing ──────────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number, height: number,
  scene: StickScene
) {
  switch (scene.background) {
    case 'outdoor':
    case 'nature': {
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.6)
      skyGrad.addColorStop(0, '#87CEEB')
      skyGrad.addColorStop(1, '#E8F4FD')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, width, height * 0.6)

      // Ground
      const groundGrad = ctx.createLinearGradient(0, height * 0.55, 0, height)
      groundGrad.addColorStop(0, '#90C67C')
      groundGrad.addColorStop(1, '#6B9F58')
      ctx.fillStyle = groundGrad
      ctx.fillRect(0, height * 0.55, width, height * 0.45)

      // Sun
      drawCircle(ctx, width * 0.85, height * 0.12, 40, '#FFD93D')

      // Sun rays
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        const rx = width * 0.85 + Math.cos(angle) * 55
        const ry = height * 0.12 + Math.sin(angle) * 55
        const rx2 = width * 0.85 + Math.cos(angle) * 70
        const ry2 = height * 0.12 + Math.sin(angle) * 70
        drawLine(ctx, rx, ry, rx2, ry2, 3, '#FFD93D')
      }

      // Clouds
      drawCloud(ctx, width * 0.2, height * 0.1, 60)
      drawCloud(ctx, width * 0.6, height * 0.08, 45)

      // Tree(s)
      if (scene.backgroundProps?.includes('tree')) {
        drawTree(ctx, width * 0.12, height * 0.45, 80)
      }
      break
    }
    case 'house': {
      // Indoor
      ctx.fillStyle = '#FFF8E7'
      ctx.fillRect(0, 0, width, height)

      // Floor
      ctx.fillStyle = '#DEB887'
      ctx.fillRect(0, height * 0.7, width, height * 0.3)

      // Floor line
      drawLine(ctx, 0, height * 0.7, width, height * 0.7, 3, '#C4A67A')

      // Window
      ctx.fillStyle = '#87CEEB'
      ctx.fillRect(width * 0.05, height * 0.1, width * 0.25, height * 0.25)
      ctx.strokeStyle = COLORS.outline
      ctx.lineWidth = 3
      ctx.strokeRect(width * 0.05, height * 0.1, width * 0.25, height * 0.25)
      drawLine(ctx, width * 0.175, height * 0.1, width * 0.175, height * 0.35, 3)
      drawLine(ctx, width * 0.05, height * 0.225, width * 0.3, height * 0.225, 3)
      break
    }
    case 'night': {
      const nightGrad = ctx.createLinearGradient(0, 0, 0, height)
      nightGrad.addColorStop(0, '#1A1A3E')
      nightGrad.addColorStop(0.6, '#2D2D5E')
      nightGrad.addColorStop(1, '#1A1A3E')
      ctx.fillStyle = nightGrad
      ctx.fillRect(0, 0, width, height)

      // Stars
      for (let i = 0; i < 30; i++) {
        const sx = Math.random() * width
        const sy = Math.random() * height * 0.6
        const sr = 1 + Math.random() * 2
        drawCircle(ctx, sx, sy, sr, '#FFFFFF', false)
      }

      // Moon
      drawCircle(ctx, width * 0.8, height * 0.15, 35, '#F5F5DC')
      drawCircle(ctx, width * 0.78, height * 0.13, 30, '#1A1A3E', false)
      break
    }
    case 'city': {
      // Sky
      ctx.fillStyle = '#B0C4DE'
      ctx.fillRect(0, 0, width, height)

      // Buildings
      for (let i = 0; i < 8; i++) {
        const bx = i * (width / 8)
        const bh = height * (0.3 + Math.random() * 0.4)
        ctx.fillStyle = `hsl(210, ${10 + i * 5}%, ${40 + i * 5}%)`
        ctx.fillRect(bx, height - bh, width / 8 - 5, bh)
        ctx.strokeStyle = COLORS.outline
        ctx.lineWidth = 1
        ctx.strokeRect(bx, height - bh, width / 8 - 5, bh)

        // Windows
        for (let wy = height - bh + 10; wy < height - 20; wy += 20) {
          for (let wx = bx + 5; wx < bx + width / 8 - 15; wx += 15) {
            ctx.fillStyle = Math.random() > 0.3 ? '#FFD93D' : '#4A4A6A'
            ctx.fillRect(wx, wy, 8, 10)
          }
        }
      }

      // Ground
      ctx.fillStyle = '#666'
      ctx.fillRect(0, height * 0.85, width, height * 0.15)
      break
    }
    default: {
      // White/light background
      ctx.fillStyle = COLORS.background
      ctx.fillRect(0, 0, width, height)
      break
    }
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  drawCircle(ctx, cx, cy, size * 0.4, 'rgba(255,255,255,0.9)', false)
  drawCircle(ctx, cx - size * 0.3, cy + size * 0.05, size * 0.3, 'rgba(255,255,255,0.9)', false)
  drawCircle(ctx, cx + size * 0.3, cy + size * 0.05, size * 0.35, 'rgba(255,255,255,0.9)', false)
  drawCircle(ctx, cx + size * 0.1, cy - size * 0.15, size * 0.25, 'rgba(255,255,255,0.9)', false)
}

function drawTree(ctx: CanvasRenderingContext2D, cx: number, groundY: number, height: number) {
  // Trunk
  ctx.fillStyle = '#8B4513'
  ctx.fillRect(cx - 8, groundY - height * 0.5, 16, height * 0.5)
  ctx.strokeStyle = COLORS.outline
  ctx.lineWidth = 2
  ctx.strokeRect(cx - 8, groundY - height * 0.5, 16, height * 0.5)

  // Foliage
  drawCircle(ctx, cx, groundY - height * 0.65, height * 0.3, '#4CAF50')
  drawCircle(ctx, cx - height * 0.15, groundY - height * 0.5, height * 0.22, '#4CAF50')
  drawCircle(ctx, cx + height * 0.15, groundY - height * 0.5, height * 0.22, '#4CAF50')
}

// ─── Text/Subtitle Drawing ───────────────────────────────────

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number, height: number,
  position: string = 'bottom',
  style: string = 'normal'
) {
  if (!text) return

  const fontSize = Math.floor(width * 0.065)
  ctx.font = `bold ${fontSize}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const maxWidth = width * 0.85

  // Word wrap
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)

  const lineHeight = fontSize * 1.3
  const totalTextHeight = lines.length * lineHeight

  let startY: number
  if (position === 'top') {
    startY = height * 0.08 + totalTextHeight / 2
  } else if (position === 'middle') {
    startY = (height - totalTextHeight) / 2 + lineHeight / 2
  } else {
    startY = height - height * 0.08 - totalTextHeight + lineHeight / 2
  }

  // Text color based on style
  let textColor = COLORS.text.normal
  if (style === 'screaming') textColor = COLORS.text.scream
  if (style === 'whisper') textColor = COLORS.text.whisper

  // Draw text with outline for readability
  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight

    // Text shadow/outline
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 6
    ctx.lineJoin = 'round'
    ctx.strokeText(lines[i], width / 2, y)

    // Main text
    ctx.fillStyle = textColor
    ctx.fillText(lines[i], width / 2, y)
  }
}

// ─── Main Scene Renderer ─────────────────────────────────────

export function renderScene(
  ctx: CanvasRenderingContext2D,
  scene: StickScene,
  width: number,
  height: number,
  frameTime: number  // 0-1 within scene
) {
  // Clear
  ctx.clearRect(0, 0, width, height)

  // Draw background
  drawBackground(ctx, width, height, scene)

  // Draw characters
  for (const char of scene.characters) {
    const cx = char.x * width
    const cy = char.y * height
    const scale = (char.scale || 1)
    const bodyHeight = height * 0.35 * scale
    const headRadius = height * 0.07 * scale
    const headCenterY = cy - bodyHeight * 0.5
    const walkFrame = (char.walkFrame || 0) + frameTime

    if (char.type === 'animal') {
      drawAnimal(ctx, cx, cy, bodyHeight * 0.5, char.holding || 'dog', walkFrame)
    } else {
      // Draw clothing first (behind body)
      drawClothing(ctx, cx, headCenterY + headRadius, bodyHeight, char.type, char.bodyColor)

      // Draw stick body
      drawStickBody(
        ctx, cx, headCenterY + headRadius, bodyHeight,
        char.armGesture || 'down',
        walkFrame
      )

      // Draw head on top
      drawHead(ctx, cx, headCenterY, headRadius, char.expression, char.facing)

      // Draw accessory
      if (char.accessory) {
        drawAccessory(ctx, cx, headCenterY, headRadius, char.accessory)
      }

      // Label above character
      if (char.label) {
        ctx.font = `bold ${Math.floor(headRadius * 0.7)}px Arial, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillStyle = COLORS.outline
        ctx.fillText(char.label, cx, headCenterY - headRadius * 1.5)
      }
    }
  }

  // Draw text
  if (scene.text) {
    drawText(ctx, scene.text, width, height, scene.textPosition, scene.textStyle)
  }
}

// ─── Generate Frame as ImageData ─────────────────────────────

export function renderSceneToCanvas(
  canvas: HTMLCanvasElement,
  scene: StickScene,
  frameTime: number
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  renderScene(ctx, scene, canvas.width, canvas.height, frameTime)
}

// ─── Pre-built Character Templates ───────────────────────────

export const CHARACTER_TEMPLATES = {
  woman: (x: number, y: number, label?: string): StickCharacter => ({
    id: `woman_${Date.now()}`,
    type: 'woman',
    label,
    x, y,
    scale: 1,
    expression: 'neutral',
    facing: 'front',
    bodyColor: '#C0392B',
    armGesture: 'down',
  }),
  oldWoman: (x: number, y: number): StickCharacter => ({
    id: `old_woman_${Date.now()}`,
    type: 'woman',
    label: 'avó',
    x, y,
    scale: 1,
    expression: 'neutral',
    facing: 'front',
    accessory: 'bun',
    bodyColor: COLORS.clothing.brown,
    armGesture: 'down',
  }),
  oldWomanWithBag: (x: number, y: number): StickCharacter => ({
    id: `old_woman_bag_${Date.now()}`,
    type: 'woman',
    label: 'avó',
    x, y,
    scale: 1,
    expression: 'neutral',
    facing: 'right',
    accessory: 'bun',
    bodyColor: COLORS.clothing.brown,
    armGesture: 'hold_item',
    holding: 'bag',
  }),
  man: (x: number, y: number, label?: string): StickCharacter => ({
    id: `man_${Date.now()}`,
    type: 'man',
    label,
    x, y,
    scale: 1.1,
    expression: 'neutral',
    facing: 'front',
    bodyColor: COLORS.clothing.blue,
  }),
  child: (x: number, y: number, label?: string): StickCharacter => ({
    id: `child_${Date.now()}`,
    type: 'child',
    label,
    x, y,
    scale: 0.7,
    expression: 'happy',
    facing: 'front',
    bodyColor: COLORS.clothing.red,
  }),
  elder: (x: number, y: number, label?: string): StickCharacter => ({
    id: `elder_${Date.now()}`,
    type: 'elder',
    label,
    x, y,
    scale: 0.9,
    expression: 'thinking',
    facing: 'front',
    accessory: 'glasses',
    bodyColor: COLORS.clothing.gray,
  }),
  dog: (x: number, y: number): StickCharacter => ({
    id: `dog_${Date.now()}`,
    type: 'animal',
    x, y,
    scale: 0.6,
    holding: 'dog',
  }),
  wolf: (x: number, y: number): StickCharacter => ({
    id: `wolf_${Date.now()}`,
    type: 'animal',
    x, y,
    scale: 0.8,
    holding: 'wolf',
  }),
}

// ─── Pre-built Scene Templates ───────────────────────────────

export const SCENE_TEMPLATES = {
 CampoComAvó: (): StickScene => ({
    id: `campo_${Date.now()}`,
    characters: [
      CHARACTER_TEMPLATES.oldWomanWithBag(0.35, 0.6),
      CHARACTER_TEMPLATES.dog(0.7, 0.72),
    ],
    background: 'outdoor',
    backgroundProps: ['tree'],
    text: 'do campo...',
    textPosition: 'top',
    textStyle: 'normal',
    duration: 4,
  }),
  houseInterior: (): StickScene => ({
    id: `house_${Date.now()}`,
    characters: [
      CHARACTER_TEMPLATES.man(0.3, 0.6, 'João'),
      CHARACTER_TEMPLATES.woman(0.65, 0.6, 'Maria'),
    ],
    background: 'house',
    text: 'dentro de casa...',
    textPosition: 'top',
    duration: 4,
  }),
  nightScene: (): StickScene => ({
    id: `night_${Date.now()}`,
    characters: [
      CHARACTER_TEMPLATES.elder(0.4, 0.6, 'vovô'),
      CHARACTER_TEMPLATES.child(0.7, 0.68, 'neto'),
    ],
    background: 'night',
    text: 'à noite...',
    textPosition: 'top',
    duration: 4,
  }),
  cityScene: (): StickScene => ({
    id: `city_${Date.now()}`,
    characters: [
      CHARACTER_TEMPLATES.man(0.5, 0.6),
    ],
    background: 'city',
    text: 'na cidade...',
    textPosition: 'top',
    duration: 4,
  }),
}
