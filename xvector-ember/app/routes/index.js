// app/routes/index.js
import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class IndexRoute extends Route {
  @service api;
  async model() {
    const limit = 10;
    const res = await this.api.request('/datasets?limit=${limit}&offset=0');
    const datasets = res.items ?? res;
    return { datasets,
      total: res.total ?? datasets.length,
    };
  }
}