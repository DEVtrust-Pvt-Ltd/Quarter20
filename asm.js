/* eslint-disable class-methods-use-this */
/* eslint-disable no-continue */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// The assembly being worked on.
class Asm extends Base {
  constructor(gltf, rawGltf) {
    super();
    this.parts = [];
    this.tree = [];

    if (!gltf) return;

    this.rawGltf = rawGltf;
    this.setRootObj3d(gltf.scene);
    this.rootObj3d.traverse((obj3d) => {
      if (obj3d === this.rootObj3d || !obj3d.isGroup) return;

      const childNames = obj3d.children.map((x) => x.userData.name);
      const childPrefix = this.findCommonPrefix(childNames);
      const name = childPrefix.length > 1 ? childPrefix : obj3d.userData.name;
      if (app.assemblyTree) {
        this.parts = app.assemblyTree.parts;
      } else {
        this.parts.push(new Part(name, obj3d.name));
      }
    });
    if (app.assemblyTree) {
      const partData = [];
      app.assemblyTree.tree.forEach((i) => {
        const c = this.parts.find((x) => x.obj3dName === i.parts[0].obj3dName);
        partData.push(c);
      });
      this.tree = partData.map((x) => new AsmTreeItem(x));
      this.origLayout = this.getLayout(); // never changed
    } else {
      this.parts.sort((a, b) => a.name.localeCompare(b.name));
      this.tree = this.parts.map((x) => new AsmTreeItem(x));
      this.origLayout = this.getLayout(); // never changed
    }
    // this.parts.sort((a, b) => a.name.localeCompare(b.name));
    // this.tree = this.parts.map((x) => new AsmTreeItem(x));
    // this.origLayout = this.getLayout(); // never changed
  }

  // Prepare and set Object3D tree containing assembly. Mutates objects in tree.
  setRootObj3d(obj3d) {
    App.setObj3dNamesByPaths(obj3d);
    makeNonReactive(obj3d);
    this.rootObj3d = obj3d;
  }

  // Return assembly representation as a plain JS object.
  async serialize() {
    const serParts = this.parts.map((x) => x.serialize());
    const serItems = [];

    for (const item of this.tree) {
      const serItem = {
        name: item.name,
        views: item.views.map((x) => x.serialize()),
        partIndices: [],
      };
      for (const part of item.parts) serItem.partIndices.push(this.parts.findIndex((x) => x === part));
      serItems.push(serItem);
    }

    // eslint-disable-next-line no-sequences
    const rawGltfBase64 = btoa(new Uint8Array(this.rawGltf).reduce((data, byte) => (data.push(String.fromCharCode(byte)), data), []).join(""));

    return {
      rawGltfBase64,
      items: serItems,
      parts: serParts,
      origLayout: { ...this.origLayout },
    };
  }

  // Initialize the assembly from serialized data.
  async deserialize(serialized) {
    const gltfLoader = new THREE.GLTFLoader();
    this.rawGltf = Uint8Array.from(atob(serialized.rawGltfBase64), (c) => c.charCodeAt(0)).buffer;

    const rootObj3d = (await gltfLoader.parseAsync(this.rawGltf)).scene;
    this.setRootObj3d(rootObj3d);

    this.parts = serialized.parts.map((x) => new Part().deserialize(x));
    this.origLayout = { ...serialized.origLayout };

    for (const serItem of serialized.items) {
      const item = new AsmTreeItem();
      item.name = serItem.name;
      // eslint-disable-next-line no-loop-func
      item.views = serItem.views.map((x) => new View().deserialize(x));
      item.parts = serItem.partIndices.map((x) => this.parts[x]);
      this.tree.push(item);
    }

    return this;
  }

  // Find common prefix in a list of strings, strip trailing underscores from it.

  findCommonPrefix(names) {
    let res = names[0];
    for (let i = 1; i < names.length; i++) {
      for (let j = 0; j < res.length; j++) {
        if (names[i][j] !== res[j]) {
          res = res.substring(0, j);
          break;
        }
      }
    }

    return res.replace(/_+$/, "");
  }

  // Toggle selection status of parts.
  togglePartsSelection(parts, isSticky) {
    const newIsSelected = parts.map((x) => !x.isSelected);
    if (!isSticky) this.deselectAll();

    for (let i = 0; i < parts.length; i++) parts[i].isSelected = newIsSelected[i];
  }

