// app/routes/datasets.js
import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class DatasetsRoute extends Route {
  @service api;
  @service router;
//  This hook is the first of the route entry validation hooks called when an attempt is made to transition into a route or one of its children. 
//  It is called before model and afterModel
  beforeModel() {
    if (!this.api.isAuthenticated) {
      this.router.transitionTo('login');
    }
  }
}