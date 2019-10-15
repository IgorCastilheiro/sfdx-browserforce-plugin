import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'lightning/setup/DevHub/home'
};
const SELECTORS = {
  BASE: 'div.setupcontent',
  ENABLE_SWITCH: '[id^="33:"]'
};

export default class DevHub extends BrowserforcePlugin {
  public async retrieve() {
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    const frameOrPage = await this.browserforce.waitForInFrameOrPage(
      page,
      SELECTORS.BASE
    );
    const response = {};
    const inputEnable = await frameOrPage.$(SELECTORS.ENABLE_SWITCH);
    if (inputEnable) {
      response['enabled'] = await frameOrPage.$eval(
        SELECTORS.ENABLE_SWITCH,
        (el: HTMLInputElement) => el.checked
      );
    } else {
      // already enabled
      response['enabled'] = true;
    }
    return response;
  }

  public async apply(config) {
    if (config.enabled === false) {
      throw new Error('`enabled` cannot be disabled once enabled');
    }

    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    const frameOrPage = await this.browserforce.waitForInFrameOrPage(
      page,
      SELECTORS.ENABLE_SWITCH
    );
    await frameOrPage.click(SELECTORS.ENABLE_SWITCH);
  }
}
