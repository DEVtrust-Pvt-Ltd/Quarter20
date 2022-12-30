/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// Element of displayed assembly tree.
class AsmTreeItem extends Base {
  constructor(part) {
    super();

    this.views = [];
    this.parts = [];
    if (part) {
      this.parts.push(part);
      this.name = part.name;
    }
    if (app.assemblyTree) {
      const treeDetails = app.assemblyTree.tree.find((x) => x.parts.some((y) => y.obj3dName
      === part.obj3dName));
      this.views = treeDetails?.views;
    }
  }

  add(otherItem) {
    this.parts.splice(this.parts.length, 0, otherItem.parts);
  }

  countViews() {
    return this.views ? this.views.length : 0;
  }
}
