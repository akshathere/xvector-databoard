// app/templates/login.gjs
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import RouteTemplate from 'ember-route-template';

class AuthScreen extends Component {
  @service api;
  @service router;

  @tracked isRegisterMode = false;
  @tracked email = '';
  @tracked password = '';
  @tracked errorMessage = '';
  @tracked isLoading = false;

  toggleMode = () => {
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMessage = '';
  };

  updateEmail = (event) => {
    this.email = event.target.value;
  };

  updatePassword = (event) => {
    this.password = event.target.value;
  };

  handleSubmit = async (event) => {
    event.preventDefault();
    this.errorMessage = '';
    this.isLoading = true;

    try {
      const endpoint = this.isRegisterMode ? '/auth/register' : '/auth/login';
      const data = await this.api.request(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          email: this.email,
          password: this.password,
        }),
      });

      this.api.setSession(data.access_token, this.email);
      this.router.transitionTo('datasets.index');
    } catch (err) {
      this.errorMessage = err.message;
    } finally {
      this.isLoading = false;
    }
  };

  <template>
    <div class="auth-container">
      <h2>{{if this.isRegisterMode "Create xVector Account" "Sign In to xVector"}}</h2>

      {{#if this.errorMessage}}
        <p class="error-banner">{{this.errorMessage}}</p>
      {{/if}}

      <form {{on "submit" this.handleSubmit}}>
        <label>
          Email
          <input
            type="email"
            value={{this.email}}
            {{on "input" this.updateEmail}}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={{this.password}}
            {{on "input" this.updatePassword}}
            required
          />
        </label>

        <button type="submit" disabled={{this.isLoading}}>
          {{if this.isLoading "Processing..." (if this.isRegisterMode "Register" "Login")}}
        </button>
      </form>

      <button type="button" {{on "click" this.toggleMode}}>
        {{if this.isRegisterMode "Already have an account? Login" "Need an account? Register"}}
      </button>
    </div>
  </template>
}

export default RouteTemplate(AuthScreen);