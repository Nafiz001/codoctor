// The default Expo/Hermes pipeline leaves ES private class fields (`this.#x`)
// in the release bundle, which hermesc (RN 0.81) rejects with `error: private`.
// We explicitly transpile private fields/methods to WeakMap/property form so
// Hermes never sees them. `assumptions` keeps all three plugins in the same
// (loose) mode, avoiding Babel's "loose mode" consistency error.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    assumptions: {
      setPublicClassFields: true,
      privateFieldsAsProperties: true,
    },
    plugins: [
      "@babel/plugin-transform-class-properties",
      "@babel/plugin-transform-private-methods",
      "@babel/plugin-transform-private-property-in-object",
    ],
  };
};
