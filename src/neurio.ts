import { Service, Characteristic, CharacteristicValue, CharacteristicEventTypes, CharacteristicGetCallback, Logger, API, AccessoryConfig } from 'homebridge';
import { CommunityTypes } from "hap-nodejs-community-types"
import { ACCESSORY_NAME } from './settings';
import fetch from "node-fetch";
import underscore from "underscore";

class NeurioAccessoryOptions {
  public url!: URL
  public name!: string
  public pollingInterval!: number
  public username?: string
  public password?: string
  public verbose: boolean
  public serialNo: string
}

class NeurioChannel {
  public voltAmps: number
  public volts: number
  public watts: number
  public kilowattHours: number

  constructor(data: any) {
    this.voltAmps = Math.round(Math.abs(data["q_VAR"]))
    this.volts = Math.round(Math.abs(data["v_V"]))
    this.watts = Math.round(Math.abs(data["p_W"]))

    let importedEnergy: number = data["eImp_Ws"]
    let exportedEnergy: number = data["eExp_Ws"]
    if (isNaN(importedEnergy) || isNaN(exportedEnergy)) {
      this.kilowattHours = 0
    } else {
      this.kilowattHours = Math.round((importedEnergy - exportedEnergy) / (60 * 60 * 1000))
    }
  }
}

export class NeurioAccessory {

  public readonly api: API
  public readonly log: Logger

  public readonly Service: typeof Service
  public readonly Characteristic: typeof Characteristic

  private options: NeurioAccessoryOptions
  private voltage: number
  private current: number
  private watts: number

  private powerService: Service
  private infoService: Service
  
  constructor(log: Logger, config: AccessoryConfig, api: API) {
    this.api = api
    this.log = log
    this.Service = api.hap.Service
    this.Characteristic = api.hap.Characteristic
    let url = new URL(config.url)
    url.protocol = "http"
    url.pathname = "/current-sample"

    this.options = {
      username: config.username,
      password: config.password,
      url: url, 
      name: config.name || ACCESSORY_NAME,
      pollingInterval: config.pollingInterval || 60,
      verbose: config.verbose || false,
      serialNo: config.serialNo || url.hostname
    }

    this.voltage = 0
    this.current = 0
    this.watts = 0
    this.powerService = new this.Service.PowerManagement(ACCESSORY_NAME)
    this.powerService.addCharacteristic(CommunityTypes.Volts)
    this.powerService.addCharacteristic(CommunityTypes.VoltAmperes)
    this.powerService.addCharacteristic(CommunityTypes.Watts)
    this.powerService.addCharacteristic(CommunityTypes.KilowattHours)
    this.infoService = new this.Service.AccessoryInformation()
      .setCharacteristic(this.Characteristic.Name, config.name)
      .setCharacteristic(this.Characteristic.Manufacturer, "neur.io")
      .setCharacteristic(this.Characteristic.Model, "Home Energy Monitor")
      .setCharacteristic(this.Characteristic.Name, config.name)
    
    this.powerService
      .getCharacteristic(CommunityTypes.Volts)
      .on(CharacteristicEventTypes.GET, this.getVolts.bind(this))
    this.powerService
      .getCharacteristic(CommunityTypes.VoltAmperes)
      .on(CharacteristicEventTypes.GET, this.getVoltAmperes.bind(this))
    this.powerService
      .getCharacteristic(CommunityTypes.Watts)
      .on(CharacteristicEventTypes.GET, this.getWatts.bind(this))
    this.powerService
      .getCharacteristic(CommunityTypes.KilowattHours)
      .on(CharacteristicEventTypes.GET, this.getKilowattHours.bind(this))
    
    setTimeout(this.fetchChannel.bind(this), 1 * 1000)
    const interval = ((this.options.pollingInterval && this.options.pollingInterval > 10 ? this.options.pollingInterval : 60) * 1000)
    setInterval(this.fetchChannel.bind(this), interval)
  }

  async fetchChannel(): Promise<NeurioChannel> {
    const response = await fetch(this.options.url.toString())
    const data = await response.json()
    if ((data) && (data["sensorId"])) {
      this.infoService.setCharacteristic(this.Characteristic.SerialNumber, data["sensorId"])
    }
    const channel = underscore.find(data["channels"], function (entry) { return entry.type === 'CONSUMPTION' })
    const nc = new NeurioChannel(channel)
    this.powerService.setCharacteristic(CommunityTypes.Volts, channel.volts)
    this.powerService.setCharacteristic(CommunityTypes.VoltAmperes, channel.voltAmps)
    this.powerService.setCharacteristic(CommunityTypes.Watts, channel.watts)
    this.powerService.setCharacteristic(CommunityTypes.KilowattHours, channel.kilowattHours)
    
    return nc
  }

  async getVolts(): Promise<CharacteristicValue> {
    let channel = await this.fetchChannel()
    return channel.volts
  }

  async getVoltAmperes(): Promise<CharacteristicValue> {
    let channel = await this.fetchChannel()
    return channel.voltAmps
  }

  async getWatts(): Promise<CharacteristicValue> {
    let channel = await this.fetchChannel()
    return channel.watts
  }

  async getKilowattHours(): Promise<CharacteristicValue> {
    let channel = await this.fetchChannel()
    return channel.kilowattHours
  }

  getServices(): Service[] {
    return [
      this.infoService,
      this.powerService
    ]
  }

}