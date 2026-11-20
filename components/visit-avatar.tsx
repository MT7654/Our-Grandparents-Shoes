"use client"
import { useEffect, useRef, useState } from "react"
import type { Object3D, AnimationMixer, AnimationClip, Mesh } from "three"

export function VisitAvatar({
  expression,
  gesture
}: {
  expression: string
  gesture: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const [still, setStill] = useState(true)
  const [ready, setReady] = useState(false)
  const model = useRef<{
    root: Object3D
    mixer: AnimationMixer
    clips: AnimationClip[]
  } | null>(null)
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)")
    const update = () =>
      setStill(media.matches || localStorage.getItem("visit-still") === "yes")
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  useEffect(() => {
    if (still || process.env.NEXT_PUBLIC_DISABLE_VISIT_3D === "1") return
    const el = host.current
    if (!el) return
    let cancelled = false
    let dispose = () => {}
    async function load() {
      const [T, { GLTFLoader }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/loaders/GLTFLoader.js")
      ])
      if (cancelled || !el) return
      const renderer = new T.WebGLRenderer({ alpha: true, antialias: true })
      const canvas = renderer.domElement
      el.appendChild(canvas)
      const lost = () => setReady(false)
      canvas.addEventListener("webglcontextlost", lost)
      const scene = new T.Scene(),
        camera = new T.PerspectiveCamera(35, 1, 0.1, 50)
      camera.position.set(0, 0.52, 3.4)
      camera.lookAt(0, 0.36, 0)
      scene.add(new T.HemisphereLight(0xfff4d9, 0xe4d3c6, 2))
      const lamp = new T.DirectionalLight(0xffead4, 2)
      lamp.position.set(2, 4, 4)
      scene.add(lamp)
      const resize = new ResizeObserver(() => {
        if (!el.clientHeight) return
        renderer.setSize(el.clientWidth, el.clientHeight)
        camera.aspect = el.clientWidth / el.clientHeight
        camera.updateProjectionMatrix()
      })
      resize.observe(el)
      dispose = () => {
        resize.disconnect()
        renderer.setAnimationLoop(null)
        canvas.removeEventListener("webglcontextlost", lost)
        renderer.dispose()
        canvas.remove()
        model.current = null
      }
      const gltf = await new GLTFLoader().loadAsync("/visit/margaret.glb")
      const release = () =>
        gltf.scene.traverse((o) => {
          const mesh = o as Mesh
          if (mesh.isMesh) {
            mesh.geometry.dispose()
            const materials = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material]
            materials.forEach((m) => m.dispose())
          }
        })
      if (cancelled) {
        release()
        return
      }
      const cleanup = dispose
      dispose = () => {
        cleanup()
        release()
      }
      scene.add(gltf.scene)
      const mixer = new T.AnimationMixer(gltf.scene)
      model.current = { root: gltf.scene, mixer, clips: gltf.animations }
      let last = performance.now()
      renderer.setAnimationLoop((now) => {
        mixer.update(Math.min(0.1, (now - last) / 1000))
        last = now
        renderer.render(scene, camera)
      })
      setReady(true)
    }
    load().catch(() => {
      if (!cancelled) {
        dispose()
        dispose = () => {}
        setReady(false)
      }
    })
    return () => {
      cancelled = true
      dispose()
      setReady(false)
    }
  }, [still])
  useEffect(() => {
    const m = model.current
    if (!m || !ready) return
    m.root.traverse((o) => {
      const mesh = o as Mesh
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        mesh.morphTargetInfluences.fill(0)
        const idx = mesh.morphTargetDictionary[expression]
        if (idx !== undefined) mesh.morphTargetInfluences[idx] = 1
      }
    })
    m.mixer.stopAllAction()
    const clip = m.clips.find((c) => c.name === gesture)
    if (clip) {
      const action = m.mixer.clipAction(clip)
      action.repetitions = 1
      action.reset().play()
    }
  }, [ready, expression, gesture])
  return (
    <>
      <div
        ref={host}
        aria-hidden="true"
        style={{ background: "center / cover url(/visit/flat.webp)" }}
        className={"absolute inset-0 " + (ready ? "" : "invisible")}
      />
      <button
        className="absolute right-2 top-2 rounded bg-white px-2 py-1 text-sm"
        aria-pressed={still}
        onClick={() => {
          localStorage.setItem("visit-still", still ? "no" : "yes")
          setStill(!still)
        }}
      >
        Still image
      </button>
    </>
  )
}
