/* eslint-disable func-names */
/* eslint-disable no-console */
/* eslint-disable consistent-return */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-expressions */

/* eslint-disable max-len */

/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// One page of instructions.

let pageTemplateJSON = "";

fetch("page_templates/base.json")
  .then((res) => res.json())
  .then((data) => {
    pageTemplateJSON = data;
  })
  .catch((err) => {
    console.error("Error: ", err);
  });

// const pageTemplateJSON = await fetch("page_templates/base.json", { method: "GET" });
class Page extends Base {
  constructor(pageNumber, uniqueKey) {
    super();
    this.text = "";
    this.views = [];
    this.hasNewUpdates = false; // true if updates weren't yet shown to user
    this.canvasJSON = pageTemplateJSON;
    this.pageNumber = pageNumber;
    this.uniqueKey = uniqueKey;
    this.nextAvailableTemplateViewIndex = 1;
    this.topValue = 154.75;
    this.titleNameRollBack = "";
    this.versionNameRollBack = "";
    this.lastPositionFilled = false;
    this.availablePointsTODraw = [
      {
        index: 1, isAvailable: true, id: null, path: null,
      },
      {
        index: 2, isAvailable: true, id: null, path: null,
      },
      {
        index: 3, isAvailable: true, id: null, path: null,
      },
      {
        index: 4, isAvailable: true, id: null, path: null,
      },
      {
        index: 5, isAvailable: true, id: null, path: null,
      },
    ];
  }

  getFabricObjectByUUID(u) {
    let object = null;
    const objects = pageCanvas.getObjects();
    for (let i = 0, len = pageCanvas.size(); i < len; i++) {
      if (objects[i].view_uuid && objects[i].view_uuid === u) {
        object = objects[i];
        break;
      }
    }

    return object;
  }

  getFabricObjectByTemplateIndex(index) {
    let object = null;
    const objects = pageCanvas.getObjects();
    for (let i = 0, len = pageCanvas.size(); i < len; i++) {
      if (objects[i].template_index && objects[i].template_index === index) {
        object = objects[i];
        break;
      }
    }

    return object;
  }

  getFabricObjectByTemplateRole(role) {
    let object = null;
    const objects = pageCanvas.getObjects();
    for (let i = 0, len = pageCanvas.size(); i < len; i++) {
      if (objects[i].template_role && objects[i].template_role === role) {
        object = objects[i];
        break;
      }
    }

    return object;
  }

