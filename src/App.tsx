import { useEffect } from 'react'
import { proxy, useSnapshot } from 'valtio'

const CELL = 40

interface Node {
  dx: number
  dy: number
  side: 'top' | 'bottom' | 'left' | 'right'
  connectedTo?: { brickId: number; nodeIndex: number }
}

interface Brick {
  id: number
  x: number
  y: number
  width: number
  height: number
  nodes: Node[]
}

interface Store {
  shape: { width: number; height: number }
  bricks: Brick[]
  nextId: number
}

function randomShape() {
  const width = Math.floor(Math.random() * 3) + 1
  const height = Math.floor(Math.random() * 3) + 1
  return { width, height }
}

function createBrick(id: number, x: number, y: number, width: number, height: number): Brick {
  const nodes: Node[] = [
    { dx: width / 2, dy: 0, side: 'top' },
    { dx: width / 2, dy: height, side: 'bottom' },
    { dx: 0, dy: height / 2, side: 'left' },
    { dx: width, dy: height / 2, side: 'right' },
  ]
  return { id, x, y, width, height, nodes }
}

const store = proxy<Store>({
  shape: randomShape(),
  bricks: [],
  nextId: 0,
})

function rectanglesOverlap(a: Brick, b: Brick) {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y)
}

function addFirstBrick() {
  if (store.bricks.length === 0) {
    const { width, height } = store.shape
    store.bricks.push(createBrick(store.nextId++, 0, 0, width, height))
  }
}

function addBrick() {
  const { bricks, shape } = store
  if (bricks.length === 0) return

  const openNodes: { brick: Brick; node: Node; nodeIndex: number }[] = []
  for (const brick of bricks) {
    brick.nodes.forEach((node, idx) => {
      if (!node.connectedTo) openNodes.push({ brick, node, nodeIndex: idx })
    })
  }
  if (openNodes.length === 0) return

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

    const newBrick = createBrick(store.nextId, 0, 0, shape.width, shape.height)
    const newNodeIndex = newBrick.nodes.findIndex((n) => n.side === opposite)
    const newNode = newBrick.nodes[newNodeIndex]

    // align node positions
    const absX = target.brick.x + target.node.dx
    const absY = target.brick.y + target.node.dy
    newBrick.x = absX - newNode.dx
    newBrick.y = absY - newNode.dy

    if (!bricks.some((b) => rectanglesOverlap(b, newBrick))) {
      target.node.connectedTo = { brickId: store.nextId, nodeIndex: newNodeIndex }
      newNode.connectedTo = { brickId: target.brick.id, nodeIndex: target.nodeIndex }
      store.nextId++
      bricks.push(newBrick)
      return
    }
  }
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
    }, 100)
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
        left: window.innerWidth / 2 - snap.shape.width * CELL / 2,
        top: window.innerHeight / 2 - snap.shape.height * CELL / 2,
        width: snap.shape.width * CELL,
        height: snap.shape.height * CELL,
      }}
    >
      {snap.bricks.map((b) => (
        <div
          key={b.id}
          className="brick"
          style={{ left: b.x * CELL, top: b.y * CELL, width: b.width * CELL, height: b.height * CELL }}
        >
          {b.nodes.map((n, i) => (
            <div
              key={i}
              className="node"
              style={{
                left: n.dx * CELL,
                top: n.dy * CELL,
                background: n.connectedTo ? 'black' : 'blue',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
