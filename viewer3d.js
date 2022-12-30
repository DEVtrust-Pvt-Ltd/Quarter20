/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-loop-func */
/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable no-undef */
// 3D work area display.
class Viewer3D extends Base {
  constructor() {
    super();

    this.raycaster = new THREE.Raycaster();
    this.mousePos = new THREE.Vector2();

    // Initialise camera and scene.
    this.camera = new THREE.PerspectiveCamera();
    this.camera.position.fromArray(q20Cfg.camInitPos);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene = new THREE.Scene();
    // this.scene.background = new THREE.Color(q20Cfg.viewerBgColor); // legacy background from before when background was white

    this.scene.add(this.camera);

    this.sceneAxes = new THREE.AxesHelper(q20Cfg.axesSize);
    this.sceneAxes.visible = false;
    this.scene.add(this.sceneAxes);

    // Add lights illuminating the assembly.
    this.camDirLight = new THREE.SpotLight(0xffffff, q20Cfg.camLightIntensity);
    this.camDirLight.castShadow = true;
    this.camDirLight.position.fromArray(q20Cfg.camLightPos);
    this.camera.add(this.camDirLight);

    // Setup material to be used for highlighted meshes.
    // this.highlMaterial = new THREE.MeshBasicMaterial({ color: q20Cfg.highlColor });

    if (q20Cfg.enableDebugMarker) {
      // Add a spherical marker for visual debugging of 3D vectors.
      this.debugMarker = new THREE.Mesh(new THREE.SphereGeometry(0.005, 32, 16), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      makeNonReactive(this.debugMarker);
      this.scene.add(this.debugMarker);
    }

    if (q20Cfg.enableDebugLine) {
      // Add a 3D line for visual debugging.
      this.debugLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x0000ff }));
      makeNonReactive(this.debugLine);
      this.scene.add(this.debugLine);
    }

    // By default, drag the same mesh that was clicked.
    this.getDragMesh = (x) => x;
  }

  // Setup event handlers for buttons in 3D viewer area.
  setupViewerButtons(domElem) {
    for (const axis of ["x", "y", "z"]) {
      domElem.querySelector(`#viewControls .${axis}Snap`).addEventListener("mousedown", () => this.snapToAxis(axis));
    }

    let repeatHandle;
    for (const dir of ["In", "Out"]) {
      const zoom = () => {
        const event = new MouseEvent("wheel"); // zoom w/mouse wheel
        event.deltaY = dir === "In" ? -1 : 1;
        event.deltaMode = 1;
        domElem.dispatchEvent(event);
        this.orbiter.update();
        this.render();
      };

      const button = domElem.querySelector(`#viewControls .zoom${dir}`);

      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        repeatHandle = window.setInterval(zoom, 20 / q20Cfg.zoomSpeed);
      });

      window.document.body.addEventListener("mouseup", () => {
        // eslint-disable-next-line no-restricted-globals
        event.preventDefault();
        window.clearInterval(repeatHandle);
      });
    }

    domElem.querySelector("#viewControls .button.reset").addEventListener("mousedown", () => this.initView());
  }

  // Setup the scene for showing axes orientation in separate viewport.
  setupAxesScene() {
    this.axes = new THREE.AxesHelper(q20Cfg.axesSize);
    const offset = -q20Cfg.axesSize / 5;
    this.axes.position.set(offset, offset, offset);

    this.axesScene = new THREE.Scene();
    this.axesScene.background = new THREE.Color(q20Cfg.axesBgColor);
    this.axesScene.add(this.axes);

    this.axesCamera = new THREE.OrthographicCamera(-q20Cfg.axesSize, q20Cfg.axesSize, q20Cfg.axesSize, -q20Cfg.axesSize, 0, Number.MAX_VALUE);
    this.axesCamera.position.set(300, 300, 300);
    this.axesCamera.lookAt(new THREE.Vector3());
  }

  // Setup the object responsible for moving the camera around.
  setupOrbiter() {
    this.orbiter = new THREE.TrackballControls(this.camera, this.domElem);
    this.orbiter.enableKeys = false;
    this.orbiter.screenSpacePanning = true;
    this.orbiter.staticMoving = true;
    this.orbiter.rotateSpeed = q20Cfg.rotateSpeed;
    this.orbiter.panSpeed = q20Cfg.panSpeed;

    // Update the view to reflect changes effected by orbit controls.
    // Normally orbit controls work om animation mode which constantly
    // updates the view, but here we must detect changes and update manually.

    const update = () => {
      if (this.axesCamera) {
        this.axesCamera.position.copy(this.camera.position);
        this.axesCamera.position.sub(this.orbiter.target);
        this.axesCamera.lookAt(new THREE.Vector3());
      }
      this.orbiter.update();
      this.render();
    };

    this.domElem.addEventListener("wheel", update, { passive: true });

    this.domElem.addEventListener("mousedown", () => {
      this.domElem.addEventListener("mousemove", update);
    });

    document.body.addEventListener("mouseup", () => {
      this.domElem.removeEventListener("mousemove", update);
    });
  }

  // Attach the viewer to a DOM element and setup event handlers.
  setup(domElem) {
    this.domElem = domElem;

    // Setup THREE.js renderer.
    const canvas = this.domElem.getElementsByTagName("canvas")[0];
    let context;
    try {
      context = canvas.getContext("webgl2");
      DEBUG("Using WebGL2");
    } catch (err) {
      context = canvas.getContext("webgl");
      DEBUG(`Could not use WebGL2 (${err}), falling back to WebGL`);
    }

    this.renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.setupOrbiter();
    this.setupAxesScene();
    this.initView();
    this.setupViewerButtons(this.domElem);
    this.updateSize();

    // Vue reactivity breaks or slows down Three.js objects. Disable it.
    for (const value of Object.values(this)) {
      if (value.isObject3D) makeNonReactive(value);
    }
  }

  // Set Object3d representing current assembly.
  setAsmObj3d(obj3d) {
    if (this.asmObj3d) this.scene.remove(this.asmObj3d);

    if (!obj3d) return;

    // Center the assembly on the origin by its bounding box.
    const bounds = new THREE.Box3().setFromObject(obj3d);
    const center = bounds.getCenter(new THREE.Vector3());
    obj3d.position.sub(center);

    this.scene.add(obj3d);
    this.asmObj3d = obj3d;
  }

  // Reset camera position and zoom to default values, then zoom to fit.
  initView() {
    this.orbiter.reset();

    if (this.asmObj3d) {
      // Zoom automatically based on assembly dimensions.

      const bounds = new THREE.Box3().setFromObject(this.asmObj3d);
      const boundsSizes = bounds.getSize(new THREE.Vector3());
      const boundsMaxSize = Math.max(...boundsSizes.toArray());

      this.camera.position.fromArray(q20Cfg.camInitPos);
      this.camera.zoom = q20Cfg.autoZoomFactor / boundsMaxSize;
      this.camera.updateProjectionMatrix();
    }

    this.render(true);
  }

  // Render the axes helper.
  renderAxes() {
    const mainViewport = this.renderer.getViewport(new THREE.Vector4());
    const size = q20Cfg.axesViewSize;
    const dim = [this.domElem.offsetWidth - size, 0, size, size];

    this.renderer.setViewport(...dim);
    this.renderer.setScissor(...dim);
    this.renderer.setScissorTest(true);
    this.renderer.render(this.axesScene, this.axesCamera);

    this.renderer.setScissorTest(false);
    this.renderer.setViewport(mainViewport);
  }

  // Render the scene.
  render(noDelay, hideTools) {
    if (!this.renderer) {
      WARN("Attempt to render without renderer");
      return;
    }

    if (noDelay) {
      this.renderer.render(this.scene, this.camera);
      if (!hideTools) this.renderAxes();
      this.isRenderPending = false;
      return;
    }

    if (this.isRenderPending) return;

    this.isRenderPending = true;
    window.requestAnimationFrame(() => this.render(true));
  }

  // Position camera so given axis goes into it, keeping distance from center.
  snapToAxis(axis) {
    const distance = this.camera.position.distanceTo(new THREE.Vector3());
    for (const currAxis of ["x", "y", "z"]) {
      if (currAxis === axis) {
        this.camera.position[currAxis] = distance;
        this.axesCamera.position[currAxis] = q20Cfg.axesSize;
      } else {
        this.camera.position[currAxis] = 0;
        this.axesCamera.position[currAxis] = 0;
      }
    }

    const upDir = axis === "y" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    this.camera.up.copy(upDir);
    this.axesCamera.up.copy(upDir);
    this.axesCamera.lookAt(new THREE.Vector3());

    this.orbiter.update();
    this.render(true);
  }

  // Set function to be called once on next object click.
  setNextObjClickHandler(nextHandler) {
    const savedHandler = this.onObjClick;
    this.onObjClick = (...args) => {
      nextHandler(...args);
      this.onObjClick = savedHandler;
    };
  }

  // Update size-dependent renderer parameters from DOM element sizes.
  updateSize() {
    const width = this.domElem.offsetWidth;
    const height = this.domElem.offsetHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Set current mouse position, used in various utility methods.
  updateMousePos(e) {
    if (this.mousePos) this.prevMousePos = this.mousePos.clone();

    const rect = this.domElem.getBoundingClientRect();
    this.mousePos.set((e.offsetX / rect.width) * 2 - 1, -(e.offsetY / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.mousePos, this.camera);
  }

  // Set highlight status of an obj3d and its children.
  setObj3dHighl(obj3d, isOn) {
    obj3d.traverse((mesh) => {
      if (!mesh.material) return;

      // Use existing material and just change the color when highlighted
      if (isOn && mesh.material.color.getHex() !== q20Cfg.highlColor) {
        mesh.userData.origMaterial = mesh.material;
        const highlMaterial = mesh.material.clone();
        highlMaterial.color.setHex(q20Cfg.highlColor);
        mesh.material = highlMaterial;
      } else if (!isOn && mesh.material.color.getHex() === q20Cfg.highlColor) {
        mesh.material = mesh.userData.origMaterial;
        delete mesh.userData.origMaterial;
      }

      // Original version that changes material entirely:
      // if (isOn && mesh.material != this.highlMaterial) {
      //   mesh.userData.origMaterial = mesh.material;
      //   mesh.material = this.highlMaterial;
      // }
      // else if (!isOn && mesh.material == this.highlMaterial) {
      //   mesh.material = mesh.userData.origMaterial;
      //   delete mesh.userData.origMaterial;
      // }
    });
  }

  // Remove specified mesh and associated objects, freeing memory.
  disposeOfMesh(topMesh) {
    topMesh.traverse((mesh) => {
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();

      let materials = mesh.material;
      if (!Array.isArray(materials)) materials = [materials];

      for (const material of materials) {
        material.dispose();

        for (const texture of Object.values(material)) {
          if (texture && typeof texture === "object" && texture.minFilter) texture.dispose();
        }
      }
    });
  }

  // Handle mousedown on the viewer wrapper element.
  handleMouseDown(event) {
    if (event.button !== 0) return;

    this.inClick = true;
    this.updateMousePos(event);

    const intersects = this.raycaster.intersectObject(this.asmObj3d, true);
    if (!intersects.length) return;
    this.clickedMesh = intersects[0].object;

    if (event.shiftKey) {
      const [dragMesh, dir] = this.getDragMesh(this.clickedMesh);
      if (dragMesh) this.startDrag(dragMesh, dir);
    } else this.onObjClick(event, intersects[0]);
  }

  // Handle mousedomove on the viewer wrapper element.
  handleMouseMove(event) {
    this.inClick = false;
    this.updateMousePos(event);

    if (!this.asmObj3d) return;

    const intersects = this.raycaster.intersectObject(this.asmObj3d, true);
    if (intersects.length) {
      const obj3d = intersects[0].object;
      if (obj3d !== this.pointedObj3d) {
        this.pointedObj3d = obj3d;
        this.onPointing();
      }
    } else {
      this.pointedObj3d = undefined;
      this.onPointing();
    }

    if (this.draggedMesh) this.updateDrag();
  }

  // Handle mouseup on the viewer wrapper element.
  handleMouseUp(event) {
    if (this.draggedMesh && this.onDragEnd) this.onDragEnd(event, this.draggedMesh);

    this.inClick = false;
    this.clickedMesh = null;
    this.draggedMesh = null;
    this.dragDir = null;
    this.orbiter.enabled = true;
    this.render();
  }

  // Start dragging a mesh, changing its world position. If THREE.Vector3 dir
  // is specified an is a non-zero Vector3, allow moving along it only.
  startDrag(mesh, dir) {
    this.orbiter.enabled = false; // avoid rotating view as we're dragging
    this.draggedMesh = mesh;
    this.dragDir = dir;
    this.dragStartPos = mesh.position.clone();
    this.dragWorldPosition = new THREE.Vector3();
    this.dragWorldPosition.setFromMatrixPosition(mesh.matrixWorld);

    this.dragPlane = new THREE.Plane();
    this.camera.getWorldDirection(this.dragPlane.normal);
    this.dragPlane.setFromNormalAndCoplanarPoint(this.dragPlane.normal, this.dragWorldPosition);

    // Mouse click will usually hit the mesh at some offset from its origin.
    // Account for this offset as the mouse moves, to avoid mesh "jump".

    const startPos = this.raycaster.ray.intersectPlane(this.dragPlane, new THREE.Vector3());
    this.draggedMeshOffs = this.draggedMesh.localToWorld(new THREE.Vector3());
    this.draggedMeshOffs.sub(startPos);
  }

  // Update mesh's world position based on mouse movement.
  updateDrag() {
    const oldWorldPos = this.draggedMesh.getWorldPosition(new THREE.Vector3());
    const newWorldPos = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, newWorldPos);
    newWorldPos.add(this.draggedMeshOffs);

    // Handle direction-constraining dragging for explosion.
    if (this.dragDir && !this.dragDir.equals(new THREE.Vector3())) {
      const delta = newWorldPos.clone().sub(oldWorldPos);
      delta.projectOnVector(this.dragDir);
      newWorldPos.copy(oldWorldPos).add(delta);
    }

    this.draggedMesh.position.copy(newWorldPos);
    this.draggedMesh.parent.worldToLocal(this.draggedMesh.position);

    if (this.onDragChange) this.onDragChange(this.draggedMesh, oldWorldPos, newWorldPos);
  }
}
exportObj("Viewer3D", Viewer3D);