  addViewOnPage(view) {
    if (view) {
      // console.log(`view with uuid${view.uuid}`);
      const viewPath = app.asm.getViewPath(view);
      // When Assembly tree is dynamic then impliment this.
      let fabricImg = this.getFabricObjectByUUID(view.uuid); // Find existing matching image, if already added
      // if (fabricImg) {
      //   const indx = this.views.findIndex((vw) => vw.uuid === view.uuid);
      //   this.deleteObject(view.uuid);
      //   this.views.splice(indx, 0, view);
      // }
      const posForDrawing = this.availablePointsTODraw.find((pt) => pt.isAvailable === true);
      const isImageHasAlreadyPos = this.availablePointsTODraw.find((pt) => pt.id === view.uuid && pt.path === viewPath);
      const indexOfViewPos = isImageHasAlreadyPos ? isImageHasAlreadyPos.index - 1 : posForDrawing.index - 1;
      this.availablePointsTODraw[indexOfViewPos].id = view.uuid;
      this.availablePointsTODraw[indexOfViewPos].path = viewPath;
      this.availablePointsTODraw[indexOfViewPos].isAvailable = false;
      const isImageExist = fabricImg;
      if (!fabricImg) {
        fabricImg = this.getFabricObjectByTemplateIndex(posForDrawing?.index);
        if (!fabricImg) {
          console.log("No available spot in template");
        }
      }
      if (fabricImg) {
        pageCanvas.getObjects().forEach((obj) => {
          if (obj.view_uuid === view.uuid) {
            pageCanvas.remove(obj);
          }
        });
      }

      const viewPartDetails = app.getPagePartsDescr(app.currPage);
      let partData = this.getFabricObjectByTemplateRole("Part_details");
      if (!partData) {
        // Initiate a textbox object
        partData = new fabric.Textbox(viewPartDetails, {
          top: this.topValue,
          left: 59.34,
          width: 650.1,
          fontSize: 20,
          padding: 10,
          selectable: false,
          template_role: "Part_details",
          fontFamily: "Times New Roman",
          splitByGrapheme: true,
          absolutePosition: true,
        });
        pageCanvas.add(partData);
      }
      partData.text = viewPartDetails;
      // Set Part name and Qty
      if (viewPath && fabricImg) {
        console.log("matching image found");
        fabric.Image.fromURL(view.dataUrl, (img) => {
          img.scaleToWidth(300);
          img.left = isImageExist ? fabricImg.left : fabricImg.left - 100;
          img.top = isImageExist ? fabricImg.top : fabricImg.top - 100;
          img.setControlsVisibility({
            // Don't allow non-unform scaling of image
            mt: false,
            mb: false,
            ml: false,
            mr: false,
          });

          const text = new fabric.Text(viewPath, {
            left: isImageExist ? fabricImg.left : fabricImg.left - 100,
            top: isImageExist ? fabricImg.top : fabricImg.top - 100,
            fontSize: 15,
            fontFamily: "Verdana",
            fill: "black",
            id: view.uuid,
          });
          const group = new fabric.Group([img, text], {
            view_uuid: view.uuid,
          });
          pageCanvas.add(group);
          pageCanvas.requestRenderAll();

          this.availablePointsTODraw[indexOfViewPos].isAvailable = false;
        });
        return;
      } if (viewPath && posForDrawing.index === 5 && !fabricImg) {
        this.lastPositionFilled = true;
        this.availablePointsTODraw[4].isAvailable = false;
        console.log("no matching image found");
        fabric.Image.fromURL(view.dataUrl, (img) => {
          img.scaleToWidth(300);
          img.setControlsVisibility({
            // Don't allow non-unform scaling of image
            mt: false,
            mb: false,
            ml: false,
            mr: false,
          });
          // add the group to canvas
          const text = new fabric.Text(viewPath, {
            left: 0,
            top: 0,
            fontSize: 15,
            fontFamily: "Verdana",
            fill: "black",
          });
          const group = new fabric.Group([img, text], {
            view_uuid: view.uuid,
            index: posForDrawing.index - 1,
          });
          pageCanvas.add(group);
        });
      }
      pageCanvas.renderAll();
      pageCanvas.fire("after:rendered");
    }
  }

  // Next, define a function to create the tooltip
  createTooltip(text, textbox) {
  // Create a new textbox for the tooltip
    const tooltip = new fabric.IText(text, {
      left: textbox.left - 65,
      top: textbox.top + textbox.height + 5,
      fill: "#000",
      fontFamily: "Times New Roman",
      fontWeight: "bold",
      fontSize: 20,
    });

    // Add the tooltip to the canvas
    pageCanvas.add(tooltip);

    // Return the tooltip so it can be removed later
    return tooltip;
  }

  clearViewsAndPositions() {
    this.canvasJSON.objects = [];
    this.availablePointsTODraw = [
      {
        index: 1,
        isAvailable: true,
        id: null,
        path: null,
      },
      {
        index: 2,
        isAvailable: true,
        id: null,
        path: null,
      },
      {
        index: 3,
        isAvailable: true,
        id: null,
        path: null,
      },
      {
        index: 4,
        isAvailable: true,
        id: null,
        path: null,
      },
      {
        index: 5,
        isAvailable: true,
        id: null,
        path: null,
      },
    ];
  }

