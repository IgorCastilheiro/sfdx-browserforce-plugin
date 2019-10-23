export default class ConfigParser {
  public static parse(drivers, data) {
    const settings = [];
    if (data && data.settings) {
      for(const setting of data.settings){
        for (const driverName of Object.keys(setting)) {
          if (drivers[driverName]) {
            settings.push({
              Driver: drivers[driverName],
              key: driverName,
              value: setting[driverName]
            });
          }
        }

      }
    }
    return settings;
  }
}
