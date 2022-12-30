// Global app configuration.
const q20Cfg = {
  logLevel: 3,
  baseScale: 0.001,
  zoomSpeed: 1,
  rotateSpeed: 2.5,
  panSpeed: 0.05,
  autoZoomFactor: 2,
  // viewerBgColor: "white", // legacy from before
  highlColor: 0x7897ab, // changed from string to hex
  camInitPos: [1.5, 2, 2], // initial camera position
  camLightPos: [1.5, 2, 2], // position of on-cam light relative to cam itself
  camLightIntensity: 3,
  axesSize: 1,
  axesBgColor: "white",
  axesViewSize: 100,
  convUrl: "/convert/stp2glb",
  pdfUrl: "/convert/pdf",
  getiddetails: "/fetch_uniqueid_detail/",
  savepages: "/savepages",
  getpages: "/getpagedetails",
  shareprojects: "/shareprojects",
  saveassemblytress: "/save_assembly_tree",
  getassemblytree: "/get_assembly_tree",
  updateassemblypart: "/update_assembly_tree_part",
  savePagesList: "/savepageslist",
  fetchPagesList: "/getpageslist",
  deletePagesList: "/deletepagesdata",
  pdfDownloadUrl: "/convert/pdf/download/",
  imagesFileName: "screenshots.zip",
  pdfFileName: "instructions.pdf",
  viewFileNameTmpl: "Step%i.%v.png",
  stateFileName: "project.json",
  viewUpdateDelay: 5,
  popupMenuOffs: [3, 3], // offset of popup menu relative to mouse pointer
  maxPageTextLen: 500,
  showUpdateViewsButton: false,
  msgDisplayTime: 10,
  explodeGroupTogether: true, // if true, grouped parts are exploded together

  // All page settings are in mm.
  pageSize: [216, 279], // US letter
  pxPerMm: 4,
  pagePdfOffset: [0, 5], // offset page elements relative to HTML representation
  pageTitlePos: [10, 7],
  pageTitleFontSize: 7,
  pageTextFontSize: 24,
  pageTextBoxPos: [10, 216],
  pageTextBoxSize: [196, 55],
  pageTextBoxInitValue: "Text here", // text to show if page text is empty
  pageImagesSettings: [
    [
      // for one image per page
      [10, 60, 196, 150], // x, y, width, height
    ],
    [
      // for two images per page, and so on
      [10, 60, 85, 85],
      [108, 60, 85, 85],
    ],
    [
      [10, 40, 85, 85],
      [108, 40, 85, 85],
      [50, 115, 85, 85],
    ],
    [
      [10, 40, 85, 85],
      [108, 40, 85, 85],
      [10, 130, 85, 85],
      [108, 130, 85, 85],
    ],
  ],

  // "Parts in operation" text box.
  pagePartsInOpPos: [10, 17], // parts in operation insert
  pagePartsInOpSize: [196, 10],
  pagePartsInOpFontSize: 5,

  // BOM page.
  pageBomOn: true,
  pageBomLineHeight: 8,
  pageBomMargins: [10, 10],
  pageBomTitle: "Bill of Materials",
};

module.exports = {
  cfg() {
    return q20Cfg;
  },
};