  // Compute and apply sizing and placement parameters of page elements.
  async update(pageElem, view = undefined) {
    // Size page DOM element based on the parent element size.
    const parentElem = pageElem.parentNode;
    let pageSize = [parentElem.offsetWidth, parentElem.offsetHeight];
    const aspectRatio = q20Cfg.pageSize[0] / q20Cfg.pageSize[1];

    if (pageSize[0] / aspectRatio > pageSize[1]) pageSize[0] = pageSize[1] * aspectRatio;
    else pageSize[1] = pageSize[0] / aspectRatio;

    pageSize = pageSize.map((x) => x - 20);
    pageElem.style.width = `${pageSize[0]}px`;
    pageElem.style.height = `${pageSize[1]}px`;

    this.sizePx = pageSize;
    this.unitScale = pageSize[0] / q20Cfg.pageSize[0];

    // Set CSS size of page canvas
    pageCanvas.setDimensions({ width: `${pageSize[0]}px`, height: `${pageSize[1]}px` }, { cssOnly: true });
    pageCanvas.uniformScaling = true;
    // this.canvas.calcOffset();
    pageCanvas.clear();

    // Extended fabric line class
    fabric.LineArrow = fabric.util.createClass(fabric.Line, {
      initialize(element, options) {
        options || (options = {});
        this.callSuper("initialize", element, options);
      },
      type: "LineArrow",
      toObject() {
        return fabric.util.object.extend(this.callSuper("toObject"));
      },

      _render(ctx) {
        this.callSuper("_render", ctx);

        // do not render if width/height are zeros or object is not visible
        if (this.width === 0 || this.height === 0 || !this.visible) return;

        ctx.save();

        const xDiff = this.x2 - this.x1;
        const yDiff = this.y2 - this.y1;
        const angle = Math.atan2(yDiff, xDiff);
        ctx.translate((this.x2 - this.x1) / 2, (this.y2 - this.y1) / 2);
        ctx.rotate(angle);
        ctx.beginPath();
        // move 10px in front of line to start the arrow so it does not have the square line end showing in front (0,0)
        ctx.moveTo(10, 0);
        ctx.lineTo(-20, 15);
        ctx.lineTo(-20, -15);
        ctx.closePath();
        ctx.fillStyle = this.stroke;
        ctx.fill();

        ctx.restore();
      },
    });
    fabric.LineArrow.fromObject = function (object, callback) {
      callback && callback(new fabric.LineArrow([object.x1, object.y1, object.x2, object.y2], object));
    };

    fabric.LineArrow.async = true;

    pageCanvas.loadFromJSON(this.canvasJSON, () => {
      const titleText = this.getFabricObjectByTemplateRole("title");
      const version = this.getFabricObjectByTemplateRole("parts_list");
      const partName = this.getFabricObjectByTemplateRole("part_name");
      const bomTitle = this.getFabricObjectByTemplateRole("bom_title");
      const qty = this.getFabricObjectByTemplateRole("qty");

      // count duplicate and remove from part_name array
      const checkDuplicates = (item, index, arr) => arr.sort((a, b) => a - b).filter((x) => x !== arr[index - 1] && x === item);
      const numbers = [];
      const final = [];
      for (let index = 0; index < app.asm.tree.length; index++) {
        numbers.push(app.asm.tree[index].parts[0].name);
      }
      numbers.forEach((item, index, arr) => {
        const check = checkDuplicates(item, index, arr);
        if (check && check.length > 0) {
          final.push({ partName: item, count: check.length });
        }
      });
      // count duplicate and remove from part_name array
      if (this.pageNumber === 0) {
        titleText.text;
        partName.text = "";
        qty.text = "";
        bomTitle.text = "";
        titleText.left = 19.61;
        titleText.top = 351.98;
        titleText.width = 505.1;
        titleText.height = 42.94;
        titleText.fontSize = 42;
        titleText.scaleX = 1.63;
        titleText.scaleY = 1.63;
        titleText.fontSize = 42;
        titleText.textAlign = "center";
        titleText.lockMovementY = true;
        titleText.lockMovementX = true;
        titleText.selectable = true;
        version.left = 693.04;
        version.top = 100.18;
        version.width = 94.63;
        version.height = 20.34;
        version.scaleX = 1.53;
        version.scaleY = 1.53;
        version.fontSize = 18;
        version.selectable = true;
        version.lockMovementY = true;
        version.lockMovementX = true;
        bomTitle.lockMovementX = true;
        bomTitle.lockMovementY = true;
        qty.lockMovementX = true;
        qty.lockMovementY = true;
        titleText.hasControls = false;
        version.hasControls = false;
        bomTitle.hasControls = false;
        qty.hasControls = false;

        for (let index = 0; index < final.length; index++) {
          const partDataIndex = this.getFabricObjectByTemplateRole(final[index].partName);
          partDataIndex.text = "";
        }
        for (let index = 0; index < final.length; index++) {
          const partDataCount = this.getFabricObjectByTemplateRole(`qty${final[index].partName}`);
          partDataCount.text = "";
        }
      } else if (this.pageNumber === 1) {
        titleText.text;
        titleText.selectable = true;
        titleText.left = 187.74;
        titleText.height = 42.94;
        titleText.top = 34.47;
        titleText.width = 505.1;
        titleText.scaleX = 0.88;
        titleText.scaleY = 0.88;
        titleText.textAlign = "center";
        titleText.lockMovementY = true;
        titleText.lockMovementX = true;
        titleText.fontSize = 44;
        titleText.editable = false;
        titleText.selectable = false;
        version.left = 693.04;
        version.top = 100.18;
        version.width = 94.63;
        version.height = 20.34;
        version.scaleX = 1.53;
        version.scaleY = 1.53;
        version.fontSize = 18;
        version.selectable = false;
        titleText.editable = false;
        version.lockMovementY = true;
        version.lockMovementX = true;
        bomTitle.lockMovementX = true;
        bomTitle.lockMovementY = true;
        qty.lockMovementX = true;
        qty.lockMovementY = true;
        titleText.hasControls = false;
        version.hasControls = false;
        bomTitle.hasControls = false;
        qty.hasControls = false;
        bomTitle.text = app.bomTitle;
        partName.text = "Part Name";
        partName.left = 57.57;
        qty.text = "Qty";
        partName.selectable = false;
        qty.selectable = false;
        // Now, attach a mouseover event listener to the textbox
        titleText.on("mouseover", () => {
          // Create the tooltip
          const tooltip = this.createTooltip("Editable only on Title Page", titleText);

          // Store a reference to the tooltip on the textbox object
          // so it can be removed later
          titleText.tooltip = tooltip;
        });

        // Finally, attach a mouseout event listener to the textbox to remove the tooltip
        titleText.on("mouseout", () => {
          // Remove the tooltip from the canvas
          pageCanvas.remove(titleText.tooltip);

          // Clear the reference to the tooltip
          titleText.tooltip = null;
        });

        // Now, attach a mouseover event listener to the version
        version.on("mouseover", () => {
          // Create the tooltip
          const tooltip = this.createTooltip("Editable only on Title Page", version);

          // Store a reference to the tooltip on the textbox object
          // so it can be removed later
          version.tooltip = tooltip;
        });

        // Finally, attach a mouseout event listener to the textbox to remove the tooltip
        version.on("mouseout", () => {
          // Remove the tooltip from the canvas
          pageCanvas.remove(version.tooltip);

          // Clear the reference to the tooltip
          version.tooltip = null;
        });

        for (let index = 0; index < final.length; index++) {
          const partDataIndex = this.getFabricObjectByTemplateRole(final[index].partName);
          const string = final[index].partName;
          partDataIndex.selectable = false;
          const length = 40;
          const trimmedString = string.substring(0, length);
          if (string.length > 40) {
            const wraptrimmedString = trimmedString.replace(trimmedString, `${trimmedString}...`);
            partDataIndex.text = wraptrimmedString;
          } else {
            partDataIndex.text = trimmedString;
          }
        }
        for (let index = 0; index < final.length; index++) {
          const partDataCount = this.getFabricObjectByTemplateRole(`qty${final[index].partName}`);
          const count = final[index].count.toString();
          partDataCount.text = count;
          partDataCount.selectable = false;
        }
      } else {
        const file = app.fileName.split(".");
        titleText.text = this.canvasJSON.objects[4].text === file[0] ? `Operation ${this.pageNumber - 1}` : this.canvasJSON.objects[4].text;
        titleText.width = 286.96;
        titleText.height = 42.94;
        titleText.fontSize = 38;
        titleText.height = 42.94;
        titleText.left = 50;
        titleText.lineHeight = 1.16;
        titleText.scaleX = 1;
        titleText.scaleY = 1;
        titleText.top = 30;
        titleText.fontFamily = "Arial";
        titleText.selectable = true;
        titleText.lockMovementY = true;
        titleText.lockMovementX = true;
        titleText.hasControls = false;
        titleText.textAlign = "left";
        version.text = "";
        version.left = 647.12;
        version.width = 100.18;
        version.lockMovementY = true;
        version.lockMovementX = true;
        version.hasControls = false;
        bomTitle.text = "Parts in Operation";
        bomTitle.selectable = true;
        bomTitle.width = 303.98;
        bomTitle.top = 97.15;
        bomTitle.fontFamily = "Times New Roman";
        bomTitle.fontWeight = "normal";
        bomTitle.underline = true;
        bomTitle.hasControls = false;
        bomTitle.lockMovementY = true;
        bomTitle.lockMovementX = true;
        bomTitle.fontSize = 30;
        qty.text = "";
        qty.selectable = false;
        qty.width = 0;
        qty.left = 0;
        qty.top = 0;
        qty.height = 0;
        partName.text = "";
        partName.selectable = false;
        partName.height = 0;
        partName.top = 0;
        partName.width = 0;
        partName.left = 0;

        for (let index = 0; index < final.length; index++) {
          const partDataIndex = this.getFabricObjectByTemplateRole(final[index].partName);
          if (partDataIndex) {
            partDataIndex.text = "";
            const objects = pageCanvas.getObjects();
            objects.splice(objects.findIndex((n) => n
        === partDataIndex), 1);
          }
        }
        for (let index = 0; index < final.length; index++) {
          const partDataCount = this.getFabricObjectByTemplateRole(`qty${final[index].partName}`);
          if (partDataCount) {
            partDataCount.text = "";
            const objects = pageCanvas.getObjects();
            objects.splice(objects.findIndex((n) => n
        === partDataCount), 1);
          }
        }
      }
      if (!view) {
        this.clearViewsAndPositions();
        this.views.forEach((vw) => this.addViewOnPage(vw));
      } else if (view) {
        this.addViewOnPage(view);
      }

      const partDetails = app.getPagePartsDescr(app.currPage);
      const objects = pageCanvas.getObjects();
      const objIndex = objects.findIndex(((obj) => obj.template_role === "Part_details"));
      if (objIndex !== -1) objects[objIndex].text = partDetails;

      pageCanvas.requestRenderAll();
      pageCanvas.renderAll();
    });

    const pageSave = function (evt) {
      this.canvasJSON = pageCanvas.toJSON(["view_uuid", "modified_by_user", "template_role", "template_index", "editable", "selectable"]);
    }.bind(this);

    console.log("pageSave", this.canvasJSON);
    pageCanvas.on({
      "object:moving": pageSave,
      "object:modified": pageSave,
      "object:added": pageSave,
      "after:rendered": pageSave,
      "selection:created": pageSave,
      "selection:cleared": pageSave,
      "mouse:move": pageSave,
      "text:changed": pageSave,
    });
    // Modified objects from modified of the canvas
    pageCanvas.on("object:modified", (e) => {
      if (this.pageNumber === 0 || this.pageNumber === 1) {
        if (e.target.template_role === "title" || e.target.template_role === "parts_list") {
          const objects = pageCanvas.getObjects();
          app.fileName = objects[4].text;
          app.versionName = objects[5].text;
          sessionStorage.setItem("title_value", app.fileName);
          if ((e.target.text).length < 1) {
            document.getElementById("textbox_validation_popup").style.display = "block";
            document.getElementById("pageCloseButton").style.visibility = "hidden";
            const objects = pageCanvas.getObjects();
            // Trying to set the property after load JSON
            objects[4].set("text", app.titleNameRollBack);
            objects[5].set("text", app.versionNameRollBack);
            app.fileName = app.titleNameRollBack;
            app.versionName = app.versionNameRollBack;
          // objects[4].selectable = false;
          // e.target.text = this.titleNameRollBack;
          } else {
            document.getElementById("textbox_validation_popup").style.display = "none";
            document.getElementById("pageCloseButton").style.visibility = "visible";
          }
        }
      }
    });

    // Restrict objects from moving out of the canvas

    pageCanvas.on("object:moving", (e) => {
      const obj = e.target;
      // if object is too big ignore
      if (obj.currentHeight > obj.canvas.height || obj.currentWidth > obj.canvas.width) {
        return;
      }
      obj.setCoords();
      // top-left  corner
      if (obj.getBoundingRect().top < 0 || obj.getBoundingRect().left < 0) {
        obj.top = Math.max(obj.top, obj.top - obj.getBoundingRect().top);
        obj.left = Math.max(obj.left, obj.left - obj.getBoundingRect().left);
      }
      // bot-right corner
      if (obj.getBoundingRect().top + obj.getBoundingRect().height > obj.canvas.height || obj.getBoundingRect().left + obj.getBoundingRect().width > obj.canvas.width) {
        obj.top = Math.min(obj.top, obj.canvas.height - obj.getBoundingRect().height + obj.top - obj.getBoundingRect().top);
        obj.left = Math.min(obj.left, obj.canvas.width - obj.getBoundingRect().width + obj.left - obj.getBoundingRect().left);
      }
    });

    let left1 = 0;
    let top1 = 0;
    let scale1x = 0;
    let scale1y = 0;
    let width1 = 0;
    let height1 = 0;

    pageCanvas.on("object:scaling", (e) => {
      const obj = e.target;
      obj.setCoords();
      const brNew = obj.getBoundingRect();

      if (brNew.width + brNew.left >= obj.canvas.width || brNew.height + brNew.top >= obj.canvas.height || brNew.left < 0 || brNew.top < 0) {
        obj.left = left1;
        obj.top = top1;
        obj.scaleX = scale1x;
        obj.scaleY = scale1y;
        obj.width = width1;
        obj.height = height1;
      } else {
        left1 = obj.left;
        top1 = obj.top;
        scale1x = obj.scaleX;
        scale1y = obj.scaleY;
        width1 = obj.width;
        height1 = obj.height;
      }
    });

    // Arrow drawing

    const Arrow = (function () {
      function Arrow(canvas) {
        this.canvas = canvas;
        this.className = "LineArrow";
        this.isDrawing = false;
        this.enabled = false;
        this.bindEvents();
      }

      Arrow.prototype.enableTool = function () {
        this.enabled = true;
        pageCanvas.selection = false;
      };

      Arrow.prototype.disableTool = function () {
        this.enabled = false;
      };

      Arrow.prototype.bindEvents = function () {
        const inst = this;
        inst.canvas.on("mouse:down", (o) => {
          inst.onMouseDown(o);
        });
        inst.canvas.on("mouse:move", (o) => {
          inst.onMouseMove(o);
        });
        inst.canvas.on("mouse:up", (o) => {
          inst.onMouseUp(o);
        });
        inst.canvas.on("object:moving", (o) => {
          inst.disable();
        });
      };

      Arrow.prototype.onMouseUp = function (o) {
        const inst = this;
        inst.disable();
        inst.disableTool();

        document.getElementById("pageDrawArrow").classList.remove("selected");
        document.getElementById("pageDrawPointer").classList.add("selected");
        pageCanvas.selection = true;
      };

      Arrow.prototype.onMouseMove = function (o) {
        const inst = this;
        if (!inst.isEnable()) {
          return;
        }

        const pointer = inst.canvas.getPointer(o.e);
        const activeObj = inst.canvas.getActiveObject();
        activeObj.set({
          x2: pointer.x,
          y2: pointer.y,
        });
        activeObj.setCoords();
        inst.canvas.renderAll();
      };

      Arrow.prototype.onMouseDown = function (o) {
        if (!this.enabled) {
          return;
        }
        const inst = this;
        inst.enable();
        const pointer = inst.canvas.getPointer(o.e);

        const points = [pointer.x, pointer.y, pointer.x, pointer.y];
        const line = new fabric.LineArrow(points, {
          strokeWidth: 2,
          fill: "red",
          stroke: "red",
          originX: "center",
          originY: "center",
          hasBorders: false,
          hasControls: true,
        });

        inst.canvas.add(line).setActiveObject(line);
      };

      Arrow.prototype.isEnable = function () {
        return this.isDrawing;
      };

      Arrow.prototype.enable = function () {
        this.isDrawing = true;
      };

      Arrow.prototype.disable = function () {
        this.isDrawing = false;
      };

      return Arrow;
    }());

    this.arrow = new Arrow(pageCanvas);

    // Rect tool

    const RectTool = (function () {
      function RectTool(canvas) {
        this.canvas = canvas;
        this.className = "RectTool";
        this.isDrawing = false;
        this.enabled = false;
        this.bindEvents();
      }

      RectTool.prototype.enableTool = function () {
        this.enabled = true;
        pageCanvas.selection = false;
      };

      RectTool.prototype.disableTool = function () {
        this.enabled = false;
      };

      RectTool.prototype.bindEvents = function () {
        const inst = this;
        inst.canvas.on("mouse:down", (o) => {
          inst.onMouseDown(o);
        });
        inst.canvas.on("mouse:move", (o) => {
          inst.onMouseMove(o);
        });
        inst.canvas.on("mouse:up", (o) => {
          inst.onMouseUp(o);
        });
        inst.canvas.on("object:moving", (o) => {
          inst.disable();
        });
      };

      RectTool.prototype.onMouseUp = function (o) {
        const inst = this;
        inst.disable();
        inst.disableTool();

        document.getElementById("pageDrawRect").classList.remove("selected");
        document.getElementById("pageDrawPointer").classList.add("selected");
        pageCanvas.selection = true;
      };

      RectTool.prototype.onMouseMove = function (o) {
        const inst = this;
        if (!inst.isEnable()) {
          return;
        }

        const pointer = inst.canvas.getPointer(o.e);
        const activeObj = inst.canvas.getActiveObject();
        activeObj.set({
          width: pointer.x - activeObj.left,
          height: pointer.y - activeObj.top,
        });
        activeObj.setCoords();
        inst.canvas.renderAll();
      };

      RectTool.prototype.onMouseDown = function (o) {
        if (!this.enabled) {
          return;
        }
        const inst = this;
        inst.enable();
        const pointer = inst.canvas.getPointer(o.e);

        const points = [pointer.x, pointer.y, pointer.x, pointer.y];
        const r = new fabric.Rect({
          strokeWidth: 2,
          stroke: "red",
          fill: "rgba(0,0,0,0)",
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
        });

        inst.canvas.add(r).setActiveObject(r);
      };

      RectTool.prototype.isEnable = function () {
        return this.isDrawing;
      };

      RectTool.prototype.enable = function () {
        this.isDrawing = true;
      };

      RectTool.prototype.disable = function () {
        this.isDrawing = false;
      };

      return RectTool;
    }());

    this.recttool = new RectTool(pageCanvas);

    // Text tool

    const TextTool = (function () {
      function TextTool(canvas) {
        this.canvas = canvas;
        this.className = "TextTool";
        this.isDrawing = false;
        this.enabled = false;
        this.bindEvents();
      }

      TextTool.prototype.enableTool = function () {
        this.enabled = true;
        pageCanvas.selection = false;
      };

      TextTool.prototype.disableTool = function () {
        this.enabled = false;
      };

      TextTool.prototype.bindEvents = function () {
        const inst = this;
        inst.canvas.on("mouse:down", (o) => {
          inst.onMouseDown(o);
        });
      };

      TextTool.prototype.onMouseDown = function (o) {
        if (!this.enabled) {
          return;
        }
        const inst = this;
        inst.enable();
        const pointer = inst.canvas.getPointer(o.e);

        const r = new fabric.IText("Enter text here...", {
          left: pointer.x,
          top: pointer.y,
          fontSize: q20Cfg.pageTextFontSize,
        });

        inst.canvas.add(r).setActiveObject(r);

        inst.disable();
        inst.disableTool();
        document.getElementById("pageDrawText").classList.remove("selected");
        document.getElementById("pageDrawPointer").classList.add("selected");
        pageCanvas.selection = true;
      };

      TextTool.prototype.isEnable = function () {
        return this.isDrawing;
      };

      TextTool.prototype.enable = function () {
        this.isDrawing = true;
      };

      TextTool.prototype.disable = function () {
        this.isDrawing = false;
      };

      return TextTool;
    }());

    this.texttool = new TextTool(pageCanvas);
  }

