/* eslint-disable no-param-reassign */
/* eslint-disable no-unused-vars */
/* eslint-disable no-loop-func */
/* eslint-disable no-console */
/* eslint-disable no-undef */
/* eslint-disable no-plusplus */
// Create global logging / messaging functions.
const logLevels = ["CRIT", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"];
for (let i = 0; i < logLevels.length; i++) {
  const levelName = logLevels[i];
  window[levelName] = i > q20Cfg.logLevel
    ? () => {}
    : (...args) => {
      console.log(levelName.padEnd(5, " "), ...args);
      if (i > 2) {
        // INFO and higher
        const msgBox = document.getElementById("msgBox");
        msgBox.className = `msg${levelName}`;
        const msg = args.join(" ");
        msgBox.innerText = msg;
        setTimeout(() => {
          if (msgBox.innerText === msg) msgBox.innerText = "";
        }, q20Cfg.msgDisplayTime * 1000);
      }
    };
}

// Exclude given object from proxying by @vue/reactive and return it.
function makeNonReactive(obj) {
  obj.__v_skip = true;
  return obj;
}

// Export object, automatically deciding between CommonJS and standalone modes.
function exportObj(name, obj) {
  if (typeof module !== "undefined" && module.exports) {
    // CommonJS import mode.
    module.exports[name] = obj;
    return;
  }

  // Standalone (classic JS) import mode.
  if (!window.Q20) window.Q20 = {};
  window.Q20[name] = obj;
}

function lastArrElem(arr) {
  return arr.length ? arr[arr.length - 1] : undefined;
}
