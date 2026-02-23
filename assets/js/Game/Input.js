/* ═══════════════════════════════════════════════════════════
   Game/Input.js  —  Teclado
   Equivalente al Keyboard.js de Bruno Simon
   ═══════════════════════════════════════════════════════════ */

class Input {
  constructor() {
    this.keys = new Set();
    window.addEventListener('keydown', e => {
      this.keys.add(e.key);
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))
        e.preventDefault();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key));
  }

  _p(...k) { return k.some(x => this.keys.has(x)); }

  get forward()  { return this._p('ArrowUp',   'w','W'); }
  get backward() { return this._p('ArrowDown', 's','S'); }
  get left()     { return this._p('ArrowLeft', 'a','A'); }
  get right()    { return this._p('ArrowRight','d','D'); }
  get action()   { return this._p('e','E'); }
  get jump()     { return this._p(' '); }
}