  setTool(tool) {
    document.getElementById("pageDrawPointer").classList.remove("selected");
    document.getElementById("pageDrawArrow").classList.remove("selected");
    document.getElementById("pageDrawRect").classList.remove("selected");
    document.getElementById("pageDrawText").classList.remove("selected");
    this.arrow.disableTool();
    this.recttool.disableTool();
    this.texttool.disableTool();
    if (tool === "pointer") {
      document.getElementById("pageDrawPointer").classList.add("selected");
      pageCanvas.selection = true;
    } else if (tool === "arrow") {
      document.getElementById("pageDrawArrow").classList.add("selected");
      this.arrow.enableTool();
    } else if (tool === "rect") {
      document.getElementById("pageDrawRect").classList.add("selected");
      this.recttool.enableTool();
    } else if (tool === "text") {
      document.getElementById("pageDrawText").classList.add("selected");
      this.texttool.enableTool();
    }
  }

  // Convert given mm value to CSS size value, scaling it as needed.
  toCssSize(val) {
    return `${Math.round(val * this.unitScale)}px`;
  }

  // Return position and size of view image for placement on the page.
  getImageConf(view) {
    const idx = this.views.findIndex((x) => x === view);
    const settings = q20Cfg.pageImagesSettings[this.views.length - 1][idx];
    if (!settings) return;

    const scale = view.imageDims[0] > view.imageDims[1] ? settings[2] / view.imageDims[0] : settings[3] / view.imageDims[1];
    const size = view.imageDims.map((x) => x * scale);

    const pos = settings.slice(0, 2);
    for (let i = 0; i < 2; i++) pos[i] += (settings[i + 2] - size[i]) / 2;

    return [pos, size];
  }

