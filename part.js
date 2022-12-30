/* eslint-disable no-throw-literal */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// Part of the assembly.
class Part extends Base {
  constructor(name, obj3dName, isSelected = false) {
    super();
    if (!name) return;

    this.name = name;
    this.obj3dName = obj3dName;
    this.isSelected = isSelected;
    this.isHidden = false;
  }

  // Set the display name of part.
  setName(name) {
    if (!name.match(/\S/)) throw "Cannot set part name to empty string";
    this.name = name.trim();
  }

  // Return the part as a plain JS object.
  serialize() {
    const res = super.serialize();
    if (this.explDir) res.explDir = this.explDir.toArray();

    return res;
  }

  // Restore the part from plain JS object.
  deserialize(serialized) {
    super.deserialize(serialized);
    if (this.explDir) this.explDir = new THREE.Vector3().fromArray(this.explDir);

    return this;
  }
}
