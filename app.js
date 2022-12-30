/* eslint-disable no-console */
/* eslint-disable no-return-assign */
/* eslint-disable camelcase */
/* eslint-disable no-continue */
/* eslint-disable no-throw-literal */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-plusplus */
/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
/* eslint-disable consistent-return */

/* eslint-disable class-methods-use-this */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable no-undef */
// The application instance.
class App extends Base {
  stepLoader = 0;

  fileName = "";

  versionName = "Version A";

  titleNameRollBack = "";

  versionNameRollBack = "";

  bomTitle = "BILL OF MATERIALS";

  pageLists = "";

  pageNumber = "";

  titleJSON = "";

  bomJSON = "";

  pageTopValue = "";

  assemblyTree = "";

  dragData = 0;

  asmDragData = "";

  // Set names of object and its children to strings denoting object tree path.
  // Such names will not be affected by GLTF import/export.
  static setObj3dNamesByPaths(rootObj3d) {
    const traverse = (obj3d, path) => {
      if (!("name" in obj3d.userData)) obj3d.userData.name = obj3d.name;
      obj3d.name = path;
      if (!obj3d.children) return;
      for (const [i, child] of obj3d.children.entries()) traverse(child, `${path}.${i}`);
    };

    traverse(rootObj3d, "0");
  }

  constructor() {
    super();
    this.getunique_data();
    window.onerror = (err) => this.showError(err);
    window.onunhandledrejection = (err) => this.showError(err);
  }

  // Block app UI while waiting for an operation to complete.
  startWaitingModally() {
    document.getElementById("modalBlocker").style.display = "block";
  }

  // Unblock app after long operation completion.
  stopWaitingModally() {
    document.getElementById("modalBlocker").style.display = "none";
  }

  // Block app UI while waiting for an operation to complete.
  startWaitingPage() {
    document.getElementById("modalBlocker2").style.display = "block";
  }

  // Unblock app after long operation completion.
  stopWaitingPage() {
    document.getElementById("modalBlocker2").style.display = "none";
  }

  // Fetch upload pages
  async fetchAllPages() {
    const file = this.fileName.split(".");
    this.titleNameRollBack = file[0];
    this.versionNameRollBack = this.versionName;
    const formData = new FormData();
    formData.append("url", window.location.href);
    const getPages = await fetch(q20Cfg.fetchPagesList, { method: "POST", body: formData }).then((response) => {
      if (response.ok) {
        console.log("okk");
        return response.json();
      }
      return Promise.reject(response); // 2. reject instead of throw
    })
      .then((json) => {
        json.pageslist.forEach((v, i) => {
          if (v.pageNumber === 0) {
            this.titleJSON = v.canvasJSON;
            this.fileName = v.canvasJSON.objects[4].text;
            this.versionName = v.canvasJSON.objects[5].text;
            this.titleNameRollBack = v.titleNameRollBack;
            this.versionNameRollBack = v.versionNameRollBack;
          }
          if (v.pageNumber === 1) {
            this.bomJSON = v.canvasJSON;
            const objects = v.canvasJSON.objects.find((item) => item.template_role === "bom_title");
            this.bomTitle = objects.text ? objects.text : "BILL OF MATERIALS";
          }
          this.pageNumber = v.pageNumber;
          const staticValue = this.pages.find((item) => item.pageNumber === v.pageNumber);
          if (!staticValue) {
            const page = new Page(v.pageNumber, v.uniqueKey);
            page.text = v.text;
            page.views = v.views;
            page.pageTitle = v.pageTitle;
            page.canvasJSON = v.canvasJSON;
            page.topValue = v.topValue;
            page.availablePointsTODraw = v.availablePointsTODraw;
            this.pages.push(page);
            return page;
          }
        });
      })
      .catch((response) => {
        console.log("err response", response);
      });
  }

  // Fetch Assembly Order
  async fetchAssemblyOrder() {
    const formData = new FormData();
    formData.append("url", window.location.href);
    await fetch(q20Cfg.getassemblytree, { method: "POST", body: formData }).then((response) => {
      if (response.ok) {
        return response.json();
      }
      return Promise.reject(response); // 2. reject instead of throw
    })
      .then((json) => {
        this.assemblyTree = json.assemblyorder[0];
        // console.log(json);
      })
      .catch((response) => {
        response.json().then((json) => {
          console.log(json);
        });
      });
  }

  // Initialise the app. Allows passing wrapped "this", enabling reactivity.
  setup() {
    this.is3dSelHighlOn = true;
    this.pages = [];

    const viewerElem = window.document.getElementById("viewer");
    this.viewer = makeNonReactive(new Viewer3D());
    this.viewer.setup(viewerElem);

    // Add hook to support dragging part meshes. Parts can contain multiple
    // child meshes, so walking up the chain may be required to drag the
    // whole part. Explosion direction must also be respected if set.

    this.viewer.getDragMesh = (clickedMesh) => {
      if (!this.asm) return;
      let dragMesh;
      let part;
      clickedMesh.traverseAncestors((mesh) => {
        if (part) {
          // already found?
          return;
        }
        part = this.getObj3dPart(mesh);
        if (part && part.explDir) dragMesh = mesh;
      });
      return [dragMesh, part && part.explDir];
    };

    // Select parts by clicking respective meshes.
    this.viewer.onObjClick = (event, intersect) => {
      if (!event.altKey || !this.asm) return;
      const obj3d = intersect.object;
      if (!obj3d.id) return;

      const part = this.getObj3dPart(obj3d);
      if (!part) return;
      const item = this.asm.tree.find((x) => x.parts.some((y) => y === part));
      this.handlePartClick(event, item, part);
    };

    // Update current view layout after dragging a part.

    this.viewer.onDragEnd = (event, obj3d) => {
      this.view.layout = this.asm.getLayout();
    };

    if (q20Cfg.explodeGroupTogether) {
      // Apply explosion dragging to all part meshes of an item.

      this.viewer.onDragChange = (obj3d, oldWorldPos, newWorldPos) => {
        if (!this.viewer.dragDir) return;
        const part = this.getObj3dPart(obj3d);
        if (!part) return;
        const item = this.asm.getPartItem(part);
        if (item.parts.length < 2) return;

        const delta = newWorldPos.clone().sub(oldWorldPos);
        for (const sibling of item.parts.filter((x) => x !== part)) {
          const siblingObj3d = this.asm.getPartObj(sibling);
          const worldPos = siblingObj3d.getWorldPosition(new THREE.Vector3());

          worldPos.add(delta);
          siblingObj3d.position.copy(worldPos);
          siblingObj3d.parent.worldToLocal(siblingObj3d.position);
        }
      };
    }

    // Highlight hovered-on parts in tree.
    this.viewer.onPointing = () => {
      const onPart = this.getObj3dPart(this.viewer.pointedObj3d);
      for (const part of this.asm.parts) {
        part.isHighlighted = part === onPart;
      }
    };

    window.addEventListener("resize", () => {
      if (this.currPage) this.currPage.update(document.getElementById("pageContent"));
      this.viewer.updateSize();
      this.viewer.render();
    });

    this.stopWaitingModally();
    this.viewer.render(true);
  }

