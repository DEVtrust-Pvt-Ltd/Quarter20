/* eslint-disable no-undef */
/* eslint-disable max-len */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-shadow */
// Base class for all app classes.
class Base {
  // Get type name of the class.
  static classTypeName(classFunc, maxDepth) {
    // eslint-disable-next-line no-param-reassign
    if (!classFunc) classFunc = this;
    const types = [];

    const walkAncestors = (classFunc) => {
      if (types.length > maxDepth || classFunc.name === "Base") return;
      types.unshift(classFunc.name);
      walkAncestors(Object.getPrototypeOf(classFunc));
    };

    walkAncestors(classFunc);
    return types.join(".");
  }

  // Return object state as a plain JS object.
  serialize() {
    const res = {};

    for (const name in this) {
      if (!this.hasOwnProperty(name)) continue;
      if (this[name] instanceof Base) res[name] = this[name].serialize();
      else res[name] = JSON.parse(JSON.stringify(this[name]));
    }

    return res;
  }

  // Initialize object from serialized data.
  deserialize(serialized) {
    for (const name in serialized) {
      if (serialized.hasOwnProperty(name)) this[name] = JSON.parse(JSON.stringify(serialized[name]));
    }

    return this;
  }
}
exportObj(Base, "Base");
