import { BrowserforcePlugin } from '../../../plugin';
import { Page } from 'puppeteer';
import * as fs from 'fs';

const PATHS = {
  BASE: '_ui/networks/setup/SetupNetworksPage',
};
const SELECTORS = {
  BASE: 'div.pbBody',
  COMMUNITIES_TABLE: 'tr.dataRow',
  COMMUNITY_NAME: 'th.dataCell',
  COMMUNITY_TABLE_CELLS: 'td',
  COMMUNITY_WORKSPACE_LINK: 'a.networkManageLink.zen-mhs.actionLink',
  WORKSPACE_BASE: 'form#editPage.net-form',
  WORKSPACE_ADMIN_LINK: 'a.js-workspace-administration',
  WORKSPACE_STATUS_BUTTON: 'input#statusActionBtn'
};

export default class Publisher extends BrowserforcePlugin {
  public async retrieve(value) {
    let values = JSON.parse(value.communityNameAndStatus);
    
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    const frameOrPage = await this.browserforce.waitForInFrameOrPage(page, SELECTORS.BASE);
    
    await frameOrPage.waitFor(SELECTORS.COMMUNITIES_TABLE);
    const rows = await frameOrPage.$$(SELECTORS.COMMUNITIES_TABLE);
    
    let communityName: String;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const communityTH = await row.$(SELECTORS.COMMUNITY_NAME);
      communityName = await frameOrPage.evaluate(th => th.innerText, communityTH);
      if (communityName == values.communityName) {
        const tds = await row.$$(SELECTORS.COMMUNITY_TABLE_CELLS);
        const communityUrl = await frameOrPage.evaluate(th => th.innerText, tds[2]);
        if (communityUrl) {
          fs.writeFile('communityUrl.txt', communityUrl, function (err) {
            if (err) throw err;
          });
        }
        
        values.status = await frameOrPage.evaluate(td => td.innerText, tds[tds.length - 1]);
      }
    }
    if (!communityName) {
      throw new Error('Community ${value.communityName} not published, please check your deployment');
    }
    
    await page.close();
    const result = {
      communityNameAndStatus: ""
    };
    result.communityNameAndStatus = JSON.stringify(values);
    return result;
  }
  
  public async apply(plan) {
    let values = JSON.parse(plan.communityNameAndStatus);
    
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    const frameOrPage = await this.browserforce.waitForInFrameOrPage(page, SELECTORS.BASE);
    
    await frameOrPage.waitFor(SELECTORS.COMMUNITIES_TABLE);
    const rows = await frameOrPage.$$(SELECTORS.COMMUNITIES_TABLE);
    
    let communityName: String;
    let workspaceLink;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const communityTH = await row.$(SELECTORS.COMMUNITY_NAME);
      communityName = await frameOrPage.evaluate(th => th.innerText, communityTH);
      
      if (communityName == values.communityName) {
        const tds = await row.$$(SELECTORS.COMMUNITY_TABLE_CELLS);
        workspaceLink = await tds[0].$(SELECTORS.COMMUNITY_WORKSPACE_LINK);
        break;
      }
    }
    if (!communityName) {
      throw new Error('Community ${plan.communityName} not published, please check your deployment');
    } else {
      const workspacePromise = new Promise<Page>(x => this.browserforce.browser.once('targetcreated', target => x(target.page())));
      await workspaceLink.click();
      const workspacePage = await workspacePromise;
      await workspacePage.waitFor(SELECTORS.WORKSPACE_ADMIN_LINK);
      await Promise.all([
        (await workspacePage.$(SELECTORS.WORKSPACE_ADMIN_LINK)).click(),
        workspacePage.waitForNavigation(),
      ]);
      
      await workspacePage.waitForSelector("iframe");
      const iframe = await workspacePage.$('iframe');
      const frame = await iframe.contentFrame();
      
      await frame.waitForSelector(SELECTORS.WORKSPACE_BASE);
      await frame.waitForSelector(SELECTORS.WORKSPACE_STATUS_BUTTON);
      
      const statusButton = await frame.$(SELECTORS.WORKSPACE_STATUS_BUTTON);
      workspacePage.on('dialog', async dialog => await dialog.accept());
      await Promise.all([
        frame.waitForNavigation(),
        statusButton.click(),
      ]);
      
      workspacePage.close();
      page.close();
    }
  }
}