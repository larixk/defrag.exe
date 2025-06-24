import { useEffect } from 'react'
import { proxy, useSnapshot } from 'valtio'

const CELL = 40

interface Brick {
  id: number
  x: number
  y: number
  width: number
  height: number
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
    store.bricks.push({ id: store.nextId++, x: 0, y: 0, width: store.shape.width, height: store.shape.height })
  }
}

function addBrick() {
  const { bricks, shape } = store
  if (bricks.length === 0) return
  for (let attempt = 0; attempt < 50; attempt++) {
    const base = bricks[Math.floor(Math.random() * bricks.length)]
    const side = ['top', 'bottom', 'left', 'right'][Math.floor(Math.random() * 4)] as 'top' | 'bottom' | 'left' | 'right'
    let x = base.x
    let y = base.y
    if (side === 'top') {
      y = base.y - shape.height
      x = base.x + Math.floor((base.width - shape.width) / 2)
    } else if (side === 'bottom') {
      y = base.y + base.height
      x = base.x + Math.floor((base.width - shape.width) / 2)
    } else if (side === 'left') {
      x = base.x - shape.width
      y = base.y + Math.floor((base.height - shape.height) / 2)
    } else {
      x = base.x + base.width
      y = base.y + Math.floor((base.height - shape.height) / 2)
    }
    const newBrick: Brick = { id: store.nextId, x, y, width: shape.width, height: shape.height }
    if (!bricks.some((b) => rectanglesOverlap(b, newBrick))) {
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
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        addBrick()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  return (
    <div className="world">
      {snap.bricks.map((b) => (
        <div
          key={b.id}
          className="brick"
          style={{ left: b.x * CELL, top: b.y * CELL, width: b.width * CELL, height: b.height * CELL }}
        />
      ))}
    </div>
  )
}
