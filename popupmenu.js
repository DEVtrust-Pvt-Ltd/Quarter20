/* eslint-disable no-shadow */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-undef */
class PopupMenu extends Base {
  constructor(items, onCommandFinish) {
    super();
    this.items = items;
    this.onCommandFinish = onCommandFinish;
  }

  // Open the menu.
  open(event, ...userArgs) {
    this.container = document.createElement("div");
    document.body.appendChild(this.container);
    this.container.className = "popupMenu";
    this.container.onmouseleave = () => this.close();

    for (const item of this.items) {
      const [text, isEnabled, handler] = item(event, ...userArgs);
      if (!isEnabled) continue;

      const itemElem = document.createElement("div");
      itemElem.className = "popupMenuItem";
      itemElem.innerText = text;
      this.container.appendChild(itemElem);

      if (!isEnabled) {
        itemElem.className = "disabled";
        continue;
      }

      const execItem = () => {
        this.close();
        handler(event, ...userArgs);
        if (this.onCommandFinish) this.onCommandFinish(event, item);
      };

      itemElem.onkeyup = (event) => {
        if (event.key === "Enter") execItem();
        if (event.key === "Escape") this.close();
      };

      itemElem.onclick = execItem;
    }

    let top = event.clientY - q20Cfg.popupMenuOffs[0];
    const bottom = top + this.container.offsetHeight;
    if (bottom > window.innerHeight) top = window.innerHeight - this.container.offsetHeight;

    this.container.style.top = `${top}px`;
    this.container.style.left = `${event.clientX - q20Cfg.popupMenuOffs[1]}px`;
  }

  // Close the menu.
  close() {
    if (!this.container) return;
    this.container.parentNode.removeChild(this.container);
    delete this.container;
  }
}

exportObj("PopupMenu", PopupMenu);