  // Return CSS style to size and position the image on page.
  getImageStyle(view, posOnly) {
    if (!this.views.length || !this.views.find((x) => x === view)) return;
    const [pos, size] = this.getImageConf(view);

    const res = {
      left: this.toCssSize(pos[0]),
      top: this.toCssSize(pos[1]),
    };

    if (!posOnly) {
      res.width = this.toCssSize(size[0]);
      res.height = this.toCssSize(size[1]);
    }

    return res;
  }

  // Return CSS style for the text box.
  getTextBoxStyle() {
    return {
      left: this.toCssSize(q20Cfg.pageTextBoxPos[0]),
      top: this.toCssSize(q20Cfg.pageTextBoxPos[1]),
      width: this.toCssSize(q20Cfg.pageTextBoxSize[0]),
      height: this.toCssSize(q20Cfg.pageTextBoxSize[1]),
      fontSize: this.toCssSize(q20Cfg.pageTextFontSize),
    };
  }

  // Return CSS style for the title.
  getTitleStyle() {
    return {
      left: this.toCssSize(q20Cfg.pageTitlePos[0]),
      top: this.toCssSize(q20Cfg.pageTitlePos[1]),
      fontSize: this.toCssSize(q20Cfg.pageTitleFontSize),
    };
  }

  // Return CSS style for description of parts in operation.
  getPartsDescrStyle() {
    return {
      left: this.toCssSize(q20Cfg.pagePartsInOpPos[0]),
      top: this.toCssSize(q20Cfg.pagePartsInOpPos[1]),
      fontSize: this.toCssSize(q20Cfg.pagePartsInOpFontSize),
    };
  }

