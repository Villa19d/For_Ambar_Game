/* ═══════════════════════════════════════════════════════════
   Game/Camera.js  —  Cámara
   Equivalente al View.js de Bruno Simon
   • Modo SEGUIMIENTO: detrás del carro
   • Modo ÓRBITA: click derecho para rotar libremente
   ═══════════════════════════════════════════════════════════ */

class GameCamera {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;

    this.zoom = 1.7;   // alejado al inicio, el usuario puede ajustar con scroll
    this.offset = new THREE.Vector3(0, 8, 11);

    // Estado de órbita (Bruno tiene algo similar en su View.js)
    this.orbit = {
      active:    false,
      theta:     0,
      phi:       0.4,
      prevX:     0,
      prevY:     0,
      returning: false,
      returnT:   0,
    };

    const SENS    = 0.006;
    const PHI_MIN = 0.15;
    const PHI_MAX = 1.35;

    // Scroll → zoom
    window.addEventListener('wheel', e => {
      this.zoom += e.deltaY * 0.001;
      this.zoom  = Math.max(0.4, Math.min(2.8, this.zoom));
    }, { passive: true });

    // Click derecho → órbita
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('mousedown', e => {
      if (e.button !== 2) return;
      this.orbit.active    = true;
      this.orbit.returning = false;
      this.orbit.prevX     = e.clientX;
      this.orbit.prevY     = e.clientY;
      canvas.style.cursor  = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
      if (!this.orbit.active) return;
      this.orbit.theta -= (e.clientX - this.orbit.prevX) * SENS;
      this.orbit.phi   += (e.clientY - this.orbit.prevY) * SENS;
      this.orbit.phi    = Math.max(PHI_MIN, Math.min(PHI_MAX, this.orbit.phi));
      this.orbit.prevX  = e.clientX;
      this.orbit.prevY  = e.clientY;
    });

    window.addEventListener('mouseup', e => {
      if (e.button !== 2 || !this.orbit.active) return;
      this.orbit.active    = false;
      this.orbit.returning = true;
      this.orbit.returnT   = 0;
      canvas.style.cursor  = '';
    });

    // Touch para mobile
    let _touch = null;
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length !== 2) return;
      _touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.orbit.active = true; this.orbit.returning = false;
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      if (e.touches.length !== 2 || !_touch) return;
      this.orbit.theta -= (e.touches[0].clientX - _touch.x) * SENS * 1.5;
      this.orbit.phi   += (e.touches[0].clientY - _touch.y) * SENS * 1.5;
      this.orbit.phi    = Math.max(PHI_MIN, Math.min(PHI_MAX, this.orbit.phi));
      _touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
      if (e.touches.length < 2 && this.orbit.active) {
        this.orbit.active = false; this.orbit.returning = true; this.orbit.returnT = 0; _touch = null;
      }
    });

    // Helpers reutilizables
    this._pos  = new THREE.Vector3();
    this._look = new THREE.Vector3();
  }

  update(dt, vehicle) {
    const yaw        = vehicle.yaw;
    const carPos     = vehicle.group.position;
    const speedRatio = Math.min(vehicle.speed / CFG.speed, 1);

    const zDist = this.offset.z * this.zoom;
    const zY    = this.offset.y * this.zoom;

    if (this.orbit.active) {
      // ── ÓRBITA ───────────────────────────────────────────────
      const R = zDist;
      this._pos.set(
        carPos.x - R * Math.sin(this.orbit.theta) * Math.cos(this.orbit.phi),
        carPos.y + R * Math.sin(this.orbit.phi),
        carPos.z - R * Math.cos(this.orbit.theta) * Math.cos(this.orbit.phi)
      );
      this.camera.position.lerp(this._pos, 0.35);
      this.camera.lookAt(carPos.x, carPos.y + 1, carPos.z);

    } else if (this.orbit.returning) {
      // ── RETORNO suave a seguimiento ──────────────────────────
      this.orbit.returnT += dt * 1.5;
      if (this.orbit.returnT >= 1) { this.orbit.returning = false; this.orbit.returnT = 1; }

      this.orbit.theta += (0 - this.orbit.theta) * dt * 3.0;
      this.orbit.phi   += (0.4 - this.orbit.phi) * dt * 3.0;

      const R = zDist;
      const orbitPos = new THREE.Vector3(
        carPos.x - R * Math.sin(this.orbit.theta) * Math.cos(this.orbit.phi),
        carPos.y + R * Math.sin(this.orbit.phi),
        carPos.z - R * Math.cos(this.orbit.theta) * Math.cos(this.orbit.phi)
      );
      const followPos = new THREE.Vector3(
        carPos.x + Math.sin(yaw) * zDist,
        carPos.y + zY,
        carPos.z + Math.cos(yaw) * zDist
      );
      this._pos.lerpVectors(orbitPos, followPos, this.orbit.returnT);
      this.camera.position.lerp(this._pos, 0.12);
      this.camera.lookAt(carPos.x, carPos.y + 0.8, carPos.z);

    } else {
      // ── SEGUIMIENTO ──────────────────────────────────────────
      this._pos.set(
        carPos.x + Math.sin(yaw) * zDist,
        carPos.y + zY,
        carPos.z + Math.cos(yaw) * zDist
      );

      const adaptiveLerp = CFG.camLerp + speedRatio * 0.18;
      this.camera.position.lerp(this._pos, adaptiveLerp);

      const laDist = 2.0 * speedRatio;
      this._look.set(
        carPos.x - Math.sin(yaw) * laDist,
        carPos.y + 0.8,
        carPos.z - Math.cos(yaw) * laDist
      );
      this.camera.lookAt(this._look);

      // Sincronizar theta para que la órbita empiece desde la posición correcta
      this.orbit.theta = yaw + Math.PI;
      this.orbit.phi   = 0.4;
    }
  }
}