import EmberRouter from '@embroider/router';
import config from 'xvector-ember/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('login');
  this.route('datasets', function () {
    this.route('detail', { path: '/:dataset_id' });
  });
});
