"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeurioAccessory = void 0;
const hap_nodejs_community_types_1 = require("hap-nodejs-community-types");
const settings_1 = require("./settings");
const node_fetch_1 = __importDefault(require("node-fetch"));
const underscore_1 = __importDefault(require("underscore"));
class NeurioAccessoryOptions {
}
class NeurioChannel {
    constructor(data) {
        this.voltAmps = Math.round(Math.abs(data["q_VAR"]));
        this.volts = Math.round(Math.abs(data["v_V"]));
        this.watts = Math.round(Math.abs(data["p_W"]));
        let importedEnergy = data["eImp_Ws"];
        let exportedEnergy = data["eExp_Ws"];
        if (isNaN(importedEnergy) || isNaN(exportedEnergy)) {
            this.kilowattHours = 0;
        }
        else {
            this.kilowattHours = Math.round((importedEnergy - exportedEnergy) / (60 * 60 * 1000));
        }
    }
}
class NeurioAccessory {
    constructor(log, config, api) {
        this.api = api;
        this.log = log;
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
        let url = new URL(config.url);
        url.protocol = "http";
        url.pathname = "/current-sample";
        this.options = {
            username: config.username,
            password: config.password,
            url: url,
            name: config.name || settings_1.ACCESSORY_NAME,
            pollingInterval: config.pollingInterval || 60,
            verbose: config.verbose || false,
            serialNo: config.serialNo || url.hostname
        };
        this.voltage = 0;
        this.current = 0;
        this.watts = 0;
        this.powerService = new this.Service.PowerManagement(settings_1.ACCESSORY_NAME);
        this.powerService.addCharacteristic(hap_nodejs_community_types_1.CommunityTypes.Volts);
        this.powerService.addCharacteristic(hap_nodejs_community_types_1.CommunityTypes.VoltAmperes);
        this.powerService.addCharacteristic(hap_nodejs_community_types_1.CommunityTypes.Watts);
        this.powerService.addCharacteristic(hap_nodejs_community_types_1.CommunityTypes.KilowattHours);
        this.infoService = new this.Service.AccessoryInformation()
            .setCharacteristic(this.Characteristic.Name, config.name)
            .setCharacteristic(this.Characteristic.Manufacturer, "neur.io")
            .setCharacteristic(this.Characteristic.Model, "Home Energy Monitor")
            .setCharacteristic(this.Characteristic.Name, config.name);
        this.powerService
            .getCharacteristic(hap_nodejs_community_types_1.CommunityTypes.Volts)
            .on("get" /* CharacteristicEventTypes.GET */, this.getVolts.bind(this));
        this.powerService
            .getCharacteristic(hap_nodejs_community_types_1.CommunityTypes.VoltAmperes)
            .on("get" /* CharacteristicEventTypes.GET */, this.getVoltAmperes.bind(this));
        this.powerService
            .getCharacteristic(hap_nodejs_community_types_1.CommunityTypes.Watts)
            .on("get" /* CharacteristicEventTypes.GET */, this.getWatts.bind(this));
        this.powerService
            .getCharacteristic(hap_nodejs_community_types_1.CommunityTypes.KilowattHours)
            .on("get" /* CharacteristicEventTypes.GET */, this.getKilowattHours.bind(this));
        setTimeout(this.fetchChannel.bind(this), 1 * 1000);
        const interval = ((this.options.pollingInterval && this.options.pollingInterval > 10 ? this.options.pollingInterval : 60) * 1000);
        setInterval(this.fetchChannel.bind(this), interval);
    }
    async fetchChannel() {
        const response = await (0, node_fetch_1.default)(this.options.url.toString());
        const data = await response.json();
        if ((data) && (data["sensorId"])) {
            this.infoService.setCharacteristic(this.Characteristic.SerialNumber, data["sensorId"]);
        }
        const channel = underscore_1.default.find(data["channels"], function (entry) { return entry.type === 'CONSUMPTION'; });
        const nc = new NeurioChannel(channel);
        this.powerService.setCharacteristic(hap_nodejs_community_types_1.CommunityTypes.Volts, channel.volts);
        this.powerService.setCharacteristic(hap_nodejs_community_types_1.CommunityTypes.VoltAmperes, channel.voltAmps);
        this.powerService.setCharacteristic(hap_nodejs_community_types_1.CommunityTypes.Watts, channel.watts);
        this.powerService.setCharacteristic(hap_nodejs_community_types_1.CommunityTypes.KilowattHours, channel.kilowattHours);
        return nc;
    }
    async getVolts() {
        let channel = await this.fetchChannel();
        return channel.volts;
    }
    async getVoltAmperes() {
        let channel = await this.fetchChannel();
        return channel.voltAmps;
    }
    async getWatts() {
        let channel = await this.fetchChannel();
        return channel.watts;
    }
    async getKilowattHours() {
        let channel = await this.fetchChannel();
        return channel.kilowattHours;
    }
    getServices() {
        return [
            this.infoService,
            this.powerService
        ];
    }
}
exports.NeurioAccessory = NeurioAccessory;
//# sourceMappingURL=neurio.js.map