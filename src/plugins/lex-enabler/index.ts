import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: "/",
  CLASSIC_BASE: 'setup/forcecomHomepage.apexp',  
  CLASSIC_ENABLER: "/ltng/switcher?destination=classic",
  LIGHTNING_BASE: "lightning/setup/SetupOneHome/home"
};
const SELECTORS = {
  BASE: 'body',
  PROFILE_THUMBNAIL: ".userProfileCardTriggerRoot",
  LIGHTNING_LINK: ".switch-to-lightning"
};

export default class LexEnabler extends BrowserforcePlugin {
  public async retrieve() {
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    const frameOrPage = await this.browserforce.waitForInFrameOrPage(
      page,
      SELECTORS.BASE
    );
    const response = {};
    const profileThumb = await frameOrPage.$(SELECTORS.PROFILE_THUMBNAIL);
    if (profileThumb) {
      // in lightning experience
      response['enabled'] = true;
    } else {
      // in classic mode
      response['enabled'] = false;
    }
    page.close();
    return response;
  }

  public async apply(config) {

    if (config.enabled === false) {
      await this.browserforce.openPage(PATHS.CLASSIC_ENABLER, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0']
      });
    } else if (config.enabled === true) {
      const page = await this.browserforce.openPage(PATHS.CLASSIC_BASE, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0']
      });
      await page.waitForSelector(SELECTORS.LIGHTNING_LINK);
      await page.click(SELECTORS.LIGHTNING_LINK);
      await page.close();
    }
  }
}
