export default {
  background: {
    scripts: ["background.js"],
  },
  options_ui: {
    browser_style: false,
  },
  browser_specific_settings: {
    gecko: {
      id: "lemmy-communities@raicuparta.com",
      strict_min_version: "109.0",
    },
  },
};
