import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'ui/setup/sfdx/SomaSetupPage'
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
      let response = {
        enabled: false
      };
      const inputEnable = await frameOrPage.$(SELECTORS.ENABLE_SWITCH);
      if (inputEnable) {
        response.enabled = await frameOrPage.$eval(
          SELECTORS.ENABLE_SWITCH,
          (el: HTMLInputElement) => el.checked
          );
        } else {
          // already enabled
          response.enabled = true;
        }
        await page.close();
        return response;
      }
      
      public async apply(plan) {
        if (plan.enabled === false) {
          throw new Error('DevHub once enabled cannot be disabled');
        }
        
        const page = await this.browserforce.openPage(PATHS.BASE, {
          waitUntil: ['load', 'domcontentloaded', 'networkidle0']
        });
        const frameOrPage = await this.browserforce.waitForInFrameOrPage(
          page,
          SELECTORS.ENABLE_SWITCH
          );
          await frameOrPage.click(SELECTORS.ENABLE_SWITCH);
          await page.close();
        }
      }
      