  // Download current application state to be restored later.
  async downloadState() {
    const serialized = {
      asm: await this.asm.serialize(),
      origLayout: this.origLayout,
      pages: [],
    };

    for (const page of this.pages) {
      const serPage = page.serialize();
      delete serPage.views;
      serPage.viewIds = page.views.map((x) => this.asm.getViewPath(x));
      serialized.pages.push(serPage);
    }

    for (const field of ["view", "origView", "defaultView"]) serialized[field] = this[field].serialize();

    if (this.currPage) serialized.currPageIdx = this.pages.findIndex((x) => x === this.currPage);
    if (this.currItem) serialized.currItemIdx = this.asm.tree.findIndex((x) => x === this.currItem);

    const json = JSON.stringify(serialized);
    this.downloadFile(`data:application/json;base64,${btoa(json)}`, q20Cfg.stateFileName);
  }

  // Choose a file using file upload control.
  async chooseFile(callback, field = null) {
    const elem = document.createElement("input");
    elem.type = "file";
    elem.className = "invisible";
    elem.setAttribute("id", "import_file");
    // eslint-disable-next-line func-names
    elem.onchange = await function () {
      callback(this.files[0]);
      document.body.removeChild(elem);
    };
    if (field === "auto") {
      elem.click = await function () {
        callback();
        document.body.removeChild(elem);
      };
    }
    document.body.appendChild(elem);
    elem.click();
  }

  // Upload and restore a previously exported application state.
  uploadState(input) {
    this.chooseFile((file) => {
      this.startWaitingModally();
      const reader = new FileReader();

      reader.onload = async () => {
        const serialized = JSON.parse(reader.result);

        const asm = new Asm();
        await asm.deserialize(serialized.asm);
        this.setAsm(asm);

        for (const serPage of serialized.pages) {
          const page = new Page().deserialize(serPage);
          delete page.viewIds;
          for (const viewId of serPage.viewIds) {
            const viewIndices = viewId.split(".").map((x) => Number(x) - 1);
            page.views.push(asm.tree[viewIndices[0]].views[viewIndices[1]]);
          }
          this.pages.push(page);
        }

        if ("currPageIdx" in serialized) this.setCurrPage(this.pages[serialized.currPageIdx]);
        if ("currItemIdx" in serialized) this.setCurrItem(this.asm.tree[serialized.currItemIdx]);

        this.origLayout = serialized.origLayout;
        for (const field of ["view", "origView", "defaultView"]) this[field] = new View().deserialize(serialized[field]);

        this.asm.updateStep();
        this.setView(this.view);

        this.viewer.render(true);
        this.stopWaitingModally();
      };
      reader.readAsText(file);
    });
  }

  // Show/hide scene helper axes.
  toggleSceneAxes() {
    this.areSceneAxesEnabled = !this.areSceneAxesEnabled;
    this.viewer.sceneAxes.visible = this.areSceneAxesEnabled;
    this.viewer.render(true);
  }

  // Genrate Unique Id
  getRandomNumbers() {
    const typedArray = new Uint8Array(10);
    const randomValues = window.crypto.getRandomValues(typedArray);
    return randomValues.join("");
  }

  // Create a new page of instructions.
  createPage() {
    const pageLength = (this.pages.slice(-1)[0]?.pageNumber ?? -1) + 1;
    const page = new Page(pageLength, this.getRandomNumbers());
    this.pages.push(page);
    return page;
  }

  // Remove a page of instructions.
  removePage(page) {
    if (page) {
      document.getElementById("delete_page_popup").style.display = "block";
      document.getElementById("id_deletebtn").onclick = (e) => {
        this.pages = this.pages.filter((x) => x !== page);
        if (this.currPage === page) this.setCurrPage(null);
        this.closeDeletePopup();
        const formData = new FormData();
        formData.append("uniqueKey", page.uniqueKey);
        formData.append("pageNumber", page.pageNumber);
        formData.append("url", window.location.href);
        const pageListData = app.pages.map((it) => {
          const {
            texttool, recttool, arrow, ...rest
          } = it;
          return rest;
        });
        formData.append("page_list", JSON.stringify(pageListData));
        const resp = fetch(q20Cfg.deletePagesList, { method: "POST", body: formData });
      };
    } else {
      this.pages = this.pages.filter((x) => x !== page);
      if (this.currPage === page) this.setCurrPage(null);
    }
  }

  closeDeletePopup() {
    document.getElementById("delete_page_popup").style.display = "none";
  }

  closeValidationPopup() {
    document.getElementById("textbox_validation_popup").style.display = "none";
  }

  // share popup
  opensharepopup() {
    $(".addemail").remove();
    document.getElementById("search-field").value = "";
    document.getElementById("search-field").placeholder = "Email, enter separated";
    document.getElementById("share_popup").style.display = "block";
    document.getElementById("share_email_btn").disabled = true;
    document.getElementById("share_email_btn").style.backgroundColor = "#9ba2ab";
  }

