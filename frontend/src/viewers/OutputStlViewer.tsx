import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useLoader } from '@react-three/drei'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import * as THREE from 'three'
import { useStlStore } from '../store/stlStore'

function StlMesh({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url)
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const center = new THREE.Vector3()
  box.getCenter(center)
  geometry.translate(-center.x, -center.y, -center.z)

  return (
    <mesh>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color="#4ade80" metalness={0.2} roughness={0.7} />
    </mesh>
  )
}

export function OutputStlViewer() {
  const url = useStlStore((s) => s.outputStlUrl)

  return (
    <div className="viewer-container">
      <Canvas camera={{ position: [0, 0, 150], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 100]} intensity={1} />
        {url && (
          <Suspense fallback={null}>
            <StlMesh url={url} />
          </Suspense>
        )}
        <OrbitControls />
        <gridHelper args={[200, 20, '#333', '#222']} />
      </Canvas>
      {!url && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
          変換後のSTLがここに表示されます
        </div>
      )}
    </div>
  )
}
