import React, { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, TransformControls, useLoader, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import * as THREE from 'three'
import { useStlStore } from '../store/stlStore'

function StlMesh({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url)
  const meshRef = useRef<THREE.Mesh>(null!)
  const store = useStlStore()

  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const center = new THREE.Vector3()
  box.getCenter(center)
  geometry.translate(-center.x, -center.y, -center.z)

  return (
    <TransformControls
      mode="rotate"
      onObjectChange={() => {
        if (!meshRef.current) return
        const mat = meshRef.current.matrixWorld
        const e = mat.elements
        store.setRotationMatrix([
          [e[0], e[4], e[8],  e[12]],
          [e[1], e[5], e[9],  e[13]],
          [e[2], e[6], e[10], e[14]],
          [e[3], e[7], e[11], e[15]],
        ])
      }}
    >
      <mesh ref={meshRef}>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#60a5fa" metalness={0.2} roughness={0.7} />
      </mesh>
    </TransformControls>
  )
}

export function InputStlViewer() {
  const url = useStlStore((s) => s.inputStlUrl)
  const applyRotation = useStlStore((s) => s.applyAxisRotation)

  return (
    <div>
      <div className="viewer-container">
        <Canvas camera={{ position: [0, 0, 150], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 50, 150]} intensity={1} />
          {url && (
            <Suspense fallback={null}>
              <StlMesh url={url} />
            </Suspense>
          )}
          <OrbitControls makeDefault={false} />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
          <gridHelper args={[200, 20, '#333', '#222']} />
        </Canvas>
        {!url && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
            STLをアップロードしてください
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 8 }}>
        {(['x', 'y', 'z'] as const).map((axis) => (
          <React.Fragment key={axis}>
            <button className="btn-secondary" onClick={() => applyRotation(axis, 90)} disabled={!url}>
              {axis.toUpperCase()} +90°
            </button>
            <button className="btn-secondary" onClick={() => applyRotation(axis, -90)} disabled={!url}>
              {axis.toUpperCase()} -90°
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
