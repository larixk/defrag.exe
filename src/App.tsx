import { useEffect } from 'react'
import { proxy, useSnapshot } from 'valtio'

const CELL = 40
const MAX_FAILURES = 10


let resetTimeoutId: ReturnType<typeof setTimeout> | null = null

interface Node {
  dx: number
  dy: number
  side: 'top' | 'bottom' | 'left' | 'right'
  connectedTo?: { brickId: number; nodeIndex: number }
  failureCount: number
}

interface Brick {
  id: number
  x: number
  y: number
  width: number
  height: number
  nodes: Node[]
  rotation: number
  color: string
}

interface Store {
  bricks: Brick[]
  nextId: number
}

const generateRandomBrickTypes = () => {

const a = Math.random() * 10 * 1
const b = Math.random() * 10 * 0.5
const c = Math.random() * 10 * 0.1

return [
  { width: c, height: c, rotation: 0, color: `hsl(${Math.random() * 120}, 100%, 50%)` },
  { width: a, height: b, rotation: 0, color: `hsl(${Math.random() * 120}, 100%, 50%)` },
  { width: a, height: c, rotation: 0, color: `hsl(${Math.random() * 120}, 100%, 50%)` },
  { width: b, height: a, rotation: 0, color: `hsl(${Math.random() * 120 + 120}, 100%, 50%)` },
  { width: b, height: c, rotation: 0, color: `hsl(${Math.random() * 120 + 120}, 100%, 50%)` },
  { width: c, height: a, rotation: 0, color: `hsl(${Math.random() * 120 + 240}, 100%, 50%)` },
  { width: c, height: b, rotation: 0, color: `hsl(${Math.random() * 120 + 240}, 100%, 50%)` },
]

}

let  currentBrickTypes = generateRandomBrickTypes(); //.filter(() => Math.random() < 0.5)

let brickTypeIndex = 0

function getNextBrickType() {
  const type = currentBrickTypes[brickTypeIndex % currentBrickTypes.length]
  brickTypeIndex++
  return type
}

function createBrick(id: number, x: number, y: number, width: number, height: number, rotation: number, color: string): Brick {
  const nodes: Node[] = [
    { dx: width / 2, dy: 0, side: 'top', failureCount: 0 },
    { dx: width / 2, dy: height, side: 'bottom', failureCount: 0 },
    { dx: 0, dy: height / 2, side: 'left', failureCount: 0 },
    { dx: width, dy: height / 2, side: 'right', failureCount: 0 },
  ]
  return { id, x, y, width, height, nodes, rotation, color  }
}

const store = proxy<Store>({
  bricks: [],
  nextId: 0,
})

function rotatePoint(x: number, y: number, centerX: number, centerY: number, angleDegrees: number) {
  const angleRadians = (angleDegrees * Math.PI) / 180
  const cos = Math.cos(angleRadians)
  const sin = Math.sin(angleRadians)
  
  const dx = x - centerX
  const dy = y - centerY
  
  const rotatedX = centerX + dx * cos - dy * sin
  const rotatedY = centerY + dx * sin + dy * cos
  
  return { x: rotatedX, y: rotatedY }
}

function getBrickCorners(brick: Brick) {
  const centerX = brick.x + brick.width / 2
  const centerY = brick.y + brick.height / 2
  
  const corners = [
    { x: brick.x, y: brick.y },
    { x: brick.x + brick.width, y: brick.y },
    { x: brick.x + brick.width, y: brick.y + brick.height },
    { x: brick.x, y: brick.y + brick.height }
  ]
  
  return corners.map(corner => rotatePoint(corner.x, corner.y, centerX, centerY, brick.rotation))
}

function rectanglesOverlap(a: Brick, b: Brick) {
  // For simplicity, use axis-aligned bounding box of rotated rectangles
  const aCorners = getBrickCorners(a)
  const bCorners = getBrickCorners(b)
  
  const aMinX = Math.min(...aCorners.map(c => c.x))
  const aMaxX = Math.max(...aCorners.map(c => c.x))
  const aMinY = Math.min(...aCorners.map(c => c.y))
  const aMaxY = Math.max(...aCorners.map(c => c.y))
  
  const bMinX = Math.min(...bCorners.map(c => c.x))
  const bMaxX = Math.max(...bCorners.map(c => c.x))
  const bMinY = Math.min(...bCorners.map(c => c.y))
  const bMaxY = Math.max(...bCorners.map(c => c.y))
  
  return !(aMaxX <= bMinX || bMaxX <= aMinX || aMaxY <= bMinY || bMaxY <= aMinY)
}

function addFirstBrick() {
  if (store.bricks.length === 0) {
    const shape = getNextBrickType()
    store.bricks.push(createBrick(store.nextId++, 0, 0, shape.width, shape.height, shape.rotation, shape.color))
  }
}

