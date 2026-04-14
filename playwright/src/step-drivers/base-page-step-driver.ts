import BasePage from '@/page-objects/base-page';
import { Page } from '@playwright/test';

import BaseStepDriver from './base-step-driver';

export default abstract class BasePageStepDriver<
  TPage extends BasePage = BasePage,
> extends BaseStepDriver {
  protected readonly pageObject: TPage;
  constructor(page: Page, pageType?: new (browserPage: Page) => TPage) {
    super(page);
    if (pageType) this.pageObject = new pageType(page);
  }
}
