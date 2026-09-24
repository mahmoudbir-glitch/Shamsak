export type BatteryState='charging'|'discharging'|'idle';
export type EnergySnapshot={timestamp:string;solarPowerW:number;homePowerW:number;gridPowerW:number;batteryPowerW:number;batterySoc:number;batteryVoltage?:number;batteryCurrent?:number;batteryTemperature?:number;gridConnected:boolean;source:'live'|'demo';};

export const demoSnapshot:EnergySnapshot={
 timestamp:new Date().toISOString(),solarPowerW:5827,homePowerW:1299,gridPowerW:-452,batteryPowerW:4976,batterySoc:78,batteryVoltage:25.6,batteryCurrent:194,batteryTemperature:29,gridConnected:true,source:'demo'
};

export function batteryState(w:number):BatteryState{return w>50?'charging':w<-50?'discharging':'idle';}
export function gridLabel(w:number,connected:boolean){if(!connected)return 'الشبكة مفصولة';return w>50?'سحب من الشبكة':w<-50?'تصدير إلى الشبكة':'متوازنة';}
export function energyBalance(s:EnergySnapshot){const solar=s.solarPowerW/1000, grid=s.gridPowerW/1000, battery=s.batteryPowerW/1000, load=s.homePowerW/1000;return {solar,grid,battery,load,residual:solar+Math.max(grid,0)+Math.max(-battery,0)-load-Math.max(battery,0)-Math.max(-grid,0)};}
export function kwhFromPower(powerW:number,hours:number){return Math.max(0,powerW)/1000*hours;}