  updateViewsOnPage(view) {
    if (this.views.find((vw) => vw.uuid === view.uuid)) {
      const existingViewIndex = this.views.findIndex((vw) => vw.uuid === view.uuid);
      this.views.splice(existingViewIndex, 1, view);
      this.update(document.getElementById("pageContent"));
    }
  }

  checkDelete(e) {
    if (e.keyCode === 46 || e.keyCode === 8) {
      if (pageCanvas.getActiveObject()) {
        if (pageCanvas.getActiveObject().isEditing) {
          return;
        }
        this.deleteObject();
      }
    }
  }

  deleteObject(viewUuid = null, pageData = null) {
    // Check if it's a view that we need to remove
    if (viewUuid || pageCanvas.getActiveObject().view_uuid) {
      const activeViewId = viewUuid ?? pageCanvas.getActiveObject().view_uuid;
      if (activeViewId === 5) {
        this.availablePointsTODraw[4].isAvailable = true;
        this.availablePointsTODraw[4].id = null;
        this.lastPositionFilled = false;
        this.views.splice(4, 1);
      } else {
        for (let i = 0; i < this.views.length; i++) {
          if (this.views[i].uuid === activeViewId) {
            this.availablePointsTODraw.forEach((item, index) => {
              if (item.id === activeViewId) {
                this.availablePointsTODraw[index].isAvailable = true;
                this.availablePointsTODraw[index].id = null;
                this.availablePointsTODraw[index].path = null;
              }
            });
            this.views.splice(i, 1);
          }
        }
      }
      if (app.currPage) {
        const viewPartDetails = app.getPagePartsDescr(app.currPage);
        const partData = this.getFabricObjectByTemplateRole("Part_details");
        partData.text = viewPartDetails;
      }
      if (pageData) {
        const dynamicData = pageData.canvasJSON.objects;
        dynamicData.splice(dynamicData.findIndex((n) => n.view_uuid
        === viewUuid), 1);
      }
    }

    // Remove the canvas object
    const activeObjects = pageCanvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach((object) => {
        pageCanvas.remove(object);
      });
    } else if (viewUuid) {
      pageCanvas.getObjects().forEach((obj) => {
        if (obj.view_uuid === viewUuid) {
          pageCanvas.remove(obj);
        }
      });
    }
    pageCanvas.renderAll();
  }
}
