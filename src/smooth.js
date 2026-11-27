import * as THREE from 'three'

// The 1 Euro filter (Casiez, Roussel & Vogel, CHI 2012): a low-pass filter
// whose cutoff rises with speed. Moving slowly: heavy smoothing, no jitter.
// Moving fast: light smoothing, no lag.
class OneEuro {
  constructor(minCutoff, beta, derivativeCutoff = 1) {
    this.minCutoff = minCutoff
    this.beta = beta
    this.derivativeCutoff = derivativeCutoff
    this.x = null
  }

  static alpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff)
    return 1 / (1 + tau / dt)
  }

  filter(x, time) {
    if (this.x === null) {
      this.x = x
      this.speed = 0
      this.time = time
      return x
    }
    const dt = Math.max(time - this.time, 1e-3)
    this.time = time
    this.speed += OneEuro.alpha(this.derivativeCutoff, dt) * ((x - this.x) / dt - this.speed)
    const cutoff = this.minCutoff + this.beta * Math.abs(this.speed)
    this.x += OneEuro.alpha(cutoff, dt) * (x - this.x)
    return this.x
  }
}

// Smooths the head's pose: position (cm) and rotation (a quaternion), each
// number through its own 1 Euro filter.
export class PoseSmoother {
  // tuned on a real 8 s clip (2026-11-28): beta 0.05 trailed fast turns by up
  // to 2.5 cm; 0.2 halves that lag. A still head still gets full smoothing.
  constructor({ minCutoff = 1.5, beta = 0.2, rotationBeta = 2 } = {}) {
    this.options = { minCutoff, beta, rotationBeta }
    this.reset()
  }

  reset() {
    const { minCutoff, beta, rotationBeta } = this.options
    this.position = [0, 1, 2].map(() => new OneEuro(minCutoff, beta))
    this.rotation = [0, 1, 2, 3].map(() => new OneEuro(minCutoff, rotationBeta))
    this.size = new OneEuro(minCutoff, beta)
    this.lastRotation = null
  }

  // data: the matrix's 16 numbers; time: seconds. Returns the steady 16 numbers.
  filter(data, time) {
    const matrix = new THREE.Matrix4().fromArray(data)
    const position = new THREE.Vector3()
    const rotation = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    matrix.decompose(position, rotation, scale)

    // q and -q are the same turn: keep the sign continuous so the filter doesn't flip
    if (this.lastRotation && rotation.dot(this.lastRotation) < 0) {
      rotation.set(-rotation.x, -rotation.y, -rotation.z, -rotation.w)
    }

    position.fromArray(position.toArray().map((v, i) => this.position[i].filter(v, time)))
    rotation.fromArray(rotation.toArray().map((v, i) => this.rotation[i].filter(v, time))).normalize()
    scale.setScalar(this.size.filter((scale.x + scale.y + scale.z) / 3, time))
    this.lastRotation = rotation.clone()

    return matrix.compose(position, rotation, scale).toArray()
  }
}
