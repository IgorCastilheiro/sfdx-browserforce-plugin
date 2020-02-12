import { BrowserforcePlugin } from '../../plugin';
import * as fs from 'fs';
import Publisher from './publisher';

const PATHS = {
  BASE: '_ui/networks/setup/NetworkSettingsPage'
};
const SELECTORS = {
  BASE: 'div.pbBody',
  ENABLE_CHECKBOX: 'input[id$=":enableNetworkPrefId"]',
  DOMAIN_NAME: 'span.sampleArea',
  DOMAIN_NAME_INPUT_TEXT: 'input[id$=":inputSubdomain"]',
  DOMAIN_AVAILABILITY_BUTTON: 'input[id$=":checkAvailability"]',
  DOMAIN_REGISTRATION_ERROR: 'span.errorMsg',
  SAVE_BUTTON: 'input[id$=":saveId"]'
};

export default class Communities extends BrowserforcePlugin {
  public async retrieve(definition) {
    let response = { ...definition };
    if (definition.enabled) {
      const page = await this.browserforce.openPage(PATHS.BASE, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0']
      });
      const frameOrPage = await this.browserforce.waitForInFrameOrPage(page, SELECTORS.BASE);
      
      const inputEnable = await frameOrPage.$(SELECTORS.ENABLE_CHECKBOX);
      if (inputEnable) {
        response.enabled = await frameOrPage.$eval(SELECTORS.ENABLE_CHECKBOX, (el: HTMLInputElement) => el.checked);
      } else {
        // already enabled
        response.enabled = true;
        await frameOrPage.waitFor(SELECTORS.DOMAIN_NAME);
        var domain = await frameOrPage.$eval(SELECTORS.DOMAIN_NAME, (el: HTMLSpanElement) => el.innerHTML);
        domain = domain.match(/<h4>(.*?)<\/h4>/g)[0].replace('<h4>', '').replace('</h4>', '')
        fs.writeFile('domain.txt', domain, function (err) {
          if (err) throw err;
          console.log('[Communities] domain already registred as ' + domain);
        });
        
      }
      page.close();
    }
    
    if (definition.publisher) {
      const pluginPublisher = new Publisher(this.browserforce, this.org);
      response.publisher = await pluginPublisher.retrieve(definition.publisher);
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
          
          const domainName = (plan.domainName || this.browserforce.getMyDomain() || `comm-${Math.random().toString(36).substr(2)}`).substring(0, 22);
          
          await frameOrPage.waitFor(SELECTORS.DOMAIN_NAME_INPUT_TEXT);
          await frameOrPage.type(SELECTORS.DOMAIN_NAME_INPUT_TEXT, domainName);
          await frameOrPage.click(SELECTORS.DOMAIN_AVAILABILITY_BUTTON);
          
          await new Promise(resolve => {
            setTimeout(async () => {
              var domainTaken = await frameOrPage.$(SELECTORS.DOMAIN_REGISTRATION_ERROR);
              resolve(domainTaken);
            }, 500);
          }).then(async resolvedValue => {
            if (resolvedValue) {
              fs.writeFile('domain.txt', "failed", function (err) {
                if (err) throw err;
              });
              await page.close();
              throw new Error('Domain name registration failed for "' + domainName + '"');
            } else {
              console.log('[DEBUG] domain "' + domainName + '" available');
              page.on('dialog', async dialog => {
                await dialog.accept();
              });
              await frameOrPage.waitFor(SELECTORS.SAVE_BUTTON);
              await Promise.all([
                page.waitForNavigation(),
                frameOrPage.click(SELECTORS.SAVE_BUTTON)
              ]);
              await page.close();
            }
          })
        }
      }
    }
    
    if (plan.publisher) {
      const pluginPublisher = new Publisher(this.browserforce, this.org);
      await pluginPublisher.apply(plan.publisher);
    }
  }
}