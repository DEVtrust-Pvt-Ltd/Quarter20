/* eslint-disable no-restricted-syntax */
/* eslint-disable no-return-assign */
/* eslint-disable no-use-before-define */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/// ////////////////////////////////////////////////////////////////////////
/// // Initialization, bootstrapping and UI-specific helper functions.

const pageCanvas = new fabric.Canvas("pageCanvas", { width: q20Cfg.pageSize[0] * q20Cfg.pxPerMm, height: q20Cfg.pageSize[1] * q20Cfg.pxPerMm });
pageCanvas.objectCaching = false;
pageCanvas.tabIndex = 1000;

const app = PetiteVue.reactive(new Q20.App());
app.setup();

const matches = window.location.href.match(/[?&]asm=([^?&#]+)/);
if (matches) app.load(matches[1]);

// Show the body that was hidden to avoid displaying unprocessed Vue markup.
document.body.style.visibility = "visible";

const treeMenu = new PopupMenu(
  [
    (event, item) => ["Move Up", app.asm.tree.findIndex((x) => x === item) > 0, () => moveItemUpDown(item, -1)],
    (event, item) => ["Move Down", app.asm.tree.findIndex((x) => x === item) < app.asm.tree.length - 1, () => moveItemUpDown(item, 1)],
    (event, item, part) => ["Pick Up", app.itemForMove !== item, () => (app.itemForMove = item)],
    (event, item, part) => ["Put Down", app.itemForMove && app.itemForMove !== item, () => moveItemHere(item)],
    (event, item, part) => ["Group", app.asm.getSelectedParts().length > 1, () => app.asm.groupSelected()],
    (event, item) => ["Ungroup", item.parts.length > 1, () => app.asm.ungroupItem(item)],
    (event, item, part) => ["Remove From Group", item.parts.length > 1, () => app.asm.ungroupItem(item, part)],
    (event, item, part) => [
      "Edit name",
      true,
      () => {
        app.startPartEdit(part, event.target);
        treeMenu.close();
      },
    ],
    ...["x", "y", "z"].map((axis) => (event, item, part) => [`Explode to ${axis.toUpperCase()}`, getActionableParts(part).length, () => app.setExplMode(getActionableParts(part), axis)]),
    (event, item, part) => ["Explode Freely", getActionableParts(part).length, () => app.setExplMode(getActionableParts(part), "f")],
    (event, item, part) => ["Explode Up in Current View", getActionableParts(part).length, () => app.setExplMode(getActionableParts(part), "u")],
    (event, item, part) => ["Disable Explosion", getActionableParts(part).length, () => app.setExplMode(getActionableParts(part))],
  ],
  () => app.viewer.render(true),
);

// Toggle button image based on a condition.
function toggleImgSrc(name, cond) {
  return `${name + (cond ? "" : "_off")}.svg`;
}

// Return parts to which an UI action would be applicable.
function getActionableParts(part) {
  const res = [part];
  for (const currPart of app.asm.getSelectedParts()) {
    if (currPart !== part) res.push(currPart);
  }
  return res;
}

// Move current item up or down one position.
function moveItemUpDown(item, offset) {
  app.asm.moveItem(item, offset);
  setTimeout(() => {
    // app.asm.updateStep();
    // app.updateViews();
    app.viewer.render();
  }, 10);
}

// Move picked-up above current item.
function moveItemHere(item) {
  const movedItem = app.itemForMove;
  delete app.itemForMove;

  const srcIdx = app.asm.tree.findIndex((x) => x === movedItem);
  const dstIdx = app.asm.tree.findIndex((x) => x === item);
  const offset = dstIdx - srcIdx;

  app.asm.moveItem(movedItem, offset);
  setTimeout(() => {
    // app.asm.updateStep();
    // app.updateViews();
    app.viewer.render(true);
  }, 10);
}

// Handle key press during part name editing.
function handlePartEditKey(key) {
  if (key === "Enter") app.finishPartEdit();
  if (key === "Escape") app.cancelPartEdit();
}

// Initialise and enable UI reactivity.
PetiteVue.createApp().mount();