  closesharePopup() {
    document.getElementById("share_popup").style.display = "none";
    document.getElementById("copy_status").style.display = "none";
    document.getElementById("share_email_btn").disabled = true;
    document.getElementById("share_input_box").value = "";
  }

  // link copy
  copylink() {
    const url = document.getElementById("current_url");
    url.value = window.location;
    url.select();
    navigator.clipboard.writeText(url.value);
    document.getElementById("copy_status").style.display = "block";
  }

  // Create a page for each item, adding views if defined.
  createAllPages() {
    for (const item of this.asm.tree) {
      const page = this.createPage();
      page.views = [...item.views.slice(0, q20Cfg.pageImagesSettings.length)];
    }
  }

  // Return part corresponding to given Object3D.
  getObj3dPart(obj3d) {
    if (!this.asm || !obj3d) return;

    let res = this.asm.parts.find((x) => x.obj3dName === obj3d.name);
    if (!res) {
      obj3d.traverseAncestors((ancestor) => {
        if (!res) res = this.asm.parts.find((x) => x.obj3dName === ancestor.name);
      });
    }
    return res;
  }

  // Load API on reload previously reload function
  async getunique_data() {
    const formData = new FormData();
    formData.append("url", window.location.href);
    const unique_id = await fetch(q20Cfg.getiddetails, { method: "POST", body: formData });
    if (unique_id.status === 201) {
      this.uploadStep("redirect");
    }
  }