  // Return object mapping part 3d object names to their orientation matrices.
  getLayout() {
    const res = {};
    for (const part of this.parts) res[part.obj3dName] = this.getPartObj(part).position.toArray();
    return res;
  }

  // Apply part object orientation matrices.
  setLayout(layout) {
    for (const part of this.parts) this.getPartObj(part).position.fromArray(layout[part.obj3dName]);
  }

  // Deselect all tree items.
  deselectAll() {
    for (const part of this.parts) part.isSelected = false;
  }

  // Return selected parts.
  getSelectedParts() {
    const orderedParts = this.tree.flatMap((x) => x.parts);
    return orderedParts.filter((x) => x.isSelected);
  }

  // Return Object3D representing given part.
  getPartObj(part) {
    return this.rootObj3d.getObjectByName(part.obj3dName);
  }

  // Return assembly item containing given part.
  getPartItem(part) {
    return this.tree.find((x) => x.parts.some((y) => y === part));
  }

  // Combine selected parts into a single item.
  groupSelected() {
    let parent;
    const newTree = [];

    for (const curr of this.tree) {
      if (!curr.parts[0].isSelected) {
        newTree.push(curr);
        continue;
      }
      if (!parent) {
        parent = curr;
        newTree.push(parent);
        continue;
      }
      parent.parts.push(...curr.parts);
    }

    this.tree = newTree;
    this.updateStep();
  }

  // Remove a part from item. If partToUngroup is null, remove all but first.
  ungroupItem(item, partToUngroup) {
    if (partToUngroup && item.parts.length > 1) {
      // First add then remove, or reactivity may not work correctly.

      const itemIdx = this.tree.findIndex((x) => x === item);
      const newItem = new AsmTreeItem(partToUngroup);
      this.tree.splice(itemIdx + 1, 0, newItem);

      const partIdx = item.parts.findIndex((x) => x === partToUngroup);
      item.parts.splice(partIdx, 1);
      return;
    }

    const newTree = [];
    for (const curr of this.tree) {
      if (curr !== item) {
        newTree.push(curr);
        continue;
      }

      for (const part of curr.parts) {
        const newItem = new AsmTreeItem(part);
        newTree.push(newItem);
      }
    }

    this.tree = newTree;
  }

  // Move item up or down in the tree.
  moveItem(item, offset) {
    const index = this.tree.findIndex((x) => x === item);
    const newIndex = index + offset;

    if (newIndex < 0 || newIndex >= this.tree.length) return;

    const newTree = [...this.tree];
    newTree.splice(newIndex, 0, newTree.splice(index, 1)[0]);
    for (let i = index; i !== newIndex; i += offset > 0 ? 1 : -1) {
      for (const view of this.tree[i].views) { if (app.currPage) app.currPage.updateViewsOnPage(view); }
    }
    this.tree = newTree;
  }

  // Move view up or down in the item.
  moveView(view, item, offset) {
    const index = item.views.findIndex((x) => x === view);
    const newIndex = index + offset;

    if (newIndex >= 0 && newIndex < item.views.length) item.views.splice(newIndex, 0, item.views.splice(index, 1)[0]);
  }

  // Return string identifying view's parent item and the position in it.
  getViewPath(soughtView, itemOnly) {
    for (const [i, item] of this.tree.entries()) {
      for (const [j, view] of item.views.entries()) {
        if (view.dataUrl === soughtView.dataUrl) return itemOnly ? i : `${i + 1}.${j + 1}`;
      }
    }
    return " ";
  }

  // Set visibility of an assembly part.
  setVisibility(part, isVisible) {
    part.isHidden = !isVisible;
    this.getPartObj(part).traverse((obj3d) => {
      if (isVisible) obj3d.layers.enableAll();
      else obj3d.layers.disableAll();
    });
  }

  // Set the assembling step to last selected part. If no part is selected,
  // set it to the last part in assembly.
  updateStep() {
    const selected = this.getSelectedParts();
    const lastPart = lastArrElem(selected) || lastArrElem(lastArrElem(this.tree).parts);

    let isAfter;
    for (const item of this.tree) {
      for (const part of item.parts) {
        this.setVisibility(part, !isAfter);
        if (!isAfter && part === lastPart) isAfter = true;
      }
    }
  }
}
