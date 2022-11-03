"use strict";
const settings_1 = require("./settings");
const neurio_1 = require("./neurio");
module.exports = (homebridge) => {
    homebridge.registerAccessory(settings_1.PLUGIN_NAME, settings_1.ACCESSORY_NAME, neurio_1.NeurioAccessory);
};
//# sourceMappingURL=index.js.map