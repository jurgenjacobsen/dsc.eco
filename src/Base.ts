import EventEmitter from "events";

export class Base extends EventEmitter {
  constructor() { 
    super();
  };

  public ms(ms: number) {
    const apply = ms > 0 ? Math.floor : Math.ceil;
    return {
        days: apply(ms / 86400000),
        hours: apply(ms / 3600000) % 24,
        minutes: apply(ms / 60000) % 60,
        seconds: apply(ms / 1000) % 60,
        milliseconds: apply(ms) % 1000,
        microseconds: apply(ms * 1000) % 1000,
        nanoseconds: apply(ms * 1e6) % 1000
    }  
  }
}