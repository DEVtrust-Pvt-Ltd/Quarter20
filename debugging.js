/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// A place for helper functions that shouldn't last forever :)

function downloadCurrentPageJSON() {
  const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(app.currPage.canvasJSON))}`;
  const dlAnchorElem = document.createElement("a");
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", "scene.json");
  dlAnchorElem.click();
}
