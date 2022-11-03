import { API } from 'homebridge';
import { PLUGIN_NAME, ACCESSORY_NAME } from './settings';
import { NeurioAccessory } from './neurio';

export = (homebridge: API) => {
    homebridge.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, NeurioAccessory);
};