function addBrick() {
  const { bricks } = store
  if (bricks.length === 0) return

  const openNodes: { brick: Brick; node: Node; nodeIndex: number }[] = []
  for (const brick of bricks) {
    brick.nodes.forEach((node, idx) => {
      if (!node.connectedTo && node.failureCount < MAX_FAILURES) {
        openNodes.push({ brick, node, nodeIndex: idx })
      }
    })
  }
  if (openNodes.length === 0) {
    // Reset the entire world
    currentBrickTypes = generateRandomBrickTypes()
    store.bricks = []
    store.nextId = 0
    addFirstBrick()
    for (let i = 0; i < 4; i++) addBrick()
    return
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const target = openNodes[Math.floor(Math.random() * openNodes.length)]
    const opposite: Node['side'] =
      target.node.side === 'top'
        ? 'bottom'
        : target.node.side === 'bottom'
        ? 'top'
        : target.node.side === 'left'
        ? 'right'
        : 'left'

    const newShape = getNextBrickType()
    const newBrick = createBrick(store.nextId, 0, 0, newShape.width, newShape.height, newShape.rotation, newShape.color)
    const newNodeIndex = newBrick.nodes.findIndex((n) => n.side === opposite)
    const newNode = newBrick.nodes[newNodeIndex]

    // Calculate rotated node positions
    const targetCenterX = target.brick.x + target.brick.width / 2
    const targetCenterY = target.brick.y + target.brick.height / 2
    const targetNodeWorldPos = rotatePoint(
      target.brick.x + target.node.dx,
      target.brick.y + target.node.dy,
      targetCenterX,
      targetCenterY,
      target.brick.rotation
    )

    if (Math.sqrt(targetCenterX * targetCenterX + targetCenterY * targetCenterY) > 10) {
      continue
    }

    const newBrickCenterX = newBrick.x + newBrick.width / 2
    const newBrickCenterY = newBrick.y + newBrick.height / 2
    const newNodeWorldPos = rotatePoint(
      newBrick.x + newNode.dx,
      newBrick.y + newNode.dy,
      newBrickCenterX,
      newBrickCenterY,
      newBrick.rotation
    )

    // Calculate the offset needed to align the nodes
    const offsetX = targetNodeWorldPos.x - newNodeWorldPos.x
    const offsetY = targetNodeWorldPos.y - newNodeWorldPos.y

    // Apply offset to new brick position
    newBrick.x += offsetX
    newBrick.y += offsetY

    if (!bricks.some((b) => rectanglesOverlap(b, newBrick))) {
      target.node.connectedTo = { brickId: store.nextId, nodeIndex: newNodeIndex }
      newNode.connectedTo = { brickId: target.brick.id, nodeIndex: target.nodeIndex }
      store.nextId++
      bricks.push(newBrick)

      if (resetTimeoutId) {
        clearTimeout(resetTimeoutId)
      }
      resetTimeoutId = setTimeout(() => {
        currentBrickTypes = generateRandomBrickTypes()
        store.bricks = []
        store.nextId = 0
        addFirstBrick()
        for (let i = 0; i < 4; i++) addBrick()
      }, 3000)
      return
    }
  }
  
  // If we get here, all attempts failed - increment failure count for the target node
  const target = openNodes[Math.floor(Math.random() * openNodes.length)]
  target.node.failureCount++
}

export default function App() {
  const snap = useSnapshot(store)
  
  useEffect(() => {
    addFirstBrick()
    for (let i = 0; i < 4; i++) addBrick()
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        addBrick()
      }
    }

    const interval = setInterval(() => {
      addBrick()
      addBrick()
      addBrick()
      addBrick()
      addBrick()
      addBrick()
    }, 10)
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      clearInterval(interval)
    }
  }, [])
  return (
    <div
      className="world"
      style={{
        position: 'relative',
        left: 0, // window.innerWidth / 2 - worldWidth * CELL / 2,
        top: 0, // window.innerHeight / 2 - worldHeight * CELL / 2,
        width: window.innerWidth,
        height: window.innerHeight,
        // scale: window.innerWidth / worldWidth / CELL / 3
      }}
    >
      {snap.bricks.map((b) => (
        <div
          key={b.id}
          className="brick"
          style={{ 
            position: 'absolute',
            left: b.x * CELL + window.innerWidth / 2, 
            top: b.y * CELL + window.innerHeight / 2, 
            width: b.width * CELL , 
            height: b.height * CELL ,
            transform: `rotate(${b.rotation}deg)`,
            transformOrigin: 'center',
            backgroundImage: `linear-gradient(to bottom, ${b.color} 50%, transparent 100%)`,
            backgroundSize: '100% 200%',
          }}
        >
          {/* {b.nodes.filter((n) => !n.connectedTo && n.failureCount < MAX_FAILURES).map((n, i) => (
            <div
              key={i}
              className="node"
              style={{
                position: 'absolute',
                left: n.dx * CELL - 5,
                top: n.dy * CELL - 5,
                width: n.failureCount * 2 + 1,
                height: n.failureCount * 2 + 1,
              }}
            />
          ))} */}
        </div>
      ))}
    </div>
  )
}
