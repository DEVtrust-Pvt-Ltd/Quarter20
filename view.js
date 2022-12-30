/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-undef */
/* eslint-disable no-bitwise */
// From https://ourcodeworld.com/articles/read/683/how-to-remove-the-transparent-pixels-that-surrounds-a-canvas-in-javascript
// MIT http://rem.mit-license.org
function trimCanvas(c) {
  const ctx = c.getContext("2d");
  const copy = document.createElement("canvas").getContext("2d");
  const pixels = ctx.getImageData(0, 0, c.width, c.height);
  const l = pixels.data.length;
  let i;
  const bound = {
    top: null,
    left: null,
    right: null,
    bottom: null,
  };
  let x;
  let y;

  // Iterate over every pixel to find the highest
  // and where it ends on every axis ()
  for (i = 0; i < l; i += 4) {
    if (pixels.data[i + 3] !== 0) {
      x = (i / 4) % c.width;
      y = ~~(i / 4 / c.width);

      if (bound.top === null) {
        bound.top = y;
      }

      if (bound.left === null) {
        bound.left = x;
      } else if (x < bound.left) {
        bound.left = x;
      }

      if (bound.right === null) {
        bound.right = x;
      } else if (bound.right < x) {
        bound.right = x;
      }

      if (bound.bottom === null) {
        bound.bottom = y;
      } else if (bound.bottom < y) {
        bound.bottom = y;
      }
    }
  }

  // Calculate the height and width of the content
  const trimHeight = bound.bottom - bound.top;
  const trimWidth = bound.right - bound.left;
  const trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

  copy.canvas.width = trimWidth;
  copy.canvas.height = trimHeight;
  copy.putImageData(trimmed, 0, 0);

  // Return trimmed canvas
  return copy.canvas;
}

// State of the viewer and scene defining an image (screenshot).
class View extends Base {
  constructor(layout, viewer, callback) {
    super();

    this.layout = {};
    if (layout) {
      for (const id in layout) this.layout[id] = [...layout[id]];
    }

    if (viewer) this.update(viewer, callback);

    // eslint-disable-next-line new-cap
    this.uuid = uuidv4(); // Used for matching fabric.js screenshots to views
  }

  // Update the view based on viewer state.
  update(viewer, callback) {
    const canvasElem = viewer.renderer.domElement;
    this.imageDims = [canvasElem.width, canvasElem.height];
    this.target = viewer.orbiter.target.clone();
    this.pos = viewer.camera.position.clone();
    this.up = viewer.camera.up.clone();
    this.zoom = viewer.camera.zoom;

    viewer.render(true, true);

    // Create screenshot of view
    const resizedCanvas = document.createElement("canvas");
    const resizedContext = resizedCanvas.getContext("2d");
    resizedCanvas.height = canvasElem.height; // For now, not actually resized - but can do scaling here if needed
    resizedCanvas.width = canvasElem.width;
    resizedContext.drawImage(canvasElem, 0, 0, canvasElem.width, canvasElem.height);

    const trimmedCanvas = trimCanvas(resizedCanvas); // Trim off any transparent "white" space
    this.dataUrl = trimmedCanvas.toDataURL();

    // this.dataUrl = resizedCanvas.toDataURL();
    // this.dataUrl = canvasElem.toDataURL();

    if (callback) callback(this);
  }

  // Apply the view to a viewer object.
  apply(viewer) {
    if (!this.target) return;

    viewer.orbiter.position0.copy(this.pos);
    viewer.orbiter.target0.copy(this.target);
    viewer.orbiter.up0.copy(this.up);
    viewer.orbiter.reset();

    viewer.camera.zoom = this.zoom;
    viewer.camera.updateProjectionMatrix();
    viewer.render(true);
  }

  // Copy object settings from given one.
  copy(src) {
    this.dataUrl = src.dataUrl;
    this.zoom = src.zoom;

    for (const field of ["target", "pos", "up"]) {
      if (src[field]) this[field] = src[field].clone();
      else delete this[field];
    }
  }

  // Return a new object copied from current.
  clone() {
    const clone = new View(this.layout);
    clone.dataUrl = this.dataUrl;
    clone.zoom = this.zoom;

    for (const field of ["target", "pos", "up"]) {
      if (this[field]) clone[field] = this[field].clone();
    }

    return clone;
  }

  // Return the view as a plain JS object.
  serialize() {
    const res = super.serialize();
    for (const field of ["target", "pos", "up"]) res[field] = this[field].toArray();

    return res;
  }

  // Restore the view from plain JS object.
  deserialize(serialized) {
    super.deserialize(serialized);
    for (const field of ["target", "pos", "up"]) this[field] = new THREE.Vector3().fromArray(serialized[field]);

    return this;
  }
}
exportObj("View", View);