  // Upload and import a STEP file.
  uploadStep(input) {
    if (input === "redirect" || input === "load_project") {
      document.getElementById("autoPageloadModal").style.display = "none";
      this.chooseFile(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("url", window.location.href);
        const unique_id = await fetch(q20Cfg.getiddetails, { method: "POST", body: formData }).then((response) => {
          if (response.ok) {
            return response.json();
          }
          return Promise.reject(response); // 2. reject instead of throw
        })
          .then((json) => {
            this.fileName = json.file_name;
            sessionStorage.setItem("title_value", this.fileName);
          })
          .catch((response) => {
            response.json().then((json) => {
              console.log(json);
            });
          });
        this.startWaitingModally();

        INFO("Sending STEP file...");

        const resp = await fetch(q20Cfg.convUrl, { method: "POST", body: formData });
        this.stepLoader = 50;
        INFO("Receiving converted file...");
        INFO("Check response", resp);
        const buff = await resp.arrayBuffer();
        this.loadBuff(buff, () => this.stopWaitingModally());
        INFO("STEP import complete");
        if (input === "redirect") {
          document.getElementById("autoPageloadModal").style.display = "block";
        } else {
          document.getElementById("autoPageloadModal").style.display = "none";
        }
      }, "auto");
    } else {
      this.chooseFile(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("url", window.location.href);
        this.fileName = file.name;
        sessionStorage.setItem("title_value", this.fileName);
        this.startWaitingModally();

        INFO("Sending STEP file...");

        const resp = await fetch(q20Cfg.convUrl, { method: "POST", body: formData });
        this.stepLoader = 50;
        INFO("Receiving converted file...");
        INFO("Check response", resp);
        const buff = await resp.arrayBuffer();
        this.loadBuff(buff, () => this.stopWaitingModally());
        INFO("STEP import complete");
      });
    }
  }

  // Load named GLTF model.
  load(name) {
    const url = `${name}.glb`;
    const gltfLoader = new THREE.GLTFLoader();

    gltfLoader.load(
      url,
      (gltf, data) => {
        this.importAsm(gltf, data);
        INFO(`Loaded model '${name}'`);
      },
      null,
      (e) => console.log(e),
    );
  }

  // Load GLTF model from an ArrayBuffer.
  async loadBuff(data, callback) {
    if (data.byteLength === 0) {
      // eslint-disable-next-line no-alert
      alert("File conversion failed. Sorry about that! Did you upload a STEP file?");
      callback();
      return;
    }

    INFO("Loading assembly");
    this.stepLoader = 75;
    INFO("2", this.stepLoader);
    const gltfLoader = new THREE.GLTFLoader();

    gltfLoader.parse(
      data,
      null,
      (gltf) => {
        this.fetchAssemblyOrder();
        this.importAsm(gltf, data);
        this.stepLoader = 100;
        INFO("Imported assembly loaded");
        this.stepLoader = 0;
        this.fetchAllPages();
        this.autoCreateTitlePage();
        this.autoCreateBomPage();
        callback();
      },
      null,
      (e) => console.log(e),
    );
  }

  // Update highlight state of assembly 3d objects. If isHighlDisabled is true,
  // remove all highlighting.
  update3dHighl(isHighlDisabled) {
    for (const part of this.asm.parts) {
      const obj3d = this.asm.getPartObj(part);
      const isOn = !isHighlDisabled && this.is3dSelHighlOn && part.isSelected;
      this.viewer.setObj3dHighl(obj3d, isOn);
    }
  }

  // Regenerate all views.
  updateViews() {
    this.startWaitingModally();
    setTimeout(() => {
      // Give time to DOM changes for modality to go through

      const views = this.asm.tree.flatMap((x) => x.views);
      if (views.length) {
        const savedView = this.view.clone();
        INFO("Updating views:", views.length);

        for (const view of views) {
          this.setView(view);
          this.update3dHighl(true); // disable highlighting in views
          view.update(this.viewer);
          view.isUpdateNeeded = false;
        }

        INFO("Views updated");
        this.setView(savedView);
        this.update3dHighl(); // re-enable highlighting
      }

      this.stopWaitingModally();
    }, 10);
  }

  // Set current layout to the original one and re-render.
  resetLayout() {
    this.asm.setLayout(app.origLayout);
    this.viewer.render(true);
  }

  // Set/reset currently shown tree item.
  setCurrItem(item) {
    this.currItem = item;
    this.resetLayout();
  }

  // Set/reset currently edited page.
  async setCurrPage(page, pageElem) {
    pageCanvas.fire("after:rendered");
    // Remove save event listeners
    pageCanvas.__eventListeners = {};
    if (page) {
      page.hasNewUpdates = false;
      fetch("page_templates/base.json")
        .then((res) => res.json())
        .then((data) => {
          pageTemplateJSON = data;
        });
      const file = this.fileName.split(".");
      pageTemplateJSON.objects[4].text = file[0];
      // count duplicate and remove from part_name array   ------------START----------------
      const checkDuplicates = (item, index, arr) => arr.sort((a, b) => a - b).filter((x) => x !== arr[index - 1] && x === item);
      const numbers = [];
      let final = [];
      for (let index = 0; index < this.asm.tree.length; index++) {
        numbers.push(this.asm.tree[index].parts[0].name);
      }
      numbers.forEach((item, index, arr) => {
        const check = checkDuplicates(item, index, arr);
        if (check && check.length > 0) {
          final.push({ part_name: item, count: check.length });
        }
      });
      final = final.filter((value, index, self) => index === self.findIndex((t) => (
        t.part_name === value.part_name
      )));

      // count duplicate and remove from part_name array ----------------END-----------------------

      // ------------------- BOM PAGE START ---------------------------------------//
      if (page.pageNumber === 0) {
        pageTemplateJSON.objects[4] = {
          lockMovementY: true,
          lockMovementX: true,
          interactive: false,
          type: "textbox",
          template_role: "title",
          version: "5.2.1",
          originX: "left",
          originY: "top",
          left: 19.61,
          top: 351.98,
          width: 505.1,
          height: 42.94,
          fill: "rgb(0,0,0)",
          stroke: null,
          strokeWidth: 1,
          strokeDashArray: null,
          strokeLineCap: "butt",
          strokeDashOffset: 0,
          strokeLineJoin: "miter",
          strokeUniform: false,
          strokeMiterLimit: 4,
          scaleX: 1.63,
          scaleY: 1.63,
          angle: 0,
          flipX: false,
          flipY: false,
          opacity: 1,
          shadow: null,
          visible: true,
          backgroundColor: "",
          fillRule: "nonzero",
          paintFirst: "fill",
          globalCompositeOperation: "source-over",
          skewX: 0,
          skewY: 0,
          fontFamily: "Arial",
          fontWeight: "bold",
          fontSize: 42,
          text: file[0],
          underline: false,
          overline: false,
          linethrough: false,
          textAlign: "center",
          fontStyle: "normal",
          lineHeight: 1.16,
          textBackgroundColor: "",
          charSpacing: 0,
          styles: {},
          direction: "ltr",
          path: null,
          pathStartOffset: 0,
          pathSide: "left",
          pathAlign: "baseline",
          selectable: true,
          editable: true,
          splitByGrapheme: true,
          absolutePosition: true,
        };
        pageTemplateJSON.objects[9] = {
          type: "i-text",
          template_role: "bom_title",
          version: "5.2.1",
          originX: "left",
          originY: "top",
          left: 57.57,
          top: 135.78,
          width: 764,
          height: 42.94,
          fill: "rgb(0,0,0)",
          stroke: null,
          strokeWidth: 1,
          strokeDashArray: null,
          strokeLineCap: "butt",
          strokeDashOffset: 0,
          strokeLineJoin: "miter",
          strokeUniform: false,
          strokeMiterLimit: 4,
          scaleX: 0.88,
          scaleY: 0.88,
          angle: 0,
          flipX: false,
          flipY: false,
          opacity: 1,
          shadow: null,
          visible: true,
          backgroundColor: "",
          fillRule: "nonzero",
          paintFirst: "fill",
          globalCompositeOperation: "source-over",
          skewX: 0,
          skewY: 0,
          fontFamily: "Arial",
          fontWeight: "bold",
          fontSize: 28,
          text: this.bomTitle,
          underline: false,
          overline: false,
          linethrough: false,
          textAlign: "left",
          fontStyle: "normal",
          lineHeight: 1.16,
          textBackgroundColor: "",
          charSpacing: 0,
          styles: {},
          direction: "ltr",
          path: null,
          pathStartOffset: 0,
          pathSide: "left",
          pathAlign: "baseline",
          selectable: true,
        };
        pageTemplateJSON.objects[5] = {
          lockMovementY: true,
          lockMovementX: true,
          type: "textbox",
          template_role: "parts_list",
          version: "5.2.1",
          originX: "left",
          originY: "top",
          left: 693.04,
          top: 100.18,
          width: 94.63,
          height: 20.34,
          fill: "rgb(0,0,0)",
          stroke: null,
          strokeWidth: 1,
          strokeDashArray: null,
          strokeLineCap: "butt",
          strokeDashOffset: 0,
          strokeLineJoin: "miter",
          strokeUniform: false,
          strokeMiterLimit: 4,
          scaleX: 1.53,
          scaleY: 1.53,
          angle: 0,
          flipX: false,
          flipY: false,
          opacity: 1,
          shadow: null,
          visible: true,
          backgroundColor: "",
          fillRule: "nonzero",
          paintFirst: "fill",
          globalCompositeOperation: "source-over",
          skewX: 0,
          skewY: 0,
          fontFamily: "Times New Roman",
          fontWeight: "normal",
          fontSize: 18,
          text: this.versionName,
          underline: false,
          overline: false,
          linethrough: false,
          textAlign: "right",
          fontStyle: "normal",
          lineHeight: 1.16,
          textBackgroundColor: "",
          charSpacing: 0,
          styles: {},
          direction: "ltr",
          path: null,
          pathStartOffset: 0,
          pathSide: "left",
          pathAlign: "baseline",
          splitByGrapheme: true,
          absolutePositioned: true,
        };
        pageTemplateJSON.objects[6] = "";
        let top = 190;
        let last_index = 11;
        for (let index = 0; index < final.length; index++) {
          top += 35;
          pageTemplateJSON.objects[11 + index] = {
            type: "i-text",
            template_role: final[index].part_name,
            version: "5.2.1",
            originX: "left",
            originY: "top",
            left: 57.57,
            top,
            width: 764,
            height: 27.12,
            fill: "rgb(0,0,0)",
            stroke: null,
            strokeWidth: 1,
            strokeDashArray: null,
            strokeLineCap: "butt",
            strokeDashOffset: 0,
            strokeLineJoin: "miter",
            strokeUniform: false,
            strokeMiterLimit: 4,
            scaleX: 1.63,
            scaleY: 1.63,
            angle: 0,
            flipX: false,
            flipY: false,
            opacity: 1,
            shadow: null,
            visible: true,
            backgroundColor: "",
            fillRule: "nonzero",
            paintFirst: "fill",
            globalCompositeOperation: "source-over",
            skewX: 0,
            skewY: 0,
            fontFamily: "Times New Roman",
            fontWeight: "normal",
            fontSize: 14,
            text: final[index].part_name,
            underline: false,
            overline: false,
            linethrough: false,
            textAlign: "left",
            fontStyle: "normal",
            lineHeight: 1.16,
            textBackgroundColor: "",
            charSpacing: 0,
            styles: {},
            direction: "ltr",
            path: null,
            pathStartOffset: 0,
            pathSide: "left",
            pathAlign: "baseline",
            selectable: false,
          };
          last_index++;
        }

        let qty_top = 190;
        for (let index = 0; index < final.length; index++) {
          qty_top += 35;
          pageTemplateJSON.objects[last_index + index] = {
            type: "i-text",
            template_role: `qty${final[index].part_name}`,
            version: "5.2.1",
            originX: "left",
            originY: "top",
            left: 750.76,
            top: qty_top,
            width: 764,
            height: 27.12,
            fill: "rgb(0,0,0)",
            stroke: null,
            strokeWidth: 1,
            strokeDashArray: null,
            strokeLineCap: "butt",
            strokeDashOffset: 0,
            strokeLineJoin: "miter",
            strokeUniform: false,
            strokeMiterLimit: 4,
            scaleX: 1.63,
            scaleY: 1.63,
            angle: 0,
            flipX: false,
            flipY: false,
            opacity: 1,
            shadow: null,
            visible: true,
            backgroundColor: "",
            fillRule: "nonzero",
            paintFirst: "fill",
            globalCompositeOperation: "source-over",
            skewX: 0,
            skewY: 0,
            fontFamily: "Times New Roman",
            fontWeight: "normal",
            fontSize: 14,
            text: "",
            underline: false,
            overline: false,
            linethrough: false,
            textAlign: "left",
            fontStyle: "normal",
            lineHeight: 1.16,
            textBackgroundColor: "",
            charSpacing: 0,
            styles: {},
            direction: "ltr",
            path: null,
            pathStartOffset: 0,
            pathSide: "left",
            pathAlign: "baseline",
            selectable: false,
          };
        }
        const dynamicPageData = this.titleJSON ? this.titleJSON : page.canvasJSON;
        const staticPageData = pageTemplateJSON;
        const finalPageData = dynamicPageData.objects.slice();
        const dynamicAnnotations = finalPageData.flatMap((e, i) => (e.type === "rect" || e.type === "LineArrow" ? i : []));
        dynamicAnnotations.forEach((i) => {
          staticPageData.objects.push(finalPageData[i]);
        });
        page.canvasJSON = staticPageData;
      }
      if (page.pageNumber === 1) {
        pageTemplateJSON.objects[4] = {
          lockMovementY: true,
          lockMovementX: true,
          type: "textbox",
          template_role: "title",
          version: "5.2.1",
          originX: "left",
          originY: "top",
          left: 19.61,
          top: 34.47,
          width: 505.1,
          height: 42.94,
          fill: "rgb(0,0,0)",
          stroke: null,
          strokeWidth: 1,
          strokeDashArray: null,
          strokeLineCap: "butt",
          strokeDashOffset: 0,
          strokeLineJoin: "miter",
          strokeUniform: false,
          strokeMiterLimit: 4,
          scaleX: 1.63,
          scaleY: 1.63,
          angle: 0,
          flipX: false,
          flipY: false,
          opacity: 1,
          shadow: null,
          visible: true,
          backgroundColor: "",
          fillRule: "nonzero",
          paintFirst: "fill",
          globalCompositeOperation: "source-over",
          skewX: 0,
          skewY: 0,
          fontFamily: "Arial",
          fontWeight: "bold",
          fontSize: 42,
          text: file[0],
          underline: false,
          overline: false,
          linethrough: false,
          textAlign: "center",
          fontStyle: "normal",
          lineHeight: 1.16,
          textBackgroundColor: "",
          charSpacing: 0,
          styles: {},
          direction: "ltr",
          path: null,
          pathStartOffset: 0,
          pathSide: "left",
          pathAlign: "baseline",
          selectable: true,
          editable: true,
          splitByGrapheme: true,
          absolutePosition: true,
        };
        pageTemplateJSON.objects[9] = {
          type: "i-text",
          template_role: "bom_title",
          version: "5.2.1",
          originX: "left",
          originY: "top",
          left: 57.57,
          top: 135.78,
          width: 764,
          height: 42.94,
          fill: "rgb(0,0,0)",
          stroke: null,
          strokeWidth: 1,
          strokeDashArray: null,
          strokeLineCap: "butt",
          strokeDashOffset: 0,
          strokeLineJoin: "miter",
          strokeUniform: false,
          strokeMiterLimit: 4,
          scaleX: 0.88,
          scaleY: 0.88,
          angle: 0,
          flipX: false,
          flipY: false,
          opacity: 1,
          shadow: null,
          visible: true,
          backgroundColor: "",
          fillRule: "nonzero",
          paintFirst: "fill",
          globalCompositeOperation: "source-over",
          skewX: 0,
          skewY: 0,
          fontFamily: "Arial",
          fontWeight: "bold",
          fontSize: 28,
          text: this.bomTitle,
          underline: false,
          overline: false,
          linethrough: false,
          textAlign: "left",
          fontStyle: "normal",
          lineHeight: 1.16,
          textBackgroundColor: "",
          charSpacing: 0,
          styles: {},
          direction: "ltr",
          path: null,
          pathStartOffset: 0,
          pathSide: "left",
          pathAlign: "baseline",
          selectable: true,
          lockMovementY: true,
          lockMovementX: true,
        };
        pageTemplateJSON.objects[5] = {
          lockMovementY: true,
          lockMovementX: true,
          type: "textbox",
          template_role: "parts_list",
          version: "5.2.1",
          originX: "left",
          originY: "top",
          left: 693.04,
          top: 100.18,
          width: 94.63,
          height: 20.34,
          fill: "rgb(0,0,0)",
          stroke: null,
          strokeWidth: 1,
          strokeDashArray: null,
          strokeLineCap: "butt",
          strokeDashOffset: 0,
          strokeLineJoin: "miter",
          strokeUniform: false,
          strokeMiterLimit: 4,
          scaleX: 1.53,
          scaleY: 1.53,
          angle: 0,
          flipX: false,
          flipY: false,
          opacity: 1,
          shadow: null,
          visible: true,
          backgroundColor: "",
          fillRule: "nonzero",
          paintFirst: "fill",
          globalCompositeOperation: "source-over",
          skewX: 0,
          skewY: 0,
          fontFamily: "Times New Roman",
          fontWeight: "normal",
          fontSize: 18,
          text: this.versionName,
          underline: false,
          overline: false,
          linethrough: false,
          textAlign: "right",
          fontStyle: "normal",
          lineHeight: 1.16,
          textBackgroundColor: "",
          charSpacing: 0,
          styles: {},
          direction: "ltr",
          path: null,
          pathStartOffset: 0,
          pathSide: "left",
          pathAlign: "baseline",
          splitByGrapheme: true,
          absolutePositioned: true,
        };
        pageTemplateJSON.objects[6] = "";

        let top = 190;
        let last_index = 11;
        // part name loop
        for (let index = 0; index < final.length; index++) {
          const string = final[index].part_name;
          const length = 11;
          const trimmedString = string.substring(0, length);
          const wraptrimmedString = trimmedString.replace(trimmedString, `${trimmedString}.....`);
          top += 35;
          pageTemplateJSON.objects[11 + index] = {
            type: "i-text",
            template_role: final[index].part_name,
            version: "5.2.1",
            originX: "left",
            originY: "top",
            left: 57.57,
            top,
            width: 764,
            height: 27.12,
            fill: "rgb(0,0,0)",
            stroke: null,
            strokeWidth: 1,
            strokeDashArray: null,
            strokeLineCap: "butt",
            strokeDashOffset: 0,
            strokeLineJoin: "miter",
            strokeUniform: false,
            strokeMiterLimit: 4,
            scaleX: 1.63,
            scaleY: 1.63,
            angle: 0,
            flipX: false,
            flipY: false,
            opacity: 1,
            shadow: null,
            visible: true,
            backgroundColor: "",
            fillRule: "nonzero",
            paintFirst: "fill",
            globalCompositeOperation: "source-over",
            skewX: 0,
            skewY: 0,
            fontFamily: "Times New Roman",
            fontWeight: "normal",
            fontSize: 14,
            text: "",
            underline: false,
            overline: false,
            linethrough: false,
            textAlign: "left",
            fontStyle: "normal",
            lineHeight: 1.16,
            textBackgroundColor: "",
            charSpacing: 0,
            styles: {},
            direction: "ltr",
            path: null,
            pathStartOffset: 0,
            pathSide: "left",
            pathAlign: "baseline",
            selectable: false,
          };
          last_index++;
        }
        let qty_top = 190;

        // Part Qty loop
        for (let index = 0; index < final.length; index++) {
          qty_top += 35;
          pageTemplateJSON.objects[last_index + index] = {
            type: "i-text",
            template_role: `qty${final[index].part_name}`,
            version: "5.2.1",
            originX: "left",
            originY: "top",
            left: 750.76,
            top: qty_top,
            width: 764,
            height: 27.12,
            fill: "rgb(0,0,0)",
            stroke: null,
            strokeWidth: 1,
            strokeDashArray: null,
            strokeLineCap: "butt",
            strokeDashOffset: 0,
            strokeLineJoin: "miter",
            strokeUniform: false,
            strokeMiterLimit: 4,
            scaleX: 1.63,
            scaleY: 1.63,
            angle: 0,
            flipX: false,
            flipY: false,
            opacity: 1,
            shadow: null,
            visible: true,
            backgroundColor: "",
            fillRule: "nonzero",
            paintFirst: "fill",
            globalCompositeOperation: "source-over",
            skewX: 0,
            skewY: 0,
            fontFamily: "Times New Roman",
            fontWeight: "normal",
            fontSize: 14,
            text: "",
            underline: false,
            overline: false,
            linethrough: false,
            textAlign: "left",
            fontStyle: "normal",
            lineHeight: 1.16,
            textBackgroundColor: "",
            charSpacing: 0,
            styles: {},
            direction: "ltr",
            path: null,
            pathStartOffset: 0,
            pathSide: "left",
            pathAlign: "baseline",
            selectable: false,
          };
        }
        const dynamicPageData = this.bomJSON ? this.bomJSON : page.canvasJSON;
        const staticPageData = pageTemplateJSON;
        const finalPageData = dynamicPageData.objects.slice();
        const dynamicAnnotations = finalPageData.flatMap((e, i) => (e.type === "rect" || e.type === "LineArrow" ? i : []));
        dynamicAnnotations.forEach((i) => {
          staticPageData.objects.push(finalPageData[i]);
        });
        page.canvasJSON = staticPageData;
      }
    }
    // ------------------- BOM PAGE END ------------------------------------------//
    if (pageElem) page.update(pageElem);
    this.currPage = page;
  }

  // Handle a click on assembly item in HTML view.
  handleItemClick(event, item) {
    if (!item.parts.every((x) => x.isSelected) && item.parts.some((x) => x.isSelected)) item.parts.forEach((x) => (x.isSelected = false));

    this.asm.togglePartsSelection(item.parts, event.ctrlKey);
    this.setCurrItem(this.asm.getSelectedParts().length ? item : null);
    this.asm.updateStep();
    this.update3dHighl();
    this.viewer.render(true);
  }

  // Handle a click on assembly part, either in 3D view or HTML.
  handlePartClick(event, item, part) {
    this.asm.togglePartsSelection([part], event.ctrlKey);
    this.setCurrItem(this.asm.getSelectedParts().length ? item : null);
    this.asm.updateStep();
    this.update3dHighl();
    this.viewer.render(true);
  }

  // Create current assembly from parsed GLTF and raw GLTF data.
  importAsm(gltf, rawGltf) {
    // Enable shadows.
    gltf.scene.traverse((mesh) => {
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    this.setAsm(new Asm(gltf, rawGltf));
  }

  // Set current assembly.
  async setAsm(asm) {
    if (this.asm) {
      const oldAsmObj3d = this.asm.rootObj3d;
      this.viewer.disposeOfMesh(oldAsmObj3d);
      this.viewer.scene.remove(oldAsmObj3d);
    }

    asm.rootObj3d.scale.set(q20Cfg.baseScale, q20Cfg.baseScale, q20Cfg.baseScale);
    this.asm = asm;
    this.pages = [];
    this.viewer.setAsmObj3d(this.asm.rootObj3d);
    this.viewer.initView();

    // Original view and layout for "reset" functionality; they never change.
    this.origLayout = this.asm.getLayout();
    this.origView = new View(this.origLayout, this.viewer);

    this.defaultView = this.origView.clone();
    this.setView(this.defaultView);
  }

  // Output error message for the user.
  showError(err) {
    console.log(err);
  }

  // Return true if there're any saved views.
  hasViews() {
    return this.asm && this.asm.tree.some((x) => x.views && x.views.length);
  }

  // Set current view to given one.
  setView(view) {
    this.view = view;
    this.asm.setLayout(view.layout);
    this.view.apply(this.viewer);
  }

  // Create a new view from the current state.
  createView() {
    this.update3dHighl(true);
    this.currItem.views.push(new View(this.asm.getLayout(), this.viewer));
    this.update3dHighl();
    this.viewer.render(true);
  }

  // Update given view from the current viewer.
  updateView(view) {
    this.update3dHighl(true);
    view.update(this.viewer);
    this.update3dHighl();
    this.viewer.render(true);
  }

  // Remove a view.
  removeView(view) {
    for (const arr of [this.pages, this.asm.tree]) {
      for (const elem of arr) {
        if (!elem.views.some((x) => x.uuid === view.uuid)) continue;
        if (elem instanceof Page) {
          elem.deleteObject(view.uuid, elem);
        }
        elem.views = elem.views.filter((x) => x.uuid !== view.uuid);
        if (elem !== this.currPage && elem instanceof Page) elem.hasNewUpdates = true;
      }
    }
  }

  // Return name of image file for an item and view numbers.
  getViewFileName(itemIdx, viewIdx) {
    return q20Cfg.viewFileNameTmpl.replace("%i", itemIdx + 1).replace("%v", viewIdx + 1);
  }

  // Return title for an instructions page.
  getPageTitle(page) {
    return `Operation ${this.pages.findIndex((x) => x === page) + 1}`;
  }

  // Start download of a data URL as file.
  downloadFile(dataUrl, fileName) {
    // const link = document.createElement("a");
    // document.body.appendChild(link);
    // link.download = fileName;
    // link.href = dataUrl;
    // link.click();
    // link.parentNode.removeChild(link);

    window.open(dataUrl);
  }

  // Download all images of all views in a Zip archive.
  downloadViewImages() {
    this.startWaitingModally();
    const zip = new JSZip();

    for (const [i, item] of this.asm.tree.entries()) {
      if (!item.views) continue;

      for (const [j, view] of item.views.entries()) {
        const base64data = view.dataUrl.replace(/^data:image\/png;base64,/, "");
        zip.file(this.getViewFileName(i, j), base64data, { base64: true });
      }
    }

    zip.generateAsync({ type: "base64" }).then((content) => {
      this.stopWaitingModally();
      this.downloadFile(`data:application/zip;base64,${content}`, q20Cfg.imagesFileName);
    });
  }

  // Add BOM page to the PDF.
  addPdfBom(pdf) {
    let [x, y] = q20Cfg.pageBomMargins;

    const addTitle = () => {
      pdf.setFont(undefined, "bold");
      pdf.text(q20Cfg.pageBomTitle, ...q20Cfg.pageBomMargins);
      pdf.setFont(undefined, "normal");
      y += q20Cfg.pageBomMargins[1];
    };
    addTitle();

    let partNum = 0;
    for (const item of this.asm.tree) {
      for (const [i, part] of item.parts.entries()) {
        partNum++;
        pdf.text(`${partNum}. ${part.name}`, x, y);
        y += q20Cfg.pageBomLineHeight;

        if (y > q20Cfg.pageSize[1] - q20Cfg.pageBomMargins[1]) {
          y = q20Cfg.pageBomMargins[1] + q20Cfg.pageBomLineHeight;
          if (x > q20Cfg.pageBomMargins[0]) {
            // already in second column?
            x = q20Cfg.pageBomMargins[0];
            pdf.addPage();
            addTitle();
          } else x += (q20Cfg.pageSize[0] - q20Cfg.pageBomMargins[0] * 2) / 2;
        }
      }
    }
  }

  // Return string with names and counts of parts visible in views of a page.
  getPagePartsDescr(page) {
    const seenParts = new Set();
    const namesCounts = {};

    for (const view of page.views) {
      const step = this.asm.tree.findIndex((x) => x.views.some((y) => y.uuid === view.uuid));
      if (step < 0) throw "Unable to find view-owning item";

      for (const part of this.asm.tree[step].parts) {
        if (seenParts.has(part)) continue;
        seenParts.add(part);
        namesCounts[part.name] = (namesCounts[part.name] || 0) + 1;
      }
    }

    const sortedNames = Object.keys(namesCounts).sort();
    return sortedNames.map((x) => `${x} (${namesCounts[x]})`).join(", ");
  }

  // Download the instructions as a PDF file.
  downloadPdf(pageElem) {
    this.startWaitingModally();

    const pages_json = {
      pages: [],
    };

    for (let i = 0; i < app.pages.length; i++) {
      pages_json.pages.push(app.pages[i].canvasJSON);
    }

    fetch(q20Cfg.pdfUrl, { method: "POST", body: JSON.stringify(pages_json), headers: { "Content-Type": "application/json" } })
      .then((res) => res.json())
      .then((data) => {
        window.open(data.url, "_blank");
        this.stopWaitingModally();
      })
      .catch((err) => {
        console.error("Error: ", err);
        this.stopWaitingModally();
      });

    // this.downloadFile(pdf.output("datauristring"), q20Cfg.pdfFileName);
    this.stopWaitingModally();
  }

  // Set how explosion works for selected parts. If "mode" is false, no moving
  // is possible. Value of "f" allows to move freely; "u" - vertically, with
  // respect to current view; "x","y","z" - along respective axis only.
  setExplMode(parts, mode) {
    if (!mode) {
      parts.forEach((x) => delete x.explDir);
      return;
    }

    if (mode === "u") {
      const camPlane = new THREE.Plane();
      this.viewer.camera.getWorldDirection(camPlane.normal);

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0.5), this.viewer.camera);

      const explDir = new THREE.Vector3();
      raycaster.ray.intersectPlane(camPlane, explDir);
      explDir.normalize();

      parts.forEach((x) => (x.explDir = explDir));
      return;
    }

    if (mode === "f") {
      // Use zero vector as sentinel value for unconstrained motion.
      const explDir = new THREE.Vector3();
      parts.forEach((x) => (x.explDir = explDir));
      return;
    }

    if (["x", "y", "z"].find((x) => x === mode)) {
      for (const part of parts) {
        const partObj = this.asm.getPartObj(part);
        part.explDir = new THREE.Vector3();
        part.explDir[mode] = 1;
        partObj.parent.worldToLocal(part.explDir);
      }
      return;
    }

    throw `Unknown explosion mode: "${mode}"`;
  }

  // Choose explosion direction mode by clicking a part object face.
  chooseExplDir() {
    this.viewer.setNextObjClickHandler((event, intersect) => {
      const part = this.getObj3dPart(intersect.object);
      if (!part) {
        WARN("No part clicked");
        return;
      }

      // Explosion direction is the normal of chosen face in world coordinates.
      part.explDir = intersect.face.normal.clone();
      const normalMatrix = new THREE.Matrix3();
      normalMatrix.getNormalMatrix(intersect.object.matrixWorld);
      part.explDir.applyMatrix3(normalMatrix).normalize();

      INFO("Explosion direction set for", part.name);
    });
  }

  // Start part name editing in tree.
  startPartEdit(part) {
    this.cancelPartEdit();
    this.editedPart = part;
    const container = document.getElementById(`partRow${part.obj3dName}`);
    container.classList.add("edited");
    document.getElementById(`partNameInput${part.obj3dName}`).focus();
  }

  // Cancel part name editing in tree.
  cancelPartEdit() {
    if (!this.editedPart) return;

    const part = this.editedPart;
    this.editedPart = null;

    const container = document.getElementById(`partRow${part.obj3dName}`);
    container.classList.remove("edited");
    document.getElementById(`partNameInput${part.obj3dName}`).value = part.name;
  }

  // Finish part name editing in tree, saving the result.
  finishPartEdit() {
    const part = this.editedPart;
    this.editedPart = null;

    const container = document.getElementById(`partRow${part.obj3dName}`);
    const input = document.getElementById(`partNameInput${part.obj3dName}`);
    if (input.value) {
      part.name = input.value;
    }
    input.value = part.name;
    container.classList.remove("edited");
  }

  // Create a Autotitle page of instructions.
  autoCreateTitlePage() {
    this.createPage();
    this.pages[0].pageTitle = "Title Page";
  }

  // Auto create page for bill-of materials
  autoCreateBomPage() {
    this.createPage();
    this.pages[1].pageTitle = "BOM Page";
  }

  // Save Page List
  async savePageList() {
    document.getElementById("modalBlocker2").style.display = "block";
    const formData = new FormData();
    const file = this.fileName.split(".");
    const pageListData = app.pages.map((it) => {
      const {
        texttool, recttool, arrow, titleNameRollBack, versionNameRollBack, topValue, ...rest
      } = it;
      return {
        titleNameRollBack: file[0], versionNameRollBack: this.versionName, topValue: this.currPage.topValue, ...rest,
      };
    });
    // Save Pages Data
    await fetch(q20Cfg.savePagesList, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_list: pageListData,
      }),
    }).then((response) => {
      if (response.ok) {
        return response.json();
      }
      return Promise.reject(response);
    })
      .then((json) => {
      })
      .catch((response) => {
        console.log("err response", response);
      });
    const {
      rawGltf, rootObj3d, origLayout, ...rest
    } = this.asm;
    // Save assembly tree
    formData.append("assembly_Data", JSON.stringify(rest));
    await fetch(q20Cfg.saveassemblytress, {
      method: "POST",
      body: formData,
    });
    this.fetchAllPages();
    document.getElementById("modalBlocker2").style.display = "none";
  }

  drop(e) {
    e.preventDefault();
    const clone = e.target.cloneNode(true);
    const newPages = [...this.pages];
    newPages.splice(clone.id, 0, newPages.splice(this.dragData, 1)[0]);
    this.pages = newPages;
    return this.pages;
  }

  drag(e) {
    this.dragData = e.target.id;
  }

  // Assembly drag and drop
  asmDrop(e) {
    e.preventDefault();
    const clone = e.target.cloneNode(true);
    const dstIdx = document.getElementById(clone.id).getAttribute("data");
    const movedItem = this.asm.tree[this.asmDragData];
    const srcIdx = app.asm.tree.findIndex((x) => x === movedItem);
    const offset = dstIdx - srcIdx;
    this.asm.moveItem(movedItem, offset);
    setTimeout(() => {
      app.viewer.render(true);
    }, 10);
  }

  asmDrag(e) {
    this.asmDragData = e.target.id;
  }
}
exportObj("App", App);
