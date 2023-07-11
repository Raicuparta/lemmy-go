export default {
  name: "Lemmy Go",
  description: "Quickly navigate to a Lemmy community from the address bar.",
  version: "0.6.0",
  manifest_version: 3,
  background: {
    type: "module",
  },
  omnibox: {
    keyword: "lc",
  },
  permissions: ["storage"],
  action: {
    default_icon: "icon.png",
    default_popup: "options.html",
  },
  options_ui: {
    page: "options.html",
  },
  icons: {
    128: "icon.png",
  },
};