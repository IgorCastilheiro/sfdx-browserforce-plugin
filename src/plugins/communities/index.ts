import { BrowserforcePlugin } from '../../plugin';
import * as fs from 'fs';
import Publisher from './publisher';
import { Page } from 'puppeteer';

const PATHS = {
  BASE: '_ui/networks/setup/NetworkSettingsPage'
};
const SELECTORS = {
  BASE: 'div.pbBody',
  ENABLE_CHECKBOX: 'input[id$=":enableNetworkPrefId"]',
  DOMAIN_NAME_INPUT_TEXT: 'input[id$=":inputSubdomain"]',
  DOMAIN_NAME: 'span.sampleArea',
  DOMAIN_AVAILABILITY_BUTTON: 'input[id$=":checkAvailability"]',
  DOMAIN_REGISTRATION_ERROR: 'span.errorMsg',
  DOMAIN_AVAILABLE_MSG: 'span.messageTextStyling',
  SAVE_BUTTON: 'input[id$=":saveId"]'
};

export default class Communities extends BrowserforcePlugin {
  public async retrieve(definition) {
    const response = {};
    if (definition.enabled) {
      const page = await this.browserforce.openPage(PATHS.BASE, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0']
      });
      const frameOrPage = await this.browserforce.waitForInFrameOrPage(page, SELECTORS.BASE);

      const inputEnable = await frameOrPage.$(SELECTORS.ENABLE_CHECKBOX);
      if (inputEnable) {
        response['enabled'] = await frameOrPage.$eval(SELECTORS.ENABLE_CHECKBOX, (el: HTMLInputElement) => el.checked);
      } else {
        // already enabled
        response['enabled'] = true;
        await frameOrPage.waitFor(SELECTORS.DOMAIN_NAME);
        var domain = await frameOrPage.$eval(SELECTORS.DOMAIN_NAME, (el: HTMLSpanElement) => el.innerHTML);
        domain = domain.match(/<h4>(.*?)<\/h4>/g)[0].replace('<h4>', '').replace('</h4>', '')
        fs.writeFile('domain.txt', domain, function (err) {
          if (err) throw err;
          console.log('[Communities] domain registred as ' + domain);
        });
      }
      page.close();
    }

    if (definition.publisher) {
      const pluginPublisher = new Publisher(this.browserforce, this.org);
      response['publisher'] = await pluginPublisher.retrieve(definition.publisher);
    }

    return response;
  }

  public async apply(plan) {
    if (plan.enabled) {
      if (plan.enabled === false) {
        console.log('Communities once enabled cannot be disabled once enabled');
      } else {
        const page = await this.browserforce.openPage(PATHS.BASE, {
          waitUntil: ['load', 'domcontentloaded', 'networkidle0']
        });

        const frameOrPage = await this.browserforce.waitForInFrameOrPage(page, SELECTORS.BASE);

        const inputEnable = await frameOrPage.$(SELECTORS.ENABLE_CHECKBOX);

        if (inputEnable) {
          await frameOrPage.click(SELECTORS.ENABLE_CHECKBOX);
          await frameOrPage.waitForSelector(SELECTORS.DOMAIN_NAME_INPUT_TEXT);
          await frameOrPage.type(SELECTORS.DOMAIN_NAME_INPUT_TEXT, plan.domainName);
          await frameOrPage.click(SELECTORS.DOMAIN_AVAILABILITY_BUTTON);

          const result = await this.raceSelectors(frameOrPage, [
            SELECTORS.DOMAIN_REGISTRATION_ERROR,
            SELECTORS.DOMAIN_AVAILABLE_MSG
          ])

          switch (result) {
            case SELECTORS.DOMAIN_REGISTRATION_ERROR:
              fs.writeFile('domain.txt', "failed", function (err) {
                if (err) throw err;
              });
              await page.close();
              console.log('Domain name registration failed for "' + plan.domainName + '"');
              break;
            case SELECTORS.DOMAIN_AVAILABLE_MSG:
              console.log('[DEBUG] domain "' + plan.domainName + '" available');
              page.on('dialog', async dialog => {
                await dialog.accept();
              });
              await frameOrPage.waitFor(SELECTORS.SAVE_BUTTON);
              await Promise.all([
                page.waitForNavigation(),
                frameOrPage.click(SELECTORS.SAVE_BUTTON)
              ]);
              await page.close();
              break;
          }
        }
      }
    }

    if (plan.publisher) {
      const pluginPublisher = new Publisher(this.browserforce, this.org);
      await pluginPublisher.apply(plan.publisher);
    }
  }

  raceSelectors = (page: Page, selectors: string[]) => {
    return Promise.race(
      selectors.map(selector => {
        return page
          .waitForSelector(selector, {
            visible: true,
          })
          .then(() => selector);
      }),
    );
  };
}